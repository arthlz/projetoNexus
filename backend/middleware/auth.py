"""
Validação de JWT emitido pelo Supabase Auth.
"""

from fastapi import Depends, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from backend.core.database import get_db
from backend.core.exceptions import UnauthorizedError

_bearer_scheme = HTTPBearer()


def _verify_token_with_supabase(token: str) -> str:
    """
    Delega a validação do token diretamente para a API do Supabase.
    Isso resolve nativamente tokens assinados com ES256, RS256 ou HS256,
    sem precisar decodificar manualmente a criptografia.
    """
    try:
        db = get_db()
        # O Supabase verifica a integridade, expiração e algoritmo do token
        user_response = db.auth.get_user(token)
        
        if not user_response or not user_response.user:
            raise UnauthorizedError("Usuário não encontrado ou token inválido.")
        
        return user_response.user.id
    except Exception as exc:
        raise UnauthorizedError(f"Falha na validação do token: {exc}")


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
) -> str:
    """
    Dependência FastAPI para rotas HTTP (ex: /room/setup, /room/encerrar).
    """
    return _verify_token_with_supabase(credentials.credentials)


def get_ws_user(token: str = Query(..., description="JWT do Supabase")) -> str:
    """
    Dependência FastAPI para rotas WebSocket.
    Transformada em função síncrona (def) para que o FastAPI rode em uma 
    thread separada, não bloqueando a conexão do WebSocket durante a validação.
    """
    try:
        return _verify_token_with_supabase(token)
    except UnauthorizedError as exc:
        raise exc