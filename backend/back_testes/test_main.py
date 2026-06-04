# backend/back_testes/test_main.py
from fastapi.testclient import TestClient


def test_read_root(client: TestClient):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Nexus API online."
    assert "version" in data


def test_healthcheck(client: TestClient):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
