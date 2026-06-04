import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, MagicMock

from backend.main import app
from backend.routes.room_routes import get_room_service
from backend.schemas.room_schemas import FeedbackResponse, ReportResponse
from backend.core.exceptions import RoomNotFoundError, ForbiddenError

# Configuração dos Mocks


@pytest.fixture
def mock_room_service():
    """
    Cria um serviço falso (mock) para evitar chamadas reais ao Supabase e ao LLM.
    Configuramos os métodos assíncronos (AsyncMock) e síncronos (MagicMock)
    de acordo com a implementação original no RoomService.
    """
    mock_service = MagicMock()
    # criar_sala e encerrar_sala são funções assíncronas (async def)
    mock_service.criar_sala = AsyncMock()
    mock_service.encerrar_sala = AsyncMock()
    # obter_relatorio é uma função síncrona
    mock_service.obter_relatorio = MagicMock()

    return mock_service


@pytest.fixture
def client(mock_room_service):
    """
    Substitui a dependência real pela versão mockada apenas durante os testes.
    """
    app.dependency_overrides[get_room_service] = lambda: mock_room_service
    with TestClient(app) as c:
        yield c
    # Limpa as substituições após o teste
    app.dependency_overrides.clear()


# Testes de Rotas HTTP


def test_configurar_sala_sucesso(client, mock_room_service):
    # Simula que a criação da sala no banco retornou o ID 123
    mock_room_service.criar_sala.return_value = 123

    payload = {
        "role": "Front-end Developer",
        "level": "Júnior",
        "language": "pt",
        "persona": "Acolhedor",
        "company": "Nexus Inc",
        "analogy": "Matrix",
    }

    response = client.post("/room/setup", json=payload)

    assert response.status_code == 201
    dados = response.json()
    assert dados["room_id"] == 123
    assert dados["status"] == "success"
    assert dados["config"]["role"] == "Front-end Developer"

    # Verifica se o método do serviço foi chamado corretamente
    mock_room_service.criar_sala.assert_called_once()


def test_encerrar_entrevista_sucesso(client, mock_room_service):
    # Prepara o mock para retornar um FeedbackResponse válido
    mock_feedback = FeedbackResponse(
        score=85,
        tech=80,
        comm=90,
        soft=85,
        feedback="Excelente comunicação técnica.",
        status="completed",
    )
    mock_room_service.encerrar_sala.return_value = mock_feedback

    response = client.post("/room/123/encerrar")

    assert response.status_code == 200
    dados = response.json()
    assert dados["score"] == 85
    assert dados["feedback"] == "Excelente comunicação técnica."


def test_encerrar_entrevista_sala_nao_encontrada(client, mock_room_service):
    # Simula o lançamento de uma exceção RoomNotFoundError pelo serviço
    mock_room_service.encerrar_sala.side_effect = RoomNotFoundError(
        "Sala não encontrada."
    )

    response = client.post("/room/999/encerrar")

    # O route handler intercepta o erro ou levanta HTTPException retornando 404
    assert response.status_code == 404
    assert response.json()["detail"] == "Sala não encontrada."


def test_obter_relatorio_sucesso(client, mock_room_service):
    # Prepara um modelo falso de relatório
    mock_relatorio = ReportResponse(
        room_id=123,
        role="Back-end Developer",
        level="Sênior",
        persona="Rigoroso",
        company="Tech Corp",
        language="pt",
        date="2026-05-17T14:30:00",
        score=95,
        tech=95,
        comm=90,
        soft=100,
        feedback="Muito bom.",
        messages=[
            {"sender": "user", "text": "Olá", "created_at": "2026-05-17T14:30:01"}
        ],
    )
    mock_room_service.obter_relatorio.return_value = mock_relatorio

    response = client.get("/room/123/relatorio")

    assert response.status_code == 200
    dados = response.json()
    assert dados["room_id"] == 123
    assert dados["role"] == "Back-end Developer"
    assert len(dados["messages"]) == 1


def test_obter_relatorio_acesso_negado(client, mock_room_service):
    # Simula um erro de permissão (ex: utilizador tenta aceder à sala de outro)
    mock_room_service.obter_relatorio.side_effect = ForbiddenError("Acesso negado.")

    response = client.get("/room/123/relatorio")

    # O handler deve retornar 403 Forbidden
    assert response.status_code == 403
