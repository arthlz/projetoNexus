# Todas as exceções customizadas do processo, pra saber direito o que está causando erro.

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