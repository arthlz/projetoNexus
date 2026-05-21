"""
routes/room_routes.py
─────────────────────
Rotas da API do domínio "room".

SOBRE AUTENTICAÇÃO NESTA VERSÃO
  O front-end atual (SetupScreen, CallScreen) ainda não envia header
  Authorization nem o query param ?token= no WebSocket — o fluxo de login
  existe mas o token não é repassado às chamadas de API.

  Para não bloquear o desenvolvimento, as rotas usam get_optional_user /
  get_optional_ws_user, que aceitam o token se vier mas usam um ID de dev
  como fallback caso contrário.

  Para ativar autenticação obrigatória quando o front-end estiver pronto:
    1. Substituir get_optional_user    → get_current_user  nas rotas HTTP.
    2. Substituir get_optional_ws_user → get_ws_user       no WebSocket.
  O middleware/auth.py já está completo e funcional para isso.

PROTOCOLO WEBSOCKET (entrevista 100% por voz)
  ← front-end envia frames PCM 16-bit de 960 bytes continuamente
  → back-end envia bytes MP3 (Deepgram TTS) quando a IA responde
  → back-end envia {"type": "transcript", "text": "..."} (eco textual)
  → back-end envia {"type": "done"} para liberar o microfone do candidato
  → back-end envia {"type": "error", "text": "..."} em falha não-fatal

  O front-end (useVoiceCall.ts) já trata mensagens binárias como áudio:
    wsRef.current.onmessage = async (event) => {
      if (typeof event.data === "string") { /* JSON de controle */ }
      else { /* bytes → Blob MP3 → Audio API → play() */ }
    }
"""

import asyncio
from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    WebSocket,
    WebSocketDisconnect,
    status,
)

from backend.core.config import get_settings
from backend.core.database import get_db
from backend.core.exceptions import (
    ForbiddenError,
    InvalidFeedbackError,
    LLMError,
    RoomNotFoundError,
    UnauthorizedError,
)
from backend.middleware.auth import get_ws_user
from backend.schemas.room_schemas import (
    ConfigurarEntrevistaRequest,
    FeedbackResponse,
    ReportResponse,
    SetupResponse,
)
from backend.services.llm_service import LLMService
from backend.services.room_service import RoomService
from backend.services import voice_pipeline

room_router = APIRouter(prefix="/room", tags=["room"])


# ── Auth com fallback (remover quando front-end enviar tokens) ────────────────

async def get_optional_user() -> str:
    """
    Retorna ID de dev. Substituir por get_current_user quando o front-end
    passar o header Authorization: Bearer <supabase_token>.
    """
    return "dev-user-placeholder"


async def get_optional_ws_user(
    token: str | None = Query(default=None),
) -> str:
    """
    Tenta validar o JWT do query param ?token=.
    Fallback para ID de dev se ausente.
    Substituir por get_ws_user quando o front-end passar ?token=<jwt>.
    """
    if token:
        try:
            return await get_ws_user(token)
        except (UnauthorizedError, Exception):
            pass
    return "dev-user-placeholder"


# ── Fábrica do serviço ────────────────────────────────────────────────────────

def get_room_service() -> RoomService:
    return RoomService(db=get_db(), llm=LLMService())


# ── POST /room/setup ──────────────────────────────────────────────────────────

@room_router.post("/setup", response_model=SetupResponse, status_code=status.HTTP_201_CREATED)
async def configurar_sala(
    dados: ConfigurarEntrevistaRequest,
    user_id: Annotated[str, Depends(get_optional_user)],
    service: Annotated[RoomService, Depends(get_room_service)],
):
    """
    Cria uma nova sessão de entrevista no Supabase e retorna o room_id.
    O front-end (SetupScreen) armazena o room_id e o passa para o WebSocket.
    """
    try:
        room_id = await service.criar_sala(config=dados, user_id=user_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        )
    return SetupResponse(room_id=room_id, config=dados)


# ── WS /room/{room_id}/entrevista ─────────────────────────────────────────────

@room_router.websocket("/{room_id}/entrevista")
async def iniciar_entrevista(
    ws: WebSocket,
    room_id: int,
    user_id: Annotated[str, Depends(get_optional_ws_user)],
    service: Annotated[RoomService, Depends(get_room_service)],
):
    """
    WebSocket da entrevista 100% por voz.

    Ciclo por turno:
      1. Front-end envia frames PCM de 960 bytes continuamente
      2. VAD acumula e detecta fim de fala (~1s de silêncio)
      3. Deepgram STT transcreve para texto
      4. LLM (OpenRouter/Trinity) gera resposta do entrevistador
      5. Deepgram TTS sintetiza a resposta em MP3
      6. Back-end envia os bytes MP3 via ws.send_bytes()
      7. Back-end envia {"type": "done"} — front-end reativa o microfone

    Códigos WS de fechamento:
      4001 não autenticado | 4003 acesso proibido | 4004 sala não encontrada
    """
    settings = get_settings()

    try:
        interview = service.verificar_ownership(room_id, user_id)
    except RoomNotFoundError:
        await ws.close(code=4004)
        return
    except ForbiddenError:
        await ws.close(code=4003)
        return
    except UnauthorizedError:
        await ws.close(code=4001)
        return

    await ws.accept()

    config_extra = interview.get("extra_config", {})
    idioma_codigo = config_extra.get("language", "pt")

    # Monta o system prompt; histórico em memória para contexto do LLM.
    # Persistência durável: salvar_mensagem() a cada turno.
    historico_sessao = service.llm.montar_prompt_sistema(
        cargo=config_extra.get("role", ""),
        senioridade=config_extra.get("level", ""),
        idioma_codigo=idioma_codigo,
        persona_nome=config_extra.get("persona", "Acolhedor"),
        empresa=config_extra.get("company"),
        analogia=config_extra.get("analogy"),
    )

    # ── IA abre a entrevista com a primeira pergunta ───────────────────────
    try:
        abertura_texto = await service.llm.chamar_llm(historico_sessao)
        historico_sessao.append({"role": "assistant", "content": abertura_texto})
        service.salvar_mensagem(room_id, "assistant", abertura_texto)

        audio_abertura = await asyncio.to_thread(
            voice_pipeline.sintetizar_fala, abertura_texto, idioma_codigo
        )
        if audio_abertura:
            await ws.send_bytes(audio_abertura)

    except LLMError as exc:
        await ws.send_json({"type": "error", "text": str(exc)})

    await ws.send_json({"type": "done"})

    # ── Loop principal de áudio ────────────────────────────────────────────
    detector_vad = voice_pipeline.VADDetector()

    try:
        while True:
            try:
                frame = await asyncio.wait_for(
                    ws.receive_bytes(),
                    timeout=settings.ws_receive_timeout,
                )
            except asyncio.TimeoutError:
                print(f"⏱️  Timeout na sala {room_id} — encerrando loop.")
                break

            frames_prontos = detector_vad.process_frame(frame)
            if not frames_prontos:
                continue

            # STT em thread separada (SDK Deepgram é bloqueante)
            texto_usuario = await asyncio.to_thread(
                voice_pipeline.transcrever_audio, frames_prontos, idioma_codigo
            )

            if not texto_usuario:
                await ws.send_json({"type": "done"})
                continue

            # Eco textual — útil para debug e exibição opcional na UI
            await ws.send_json({"type": "transcript", "text": texto_usuario})

            service.salvar_mensagem(room_id, "user", texto_usuario)
            historico_sessao.append({"role": "user", "content": texto_usuario})

            try:
                resposta_texto = await service.llm.chamar_llm(historico_sessao)
                historico_sessao.append({"role": "assistant", "content": resposta_texto})
                service.salvar_mensagem(room_id, "assistant", resposta_texto)

                # TTS em thread separada (HTTP síncrono para Deepgram)
                audio_resposta = await asyncio.to_thread(
                    voice_pipeline.sintetizar_fala, resposta_texto, idioma_codigo
                )
                if audio_resposta:
                    await ws.send_bytes(audio_resposta)

            except LLMError as exc:
                await ws.send_json({"type": "error", "text": str(exc)})

            await ws.send_json({"type": "done"})

    except WebSocketDisconnect:
        print(f"🔌 Cliente desconectado da sala {room_id}.")


# ── POST /room/{room_id}/encerrar ─────────────────────────────────────────────

@room_router.post("/{room_id}/encerrar", response_model=FeedbackResponse)
async def encerrar_entrevista(
    room_id: int,
    user_id: Annotated[str, Depends(get_optional_user)],
    service: Annotated[RoomService, Depends(get_room_service)],
):
    """
    Encerra a entrevista, gera feedback via LLM e persiste no Supabase.
    HTTP 500 sem marcar encerrada → front-end pode tentar novamente.
    """
    try:
        return await service.encerrar_sala(room_id=room_id, user_id=user_id)
    except RoomNotFoundError:
        raise HTTPException(status_code=404, detail="Sala não encontrada.")
    except ForbiddenError:
        raise HTTPException(status_code=403, detail="Acesso negado.")
    except (LLMError, InvalidFeedbackError) as exc:
        raise HTTPException(status_code=500, detail=f"Erro na avaliação: {exc}")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erro inesperado: {exc}")


# ── GET /room/{room_id}/relatorio ─────────────────────────────────────────────

@room_router.get("/{room_id}/relatorio", response_model=ReportResponse)
async def obter_relatorio(
    room_id: int,
    user_id: Annotated[str, Depends(get_optional_user)],
    service: Annotated[RoomService, Depends(get_room_service)],
):
    """
    Retorna o relatório completo para a ReportScreen.

    Contém:
      - Metadados: cargo, nível, persona, data
      - Feedback estruturado: score, tech, comm, soft, texto
      - Histórico: transcrição completa da conversa

    O front-end usa esses dados em vez do defaultReport mockado.
    """
    try:
        return service.obter_relatorio(room_id=room_id, user_id=user_id)
    except RoomNotFoundError:
        raise HTTPException(status_code=404, detail="Sala não encontrada.")
    except ForbiddenError:
        raise HTTPException(status_code=403, detail="Acesso negado.")