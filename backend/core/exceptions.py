"""
core/exceptions.py
──────────────────
Hierarquia de exceções customizadas do Nexus.

Ter exceções próprias em vez de lançar HTTPException diretamente nos
serviços tem dois benefícios:
  1. Os serviços ficam desacoplados do FastAPI (testáveis sem HTTP).
  2. O handler global em main.py converte cada tipo em um status HTTP
     apropriado, centralizando o mapeamento em um único lugar.
"""


class NexusBaseError(Exception):
    """Raiz da hierarquia de erros do Nexus."""
    pass


class RoomNotFoundError(NexusBaseError):
    """Sala/entrevista não existe no banco de dados."""
    pass


class UnauthorizedError(NexusBaseError):
    """Token ausente, inválido ou expirado."""
    pass


class ForbiddenError(NexusBaseError):
    """Token válido, mas o usuário não tem permissão sobre o recurso."""
    pass


class LLMError(NexusBaseError):
    """Falha na comunicação com o modelo de linguagem."""
    pass


class TranscriptionError(NexusBaseError):
    """Falha na transcrição de áudio pelo Deepgram."""
    pass


class InvalidFeedbackError(NexusBaseError):
    """O LLM retornou um JSON de feedback inválido ou malformado."""
    pass