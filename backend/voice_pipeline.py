"""
Pipeline de voz pro Nexus

Fluxo:
  1. WebSocket recebe chunks de áudio PCM 16-bit, 16kHz, mono
  2. VAD (webrtcvad) detecta fim de fala e dispara a transcrição
  3. Whisper small (pré-carregado) transcreve em ~0.3s
  4. LLM gera resposta em streaming
  5. TTS (OpenAI ou gTTS) converte os primeiros tokens já disponíveis
  6. WebSocket envia chunks de áudio de volta ao cliente

Instalar dependências:
  pip install faster-whisper webrtcvad openai python-dotenv

Para rodar junto ao FastAPI:
  No main.py, adicione:  app.include_router(voice_router)
"""

import asyncio, os, struct, io, wave
import webrtcvad
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from faster_whisper import WhisperModel
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()

# ── Configurações ──────────────────────────────────────────────────────────────

SAMPLE_RATE    = 16000   # Hz — obrigatório para Whisper e WebRTC VAD
FRAME_MS       = 30      # ms por frame (10, 20 ou 30 — limite do webrtcvad)
FRAME_BYTES    = int(SAMPLE_RATE * FRAME_MS / 1000) * 2  # 16-bit = 2 bytes/sample
VAD_AGGRESSIVENESS = 2   # 0 (permissivo) a 3 (restrito)
SILENCE_FRAMES = 20      # frames silenciosos consecutivos antes de transcrever (~600ms)

# ── Modelos (singleton — carregados uma vez na inicialização) ─────────────────

_whisper: WhisperModel | None = None
_vad: webrtcvad.Vad | None = None

def get_whisper() -> WhisperModel:
    global _whisper
    if _whisper is None:
       
        # *Trocar por "medium" se precisar de mais acurácia (~0.7s)
        _whisper = WhisperModel("small", device="cpu", compute_type="int8")
    return _whisper

def get_vad() -> webrtcvad.Vad:
    global _vad
    if _vad is None:
        _vad = webrtcvad.Vad(VAD_AGGRESSIVENESS)
    return _vad

# ── Funções auxiliares ────────────────────────────────────────────────────────

def frames_to_wav(frames: list[bytes]) -> bytes:
    """Converte lista de frames PCM para bytes WAV em memória."""
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)   # 16-bit
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(b"".join(frames))
    return buf.getvalue()

def transcrever(frames: list[bytes], language: str = "pt") -> str:
    """Transcreve áudio PCM usando Whisper small. Retorna texto ou string vazia."""
    wav_bytes = frames_to_wav(frames)
    audio_buf = io.BytesIO(wav_bytes)
    segments, _ = get_whisper().transcribe(audio_buf, language=language)
    return " ".join(s.text.strip() for s in segments).strip()

async def gerar_resposta_streaming(historico: list[dict]) -> asyncio.Queue:
    """Chama o LLM em streaming e empurra tokens em uma fila."""
    client = AsyncOpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=os.getenv("OPENROUTER_API_KEY"),
    )
    queue: asyncio.Queue[str | None] = asyncio.Queue()

    async def _stream():
        async with client.chat.completions.stream(
            model="arcee-ai/trinity-large-preview:free",
            messages=historico,
        ) as stream:
            async for chunk in stream:
                token = chunk.choices[0].delta.content or ""
                if token:
                    await queue.put(token)
        await queue.put(None)   # sentinela de fim

    asyncio.create_task(_stream())
    return queue

async def sintetizar_streaming(text_queue: asyncio.Queue, ws: WebSocket):
    """
    Consome tokens da fila e envia áudio TTS em chunks via WebSocket.

    Estratégia: acumula tokens até ter uma sentença (., !, ?) ou
    atingir ~80 chars, então chama o TTS e envia o áudio.
    Isso garante que o primeiro chunk de áudio chegue em < 1s.
    """
    client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))  # TTS via OpenAI
    buffer = ""

    async def _falar(texto: str):
        if not texto.strip():
            return
        async with client.audio.speech.with_streaming_response.create(
            model="tts-1",       # "tts-1" = menor latência; "tts-1-hd" = maior qualidade
            voice="nova",
            input=texto,
            response_format="opus",  # Opus = menor tamanho, ideal para streaming
        ) as resp:
            async for chunk in resp.iter_bytes(chunk_size=4096):
                await ws.send_bytes(chunk)

    while True:
        token = await text_queue.get()
        if token is None:
            await _falar(buffer)  # flush do restante
            break

        buffer += token
        # Envia a cada sentença completa ou a cada ~80 chars acumulados
        if buffer[-1] in ".!?\n" or len(buffer) >= 80:
            await _falar(buffer)
            buffer = ""

# ── Rota WebSocket ─────────────────────────────────────────────────────────────

voice_router = APIRouter(prefix="/voice", tags=["voice"])

@voice_router.websocket("/{room_id}")
async def voz_endpoint(ws: WebSocket, room_id: str, lang: str = "pt"):
    """
    Protocolo WebSocket:
      Cliente → servidor : bytes  (frames PCM 16-bit, 16kHz, 30ms cada)
      Servidor → cliente : bytes  (chunks de áudio Opus com resposta da IA)
      Servidor → cliente : {"type": "transcript", "text": "..."}  (JSON)
      Servidor → cliente : {"type": "done"}
    """
    await ws.accept()
    vad = get_vad()

    speech_frames: list[bytes] = []
    silence_count = 0
    speaking = False

    try:
        while True:
            frame = await ws.receive_bytes()

            # Valida tamanho do frame (webrtcvad é rígido quanto a isso)
            if len(frame) != FRAME_BYTES:
                continue

            is_speech = vad.is_speech(frame, SAMPLE_RATE)

            if is_speech:
                speech_frames.append(frame)
                silence_count = 0
                speaking = True
            elif speaking:
                speech_frames.append(frame)  # inclui silêncio pós-fala
                silence_count += 1

                if silence_count >= SILENCE_FRAMES:
                    # ── Usuário parou de falar → transcreve ──────────────────
                    texto = await asyncio.to_thread(transcrever, speech_frames, lang)
                    speech_frames.clear()
                    silence_count = 0
                    speaking = False

                    if not texto:
                        continue

                    await ws.send_json({"type": "transcript", "text": texto})

                    # ── Busca histórico da sala (adaptar ao db_temp existente) ─
                    # Exemplo mínimo — integre com room_routes.db_temp se necessário
                    historico = [{"role": "user", "content": texto}]

                    # ── Gera resposta + TTS em paralelo ─────────────────────
                    text_queue = await gerar_resposta_streaming(historico)
                    await sintetizar_streaming(text_queue, ws)
                    await ws.send_json({"type": "done"})

    except WebSocketDisconnect:
        pass