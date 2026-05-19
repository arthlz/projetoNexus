# Centralização de TODA a configuração da aplicação usando pydantic-settings, garantindo tipagem, validação e facilidade de acesso em todo o código.

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):

    #supabase
    supabase_url: str
    supabase_service_role_key: str
    supabase_jwt_secret: str

    # llm,

    openrouter_api_key: str
    llm_model: str = "arcee-ai/trinity-large-preview:free" # Modelo com raciocínio estendido, mais adequado para gerar feedback criterioso

    llm_fallback_model: str = "google/gemini-2.0-flash-thinking-exp:free" # Modelo de fallback, caso o principal esteja indisponível

    # String to text

    deepgram_api_key: str

    # app
    allowed_origins: str = "http://localhost:3000"
    environment: str = "development" # ou "production"


    #websocket

    ws_receive_timeout: float = 30.0 # segundos sem receber nd, aí encerra o loop

    model_config = SettingsConfigDict(env_file = ".env", extra="ignore")


    @property
    def origins_list(self) -> list[str]:
        # Converte a string csv em lista
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]
    
    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"
    
@lru_cache
def get_settings() -> Settings:
    return Settings()