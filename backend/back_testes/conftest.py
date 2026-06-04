# backend/back_testes/conftest.py
import sys
import os
import pytest
from fastapi.testclient import TestClient

project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
sys.path.insert(0, project_root)

from backend.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c
