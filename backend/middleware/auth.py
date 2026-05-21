"""
middleware/auth.py
──────────────────
Validação de JWT emitido pelo Supabase Auth.

Por que validar no back-end e não confiar no front-end?
  O front-end envia um JWT após o login no Supabase. Sem validação no
  back-end, qualquer pessoa que descubra um room_id pode acessar ou
  encerrar a sessão de outro usuário — a pendência crítica da doc original.

Fluxo:
  1. Front-end faz login via supabase.auth → recebe access_token (JWT).
  2. Front-end envia o token no header: Authorization: Bearer <token>
  3. Este módulo decodifica e valida a assinatura usando SUPABASE_JWT_SECRET.
  4. O user_id extraído do sub do token é injetado nas rotas via Depends().

Para WebSocket:
  O protocolo WS não suporta headers customizados no browser. A solução
  padrão é passar o token como query param: ?token=<jwt>
  O helper get_ws_user() lida com esse caso.
"""

from fastapi import Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from backend.core.config import get_settings
from backend.core.exceptions import UnauthorizedError

_bearer_scheme = HTTPBearer()


def _decode_token(token: str) -> dict:
    """
    Decodifica e valida o JWT do Supabase.
    Lança UnauthorizedError se o token for inválido ou expirado.
    """
    settings = get_settings()
    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            # O Supabase emite tokens com audience "authenticated"
            options={"verify_aud": False},
        )
        return payload
    except JWTError as exc:
        raise UnauthorizedError(f"Token inválido: {exc}") from exc


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
) -> str:
    """
    Dependência FastAPI para rotas HTTP.
    Retorna o user_id (UUID string) extraído do campo 'sub' do JWT.

    Uso nas rotas:
        @router.post("/setup")
        async def setup(user_id: str = Depends(get_current_user)):
            ...
    """
    payload = _decode_token(credentials.credentials)
    user_id: str | None = payload.get("sub")
    if not user_id:
        raise UnauthorizedError("Token não contém campo 'sub'.")
    return user_id


async def get_ws_user(token: str = Query(..., description="JWT do Supabase")) -> str:
    """
    Dependência FastAPI para rotas WebSocket.
    O token é recebido como query param pois browsers não suportam
    headers customizados em conexões WebSocket nativas.

    Uso:
        @router.websocket("/{room_id}/entrevista")
        async def ws(ws: WebSocket, user_id: str = Depends(get_ws_user)):
            ...
    """
    try:
        payload = _decode_token(token)
    except UnauthorizedError as exc:
        # WebSocket não lança HTTPException, só fecha a conexão
        raise exc

    user_id: str | None = payload.get("sub")
    if not user_id:
        raise UnauthorizedError("Token WS não contém campo 'sub'.")
    return user_id