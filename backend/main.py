"""
Ponto de entrada da aplicação FastAPI.

Responsabilidades:
  1. Criar e configurar o app FastAPI.
  2. Registrar middleware (CORS com origens dinâmicas do .env).
  3. Registrar handlers globais de exceção — converte as exceções de domínio
     (NexusBaseError e subclasses) em respostas HTTP apropriadas.
  4. Incluir os roteadores de cada domínio.
  5. Expor endpoint de healthcheck.

"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.core.config import get_settings
from backend.core.exceptions import (
    ForbiddenError,
    InvalidFeedbackError,
    LLMError,
    NexusBaseError,
    RoomNotFoundError,
    TranscriptionError,
    UnauthorizedError,
)
from backend.routes.room_routes import room_router
from backend.routes.ats_routes import ats_router

settings = get_settings()

app = FastAPI(
    title="Nexus API",
    description="Back-end da plataforma de simulação de entrevistas técnicas com IA.",
    version="2.0.0",

    # Desabilita docs em produção 
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None if settings.is_production else "/redoc",
)

#CORS 

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#xception handlers 


@app.exception_handler(UnauthorizedError)
async def unauthorized_handler(request: Request, exc: UnauthorizedError):
    return JSONResponse(status_code=401, content={"detail": str(exc)})


@app.exception_handler(ForbiddenError)
async def forbidden_handler(request: Request, exc: ForbiddenError):
    return JSONResponse(status_code=403, content={"detail": str(exc)})


@app.exception_handler(RoomNotFoundError)
async def not_found_handler(request: Request, exc: RoomNotFoundError):
    return JSONResponse(status_code=404, content={"detail": str(exc)})


@app.exception_handler(LLMError)
@app.exception_handler(InvalidFeedbackError)
@app.exception_handler(TranscriptionError)
async def server_error_handler(request: Request, exc: NexusBaseError):
    return JSONResponse(status_code=500, content={"detail": str(exc)})


@app.exception_handler(NexusBaseError)
async def nexus_base_handler(request: Request, exc: NexusBaseError):
    """Captura qualquer NexusBaseError não tratado pelos handlers específicos."""
    return JSONResponse(status_code=500, content={"detail": str(exc)})


#Routers

app.include_router(room_router)
app.include_router(ats_router)


# Healthcheck 

@app.get("/", tags=["health"])
async def root():
    return {
        "message": "Nexus API online.",
        "version": "2.0.0",
        "environment": settings.environment,
    }


@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok"}
