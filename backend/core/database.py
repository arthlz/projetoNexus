"""
core/database.py
────────────────
Singleton do cliente Supabase.

Por que service_role e não a chave anon?
  A chave anon respeita as Row Level Security policies — ideal para
  o front-end. No back-end, após validarmos o JWT manualmente,
  queremos escrever/ler em nome de qualquer usuário sem depender de
  políticas RLS que poderiam bloquear operações legítimas do servidor.
  A service_role bypassa RLS de forma controlada e segura.

Por que @lru_cache?
  Criar o cliente Supabase abre conexões HTTP. Fazê-lo a cada request
  seria caro. O lru_cache garante uma única instância por processo.
"""

from functools import lru_cache
from supabase import create_client, Client
from backend.core.config import get_settings


@lru_cache
def get_db() -> Client:
    """Retorna o cliente Supabase (service_role) como singleton."""
    settings = get_settings()
    return create_client(
        settings.supabase_url,
        settings.supabase_service_role_key,
    )