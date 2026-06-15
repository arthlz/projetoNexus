"""
services/ats_service.py
───────────────────────
Lógica de negócio da análise ATS.

Fluxo:
  1. Recebe os bytes do PDF e extrai o texto com pypdf
  2. Monta o prompt para o LLM com o texto + descrição da vaga (opcional)
  3. LLM retorna JSON com score, keywords_found, keywords_missing, feedback
  4. Valida e persiste em ats_analyses no Supabase
  5. Retorna o ATSAnalysisResponse ao caller

"""

from __future__ import annotations

import io
import json
import re
from typing import Optional

from pypdf import PdfReader
from supabase import Client

from backend.core.exceptions import InvalidFeedbackError, LLMError
from backend.schemas.ats_schemas import ATSAnalysisResponse, ATSHistoryResponse
from backend.services.llm_service import LLMService


class ATSService:
    """Encapsula toda a lógica de análise de currículo ATS."""

    def __init__(self, db: Client, llm: LLMService) -> None:
        self.db  = db
        self.llm = llm

    #Análise principal

    async def analisar(
        self,
        pdf_bytes: bytes,
        user_id: str,
        job_description: Optional[str] = None,
    ) -> ATSAnalysisResponse:
        """
        Extrai texto do PDF, envia ao LLM e persiste o resultado.
        Retorna o ATSAnalysisResponse pronto para o front-end.
        """
        texto_curriculo = self._extrair_texto_pdf(pdf_bytes)

        if not texto_curriculo.strip():
            raise ValueError(
                "Não foi possível extrair texto do PDF. "
                "Verifique se o arquivo não é uma imagem escaneada."
            )

        prompt = self._montar_prompt(texto_curriculo, job_description)

        try:
            resposta_texto = await self.llm.chamar_llm(prompt)
        except Exception as exc:
            raise LLMError(f"Falha ao contactar o LLM: {exc}") from exc

        dados = self._parsear_resposta(resposta_texto)
        return self._persistir(dados, user_id, job_description)

    # Histórico

    def historico(
        self,
        user_id: str,
        limit: int = 10,
        offset: int = 0,
    ) -> ATSHistoryResponse:
        """
        Retorna as análises anteriores do usuário, ordenadas da mais recente.
        Paginação simples via limit/offset.
        """
        result = (
            self.db.table("ats_analyses")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )

        # Total sem paginação (para o front-end saber se há mais páginas)
        count_result = (
            self.db.table("ats_analyses")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .execute()
        )
        total = count_result.count or 0

        analyses = [self._row_to_response(row) for row in (result.data or [])]
        return ATSHistoryResponse(analyses=analyses, total=total)

    #Helpers privados

    def _extrair_texto_pdf(self, pdf_bytes: bytes) -> str:
        """
        Extrai todo o texto do PDF usando pypdf.
        Concatena o texto de todas as páginas com quebra de linha entre elas.
        """
        reader = PdfReader(io.BytesIO(pdf_bytes))
        paginas = []
        for page in reader.pages:
            texto = page.extract_text()
            if texto:
                paginas.append(texto.strip())
        return "\n\n".join(paginas)

    def _montar_prompt(
        self,
        texto_curriculo: str,
        job_description: Optional[str],
    ) -> list[dict]:
        """
        Monta o histórico de mensagens para o LLM.
        O system prompt define o papel de avaliador ATS.
        A mensagem de user contém o currículo e, opcionalmente, a vaga.
        """
        system = """Você é um especialista em recrutamento técnico e sistemas ATS
(Applicant Tracking System). Sua tarefa é analisar currículos de desenvolvedores
de software com precisão e objetividade.

Ao receber um currículo, você deve:
1. Avaliar a compatibilidade geral (score de 0 a 100)
2. Identificar keywords técnicas presentes e ausentes
3. Fornecer feedback construtivo e acionável

Retorne APENAS um JSON válido, sem texto adicional, sem markdown:
{
    "score": <0-100>,
    "keywords_found": ["keyword1", "keyword2", ...],
    "keywords_missing": ["keyword1", "keyword2", ...],
    "feedback": "<parágrafo de feedback construtivo>"
}

CRITÉRIOS DO SCORE:
- 90-100: Currículo excelente, pronto para qualquer processo seletivo
- 70-89:  Bom, com ajustes pontuais pode ser top candidato
- 50-69:  Razoável, precisa de melhorias estruturais importantes
- 0-49:   Fraco, requer reformulação significativa

KEYWORDS: Liste apenas termos técnicos relevantes (linguagens, frameworks,
ferramentas, metodologias). Máximo de 15 por lista.

FEEDBACK: Um parágrafo direto ao candidato (segunda pessoa), com o principal
ponto forte e uma sugestão concreta e acionável de melhoria."""

        if job_description:
            user_content = f"""DESCRIÇÃO DA VAGA:
{job_description.strip()}

─────────────────────────────────────────────

CURRÍCULO DO CANDIDATO:
{texto_curriculo}

─────────────────────────────────────────────

Avalie a compatibilidade do currículo com a vaga acima. As keywords_missing
devem ser termos importantes na vaga que estão ausentes no currículo.
As keywords_found devem ser termos da vaga que estão presentes no currículo."""
        else:
            user_content = f"""CURRÍCULO DO CANDIDATO:
{texto_curriculo}

─────────────────────────────────────────────

Avalie o currículo de forma geral, sem uma vaga específica. As keywords_found
devem ser os pontos técnicos fortes do candidato. As keywords_missing devem
ser tecnologias ou competências relevantes para um desenvolvedor que estão
ausentes ou pouco evidenciadas."""

        return [
            {"role": "system",  "content": system},
            {"role": "user",    "content": user_content},
        ]

    def _parsear_resposta(self, texto: str) -> dict:
        """
        Extrai o JSON da resposta do LLM.
        Mesmo tratamento robusto usado no feedback de entrevistas.
        """
        match = re.search(r"\{.*\}", texto, re.DOTALL)
        if not match:
            raise InvalidFeedbackError(
                f"Nenhum JSON encontrado na resposta do LLM. "
                f"Trecho: {texto[:300]}"
            )
        try:
            dados = json.loads(match.group())
            # Validação mínima dos campos obrigatórios
            for campo in ("score", "keywords_found", "keywords_missing", "feedback"):
                if campo not in dados:
                    raise ValueError(f"Campo obrigatório ausente: {campo}")
            return dados
        except (json.JSONDecodeError, ValueError) as exc:
            raise InvalidFeedbackError(f"JSON de análise ATS inválido: {exc}") from exc

    def _persistir(
        self,
        dados: dict,
        user_id: str,
        job_description: Optional[str],
    ) -> ATSAnalysisResponse:
        """Grava a análise no Supabase e retorna o response com o ID gerado."""
        result = (
            self.db.table("ats_analyses")
            .insert({
                "user_id":          user_id,
                "score":            int(dados["score"]),
                "keywords_found":   dados["keywords_found"],
                "keywords_missing": dados["keywords_missing"],
                "feedback":         dados["feedback"],
                "job_description":  job_description,
            })
            .execute()
        )
        row = result.data[0]
        return self._row_to_response(row)

    def _row_to_response(self, row: dict) -> ATSAnalysisResponse:
        """Converte uma linha do banco em ATSAnalysisResponse."""
        return ATSAnalysisResponse(
            id=row["id"],
            score=row["score"],
            keywords_found=row.get("keywords_found") or [],
            keywords_missing=row.get("keywords_missing") or [],
            feedback=row["feedback"],
            job_description=row.get("job_description"),
            created_at=str(row.get("created_at", "")),
        )