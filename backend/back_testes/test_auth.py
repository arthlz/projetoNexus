import pytest
from unittest.mock import patch, MagicMock
from fastapi.security import HTTPAuthorizationCredentials
from jose import JWTError

# Importações do módulo de autenticação e exceções
from backend.middleware.auth import _decode_token, get_current_user, get_ws_user
from backend.core.exceptions import UnauthorizedError

# Configuração de Mocks Globais


@pytest.fixture(autouse=True)
def mock_env_settings():
    """
    Injeta configurações falsas para evitar dependência do .env real.
    """
    mock_config = MagicMock()
    mock_config.supabase_jwt_secret = "super-secret-key-mock"

    with patch("backend.middleware.auth.get_settings", return_value=mock_config):
        yield mock_config


# Testes: Decodificação Interna (_decode_token)


@patch("backend.middleware.auth.jwt.decode")
def test_decode_token_sucesso(mock_jwt_decode):
    """Garante que a função retorna o payload quando a assinatura do JWT é válida."""
    payload_simulado = {"sub": "user-123", "role": "authenticated"}
    mock_jwt_decode.return_value = payload_simulado

    resultado = _decode_token("token_valido_falso")

    assert resultado == payload_simulado
    mock_jwt_decode.assert_called_once()
    # Verifica se a flag verify_aud=False foi passada corretamente para o Supabase
    _, kwargs = mock_jwt_decode.call_args
    assert kwargs["options"]["verify_aud"] is False


@patch("backend.middleware.auth.jwt.decode")
def test_decode_token_invalido_ou_expirado(mock_jwt_decode):
    """Garante que qualquer erro do `jose` é convertido na nossa UnauthorizedError."""
    mock_jwt_decode.side_effect = JWTError("Assinatura inválida ou token expirado")

    with pytest.raises(UnauthorizedError, match="Token inválido"):
        _decode_token("token_corrompido")


# ── Testes: Rotas HTTP (get_current_user)


@patch("backend.middleware.auth.jwt.decode")
def test_get_current_user_sucesso(mock_jwt_decode):
    """Garante que o ID do utilizador (sub) é extraído corretamente de uma requisição HTTP."""
    mock_jwt_decode.return_value = {"sub": "uuid-do-utilizador-999"}

    # O FastAPI injeta o token através do esquema HTTPBearer
    credenciais = HTTPAuthorizationCredentials(scheme="Bearer", credentials="meu_jwt")

    user_id = get_current_user(credenciais)
    assert user_id == "uuid-do-utilizador-999"


@patch("backend.middleware.auth.jwt.decode")
def test_get_current_user_sem_sub(mock_jwt_decode):
    """Garante que um token válido, mas sem o campo 'sub', é rejeitado."""
    mock_jwt_decode.return_value = {"email": "teste@nexus.com"}  # Falta o 'sub'

    credenciais = HTTPAuthorizationCredentials(scheme="Bearer", credentials="meu_jwt")

    with pytest.raises(UnauthorizedError, match="Token não contém campo 'sub'"):
        get_current_user(credenciais)


# Testes: WebSockets (get_ws_user)


@pytest.mark.asyncio
@patch("backend.middleware.auth.jwt.decode")
async def test_get_ws_user_sucesso(mock_jwt_decode):
    """Garante que a extração por query parameter em WebSockets funciona (Assíncrono)."""
    mock_jwt_decode.return_value = {"sub": "uuid-ws-123"}

    user_id = await get_ws_user(token="token_da_url")
    assert user_id == "uuid-ws-123"


@pytest.mark.asyncio
@patch("backend.middleware.auth.jwt.decode")
async def test_get_ws_user_invalido(mock_jwt_decode):
    """Garante que o WebSocket falha e propaga a exceção para que o ciclo WS a apanhe."""
    mock_jwt_decode.side_effect = JWTError("Token expirado")

    with pytest.raises(UnauthorizedError):
        await get_ws_user(token="token_da_url")
