"""
Modelos Pydantic para a feature de análise ATS.

O campo job_description é Optional porque a análise pode ser feita
sem vaga — nesse caso o LLM avalia o currículo de forma geral,
verificando clareza, estrutura e pontos fortes/fracos independentes
de uma posição específica.
"""

from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, Field


class ATSAnalysisResponse(BaseModel):
    """
    Resposta da POST /ats/analyze e de cada item do GET /ats/history.
      score         → ScoreGauge
      keywords_found   → tags verdes ("Presentes")
      keywords_missing → tags amarelas ("Ausentes")
      feedback      → parágrafo descritivo
    """
    id:               int
    score:            int  = Field(ge=0, le=100)
    keywords_found:   list[str] = []
    keywords_missing: list[str] = []
    feedback:         str
    job_description:  Optional[str] = None
    created_at:       Optional[str] = None


class ATSHistoryResponse(BaseModel):
    """Lista paginada de análises anteriores do usuário."""
    analyses: list[ATSAnalysisResponse]
    total:    int