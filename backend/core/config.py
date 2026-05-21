"""
core/config.py
──────────────
Centraliza TODA a configuração da aplicação em um único lugar usando
pydantic-settings. Isso garante que variáveis de ambiente sejam validadas
na inicialização — o servidor não sobe se uma variável obrigatória estiver
faltando, prevenindo erros silenciosos em produção.
"""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ── Supabase ────────────────────────────────────────────────────────────
    supabase_url: str
    supabase_service_role_key: str
    supabase_jwt_secret: str

    # ── LLM ─────────────────────────────────────────────────────────────────
    openrouter_api_key: str
    llm_model: str = "arcee-ai/trinity-large-thinking:free"
    llm_fallback_model: str = "google/gemini-2.0-flash-thinking-exp:free"

    # ── STT ─────────────────────────────────────────────────────────────────
    deepgram_api_key: str

    # ── App ──────────────────────────────────────────────────────────────────
    allowed_origins: str = "http://localhost:3000"
    environment: str = "development"

    # ── WebSocket ────────────────────────────────────────────────────────────
    ws_receive_timeout: float = 30.0   # segundos sem receber frame → encerra loop

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Ajuste do caminho do arquivo env
    model_config = SettingsConfigDict(
        env_file="backend/.env.local", # Ajuste o caminho aqui
        env_file_encoding="utf-8"
    )

    @property
    def origins_list(self) -> list[str]:
        """Converte a string CSV de origens permitidas em lista."""
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    """
    Singleton de configurações usando lru_cache.
    O objeto Settings é instanciado apenas uma vez durante toda a vida
    do processo, o que evita re-leitura de disco a cada requisição.
    """
    return Settings()