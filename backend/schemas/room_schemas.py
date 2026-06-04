"""
Todos os modelos Pydantic que cruzam a borda da API (request / response).

ReportResponse é o schema da nova rota GET /room/{room_id}/relatorio.
Ele combina os campos que a ReportScreen do front-end já renderiza
(score, tech, comm, soft, feedback — herdados de InterviewHistory) com
campos extras para a transcrição e metadados da sessão.
"""

from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field

# ── Enums ─────────────────────────────────────────────────────────────────────


class Cargo(str, Enum):
    FRONT_END = "Front-end Developer"
    BACK_END = "Back-end Developer"
    FULLSTACK = "Full-stack Developer"
    MOBILE = "Mobile Developer"
    DATA_SCIENTIST = "Data Scientist"


class Senioridade(str, Enum):
    JUNIOR = "Júnior"
    PLENO = "Pleno"
    SENIOR = "Sênior"
    ESPECIALISTA = "Especialista"


class Idioma(str, Enum):
    PORTUGUESE = "pt"
    ENGLISH = "en"


class Persona(str, Enum):
    RIGOROSO = "Rigoroso"
    ACOLHEDOR = "Acolhedor"
    PROVOCADOR = "Provocador"
    COMPORTAMENTAL = "Comportamental"


# ── Request schemas ───────────────────────────────────────────────────────────


class ConfigurarEntrevistaRequest(BaseModel):
    """Corpo do POST /room/setup — espelha o formulário do SetupScreen."""

    role: Cargo
    level: Senioridade
    language: Idioma
    persona: Persona
    company: Optional[str] = Field(None, max_length=50)
    analogy: Optional[str] = Field(None, max_length=100)


# ── Response schemas ──────────────────────────────────────────────────────────


class SetupResponse(BaseModel):
    """Resposta do POST /room/setup."""

    room_id: int
    status: str = "success"
    message: str = "Entrevista criada com sucesso!"
    config: ConfigurarEntrevistaRequest


class FeedbackResponse(BaseModel):
    """
    Resposta do POST /room/{room_id}/encerrar.
    Campos compatíveis com InterviewHistory do front-end (types/interview.ts).
    """

    score: int = Field(ge=0, le=100)
    tech: int = Field(ge=0, le=100)
    comm: int = Field(ge=0, le=100)
    soft: int = Field(ge=0, le=100)
    feedback: str
    status: str = "completed"


class MensagemHistorico(BaseModel):
    """Uma linha da transcrição da entrevista."""

    sender: str  # "user" ou "assistant"
    text: str
    created_at: Optional[str] = None


class ReportResponse(BaseModel):
    """
    Resposta do GET /room/{room_id}/relatorio.

    Inclui tudo que a ReportScreen precisa para substituir o defaultReport
    mockado, mais a transcrição completa para exibição futura.

    O campo `role` e `company` permitem popular o cabeçalho do relatório
    com "Cargo na Empresa" — atualmente exibido como role no HistoryScreen.
    """

    room_id: int
    role: str
    level: str
    persona: str
    company: Optional[str] = None
    language: str
    date: str  # ISO 8601, ex: "2026-05-17T14:30:00"

    # Campos do feedback (None se encerrar ainda não foi chamado)
    score: Optional[int] = None
    tech: Optional[int] = None
    comm: Optional[int] = None
    soft: Optional[int] = None
    feedback: Optional[str] = None

    # Transcrição completa da conversa
    messages: list[MensagemHistorico] = []
