"""
Lógica de negócio das salas de entrevista.

Responsabilidades:
  - criar_sala        → INSERT em interviews + lookup de persona
  - verificar_ownership → SELECT + checagem de user_id
  - salvar_mensagem   → INSERT incremental em interview_messages
  - carregar_historico → SELECT ordenado de interview_messages
  - encerrar_sala     → LLM feedback + INSERT em feedback + UPDATE final_score
  - obter_relatorio   → SELECT de tudo para a ReportScreen
"""

from __future__ import annotations

import json
import re
from typing import Optional

from supabase import Client

from backend.core.exceptions import (
    ForbiddenError,
    InvalidFeedbackError,
    LLMError,
    RoomNotFoundError,
)
from backend.schemas.room_schemas import (
    ConfigurarEntrevistaRequest,
    FeedbackResponse,
    MensagemHistorico,
    ReportResponse,
)
from backend.services.llm_service import LLMService


class RoomService:
    """Encapsula toda a lógica de negócio das salas."""

    def __init__(self, db: Client, llm: LLMService) -> None:
        self.db = db
        self.llm = llm

    # ── Criação ───────────────────────────────────────────────────────────────

    async def criar_sala(
        self, config: ConfigurarEntrevistaRequest, user_id: str
    ) -> int:
        """
        Cria um registro em `interviews` e retorna o ID gerado.

        Faz lookup da persona por nome para manter a integridade referencial
        com a tabela interviewer_personas. Se a persona não existir no banco,
        lança ValueError com mensagem clara.

        A configuração completa é salva em extra_config (JSONB) para que o
        WebSocket possa reconstituir o contexto sem JOINs adicionais.
        """
        persona_result = (
            self.db.table("interviewer_personas")
            .select("id")
            .eq("name", config.persona.value)
            .single()
            .execute()
        )
        if not persona_result.data:
            raise ValueError(
                f"Persona '{config.persona.value}' não encontrada no banco. "
                "Execute a migration de seed de personas."
            )
        persona_id = persona_result.data["id"]

        result = (
            self.db.table("interviews")
            .insert(
                {
                    "user_id": user_id,
                    "interviewer_persona_id": persona_id,
                    "interview_type": config.role.value,
                    "difficulty_level": config.level.value,
                    "extra_config": config.model_dump(mode="json"),
                }
            )
            .execute()
        )
        return result.data[0]["id"]

    # ── Ownership ─────────────────────────────────────────────────────────────

    def verificar_ownership(self, room_id: int, user_id: str) -> dict:
        """
        Verifica se a sala existe e pertence ao usuário.

        No modo dev (user_id == "dev-user-placeholder"), pula a checagem
        de ownership para não bloquear o desenvolvimento — apenas confirma
        que a sala existe.

        Retorna o registro completo da entrevista para uso pelo caller.
        """
        result = (
            self.db.table("interviews").select("*").eq("id", room_id).single().execute()
        )
        if not result.data:
            raise RoomNotFoundError(f"Sala {room_id} não encontrada.")

        interview = result.data

        # Pula checagem de owner no modo dev
        if user_id != "dev-user-placeholder":
            if str(interview.get("user_id", "")) != str(user_id):
                raise ForbiddenError("Você não tem permissão sobre esta sala.")

        return interview

    # ── Mensagens ─────────────────────────────────────────────────────────────

    def salvar_mensagem(self, room_id: int, sender: str, text: str) -> None:
        """
        Persiste uma mensagem em interview_messages.
        Salvo incrementalmente (não em batch) para sobreviver a quedas de
        conexão — o histórico parcial fica disponível para /encerrar.
        """
        self.db.table("interview_messages").insert(
            {
                "interview_id": room_id,
                "sender": sender,
                "message_text": text,
            }
        ).execute()

    def carregar_historico(self, room_id: int) -> list[dict]:
        """
        Retorna as mensagens ordenadas por data no formato
        {role, content} para uso direto como histórico do LLM.
        """
        result = (
            self.db.table("interview_messages")
            .select("sender, message_text")
            .eq("interview_id", room_id)
            .order("created_at")
            .execute()
        )
        return [
            {"role": row["sender"], "content": row["message_text"]}
            for row in (result.data or [])
        ]

    # ── Encerramento ──────────────────────────────────────────────────────────

    async def encerrar_sala(self, room_id: int, user_id: str) -> FeedbackResponse:
        """
        Orquestra o encerramento:
          1. Verifica ownership
          2. Carrega histórico do banco
          3. Envia ao LLM para gerar feedback
          4. Parseia o JSON de resposta
          5. Persiste em feedback + atualiza final_score em interviews

        A sala NÃO é deletada — o histórico fica disponível para
        GET /relatorio e análise futura de progresso do usuário.
        HTTP 500 sem encerrar = front-end pode tentar novamente.
        """
        self.verificar_ownership(room_id, user_id)
        historico = self.carregar_historico(room_id)

        if not historico:
            raise InvalidFeedbackError(
                "Histórico vazio — não é possível gerar feedback sem mensagens."
            )

        prompt_final = self.llm.montar_prompt_feedback(historico)

        try:
            resposta_texto = await self.llm.chamar_llm(prompt_final)
        except Exception as exc:
            raise LLMError(f"Falha ao contactar o LLM: {exc}") from exc

        feedback = self._parsear_feedback(resposta_texto)
        self._persistir_feedback(room_id, feedback)
        return feedback

    # ── Relatório ─────────────────────────────────────────────────────────────

    def obter_relatorio(self, room_id: int, user_id: str) -> ReportResponse:
        """
        Retorna o relatório completo para a ReportScreen do front-end.
        Combina metadados da entrevista, feedback e histórico de mensagens.
        """
        interview = self.verificar_ownership(room_id, user_id)
        config_extra = interview.get("extra_config", {})

        # Tenta buscar o feedback persistido
        fb_result = (
            self.db.table("feedback")
            .select("*")
            .eq("interview_id", room_id)
            .order("id", desc=True)
            .limit(1)
            .execute()
        )
        fb = fb_result.data[0] if fb_result.data else None

        # Busca o histórico de mensagens
        msgs_result = (
            self.db.table("interview_messages")
            .select("sender, message_text, created_at")
            .eq("interview_id", room_id)
            .order("created_at")
            .execute()
        )
        mensagens = [
            MensagemHistorico(
                sender=row["sender"],
                text=row["message_text"],
                created_at=str(row.get("created_at", "")),
            )
            for row in (msgs_result.data or [])
        ]

        return ReportResponse(
            room_id=room_id,
            role=config_extra.get("role", interview.get("interview_type", "")),
            level=config_extra.get("level", interview.get("difficulty_level", "")),
            persona=config_extra.get("persona", ""),
            company=config_extra.get("company"),
            language=config_extra.get("language", "pt"),
            date=str(interview.get("created_at", "")),
            score=int(fb["vocabulary_score"]) if fb else None,
            tech=int(fb["technical_score"]) if fb else None,
            comm=int(fb["clarity_score"]) if fb else None,
            soft=int(fb["logic_score"]) if fb else None,
            feedback=fb["ai_feedback_text"] if fb else None,
            messages=mensagens,
        )

    # ── Helpers privados ──────────────────────────────────────────────────────

    def _parsear_feedback(self, texto: str) -> FeedbackResponse:
        """
        Extrai o JSON de feedback da resposta do LLM.
        Modelos de raciocínio estendido costumam embrulhar o JSON em texto
        explicativo ou blocos ```json``` — o regex lida com isso.
        """
        match = re.search(r"\{.*\}", texto, re.DOTALL)
        if not match:
            raise InvalidFeedbackError(
                f"Nenhum JSON encontrado na resposta do LLM. "
                f"Trecho recebido: {texto[:300]}"
            )
        try:
            dados = json.loads(match.group())
            return FeedbackResponse(**dados)
        except (json.JSONDecodeError, ValueError) as exc:
            raise InvalidFeedbackError(f"JSON de feedback inválido: {exc}") from exc

    def _persistir_feedback(self, room_id: int, feedback: FeedbackResponse) -> None:
        """
        Grava o feedback na tabela `feedback` e atualiza final_score em
        `interviews`.

        Mapeamento de colunas (tabela feedback existente → campo do Nexus):
          technical_score  → tech   (competência técnica)
          clarity_score    → comm   (comunicação / clareza)
          logic_score      → soft   (soft skills / raciocínio)
          vocabulary_score → score  (nota geral — reaproveitando coluna)
          ai_feedback_text → feedback (parágrafo descritivo)

        Requer a migration 001 que adiciona interview_id à tabela feedback
        e torna answer_id nullable.
        """
        self.db.table("feedback").insert(
            {
                "interview_id": room_id,
                "technical_score": feedback.tech,
                "clarity_score": feedback.comm,
                "logic_score": feedback.soft,
                "vocabulary_score": feedback.score,
                "ai_feedback_text": feedback.feedback,
            }
        ).execute()

        self.db.table("interviews").update({"final_score": feedback.score}).eq(
            "id", room_id
        ).execute()
