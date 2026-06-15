"""

POST /ats/analyze
  Recebe o PDF via multipart/form-data (campo "resume") e opcionalmente
  a descrição da vaga (campo "job_description" como form field de texto).
  Retorna ATSAnalysisResponse com score, keywords e feedback.

GET /ats/history
  Retorna as análises anteriores do usuário paginadas.
  Query params: limit (default 10), offset (default 0).

Limite de tamanho do PDF:
  FastAPI não tem limite por padrão. Adicionamos uma verificação manual
  de 5 MB — suficiente para qualquer currículo bem formatado.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status

from backend.core.database import get_db
from backend.core.exceptions import InvalidFeedbackError, LLMError
from backend.middleware.auth import get_current_user
from backend.schemas.ats_schemas import ATSAnalysisResponse, ATSHistoryResponse
from backend.services.ats_service import ATSService
from backend.services.llm_service import LLMService

ats_router = APIRouter(prefix="/ats", tags=["ats"])

MAX_PDF_BYTES = 5 * 1024 * 1024  # 5 MB


def get_ats_service() -> ATSService:
    return ATSService(db=get_db(), llm=LLMService())


#POST /ats/analyze

@ats_router.post(
    "/analyze",
    response_model=ATSAnalysisResponse,
    status_code=status.HTTP_201_CREATED,
)
async def analisar_curriculo(
    resume: Annotated[UploadFile, File(description="Currículo em PDF")],
    job_description: Annotated[
        str | None,
        Form(description="Descrição da vaga (opcional)"),
    ] = None,
    user_id: Annotated[str, Depends(get_current_user)] = "dev-user-placeholder",
    service: Annotated[ATSService, Depends(get_ats_service)] = None,
):
    """
    Analisa o currículo PDF com ou sem descrição de vaga.

    - **resume**: arquivo PDF (max 5 MB)
    - **job_description**: texto da vaga (opcional). Se fornecido, a análise
      compara o currículo com a vaga. Se omitido, avalia o currículo de forma geral.
    """
    # Valida tipo do arquivo
    if resume.content_type not in ("application/pdf", "application/octet-stream"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="O arquivo deve ser um PDF.",
        )

    pdf_bytes = await resume.read()

    # Valida tamanho
    if len(pdf_bytes) > MAX_PDF_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"PDF muito grande. Máximo permitido: {MAX_PDF_BYTES // (1024*1024)} MB.",
        )

    # job_description vazia = None se nn tiver descrição da vaga
    jd = job_description.strip() if job_description and job_description.strip() else None

    try:
        return await service.analisar(
            pdf_bytes=pdf_bytes,
            user_id=user_id,
            job_description=jd,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        )
    except (LLMError, InvalidFeedbackError) as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro inesperado: {exc}",
        )


#GET /ats/history

@ats_router.get("/history", response_model=ATSHistoryResponse)
def historico_analises(
    limit:   int = Query(default=10, ge=1, le=50),
    offset:  int = Query(default=0,  ge=0),
    user_id: Annotated[str, Depends(get_current_user)] = "dev-user-placeholder",
    service: Annotated[ATSService, Depends(get_ats_service)] = None,
):
    """
    Retorna as análises ATS anteriores do usuário, da mais recente para a mais antiga.
    Útil para popular um histórico de análises na interface.
    """
    return service.historico(user_id=user_id, limit=limit, offset=offset)