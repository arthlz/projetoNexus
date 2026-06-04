import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from backend.services.llm_service import LLMService
from backend.services.voice_pipeline import (
    AudioConfig,
    VADDetector,
    transcrever_audio,
    sintetizar_fala,
)
from backend.core.exceptions import LLMError

# ── Configuração Global de Mocks ──────────────────────────────────────────────


@pytest.fixture(autouse=True)
def mock_env_settings():
    """
    Injeta configurações falsas em todos os testes para evitar que o
    get_settings() tente ler chaves reais de um .env inexistente no ambiente de teste.
    """
    mock_config = MagicMock()
    mock_config.openrouter_api_key = "mock_openrouter_key"
    mock_config.llm_model = "primary-model"
    mock_config.llm_fallback_model = "fallback-model"
    mock_config.deepgram_api_key = "mock_deepgram_key"

    with patch(
        "backend.services.llm_service.get_settings", return_value=mock_config
    ), patch("backend.services.voice_pipeline.get_settings", return_value=mock_config):
        yield mock_config


# Testes: LLM Service


@pytest.mark.asyncio
@patch("backend.services.llm_service.AsyncOpenAI")
async def test_chamar_llm_sucesso(mock_openai_class):
    """Garante que a resposta do LLM é extraída corretamente do objeto da OpenAI."""
    # 1. Preparar o Mock do cliente OpenAI
    mock_client_instance = AsyncMock()
    mock_openai_class.return_value = mock_client_instance

    # 2. Simular a estrutura de resposta da API
    mock_response = MagicMock()
    mock_response.choices = [
        MagicMock(message=MagicMock(content="Resposta simulada de entrevista."))
    ]
    mock_client_instance.chat.completions.create.return_value = mock_response

    # 3. Executar
    service = LLMService()
    mensagens = [{"role": "user", "content": "Olá"}]
    resultado = await service.chamar_llm(mensagens)

    # 4. Validar
    assert resultado == "Resposta simulada de entrevista."
    mock_client_instance.chat.completions.create.assert_called_once()


@pytest.mark.asyncio
@patch("backend.services.llm_service.AsyncOpenAI")
async def test_chamar_llm_falha_total(mock_openai_class):
    """Garante que o fallback é acionado e a LLMError é lançada se tudo falhar."""
    mock_client_instance = AsyncMock()
    mock_openai_class.return_value = mock_client_instance

    # Simular que a API lança um erro sempre que chamada (tanto no modelo principal quanto no fallback)
    mock_client_instance.chat.completions.create.side_effect = Exception(
        "API fora do ar"
    )

    service = LLMService()

    # Validar se o serviço transforma o erro genérico na nossa exceção de domínio
    with pytest.raises(LLMError, match="Todos os modelos LLM falharam"):
        await service.chamar_llm([{"role": "user", "content": "Olá"}])

    # Deve ter tentado chamar duas vezes: modelo principal + modelo de fallback
    assert mock_client_instance.chat.completions.create.call_count == 2


# Testes: Voice Pipeline (Deepgram)


@patch("deepgram.DeepgramClient")
def test_transcrever_audio_sucesso(mock_deepgram_class):
    """Garante que o serviço de STT envia o buffer correto e extrai o texto."""
    mock_instance = MagicMock()
    mock_deepgram_class.return_value = mock_instance

    # Simular a resposta aninhada do Deepgram: response.results.channels[0].alternatives[0].transcript
    mock_response = MagicMock()
    mock_response.results.channels = [
        MagicMock(
            alternatives=[MagicMock(transcript="Esta é a resposta do candidato.")]
        )
    ]
    mock_instance.listen.prerecorded.v().transcribe_file.return_value = mock_response

    # Simular alguns frames de áudio (3 frames de 960 bytes)
    frames_falsos = [b"\x00" * AudioConfig.FRAME_BYTES for _ in range(3)]

    resultado = transcrever_audio(frames_falsos, "pt")

    assert resultado == "Esta é a resposta do candidato."
    mock_instance.listen.prerecorded.v().transcribe_file.assert_called_once()


@patch("backend.services.voice_pipeline.HTTPSConnection")
def test_sintetizar_fala_sucesso(mock_https_class):
    """Garante que o serviço TTS faz o POST correto para a API REST e retorna bytes."""
    mock_conn_instance = MagicMock()
    mock_https_class.return_value = mock_conn_instance

    # Simular resposta HTTP 200 e a devolução de bytes mp3
    mock_response = MagicMock()
    mock_response.status = 200
    mock_response.read.return_value = b"mp3_audio_bytes"
    mock_conn_instance.getresponse.return_value = mock_response

    resultado = sintetizar_fala("Muito bem.", "en")

    assert resultado == b"mp3_audio_bytes"
    mock_conn_instance.request.assert_called_once()

    # Verificar se o modelo correto de idioma foi injetado na URL
    args, kwargs = mock_conn_instance.request.call_args
    assert "aura-asteria-en" in args[1]


# Testes: VAD (Voice Activity Detection)


@patch("webrtcvad.Vad")
def test_vad_ignora_frames_invalidos(mock_vad_class):
    """Garante que o VAD recusa bytes que não tenham o tamanho exato de configuração."""
    detector = VADDetector()

    # Frame inválido (não tem 960 bytes)
    frame_invalido = b"\x00" * 500

    resultado = detector.process_frame(frame_invalido)
    assert resultado is None


@patch("webrtcvad.Vad")
def test_vad_detecta_fim_de_fala(mock_vad_class):
    """Simula o ciclo completo: voz detectada -> silêncio acumulado -> disparo dos frames."""
    mock_vad_instance = MagicMock()
    mock_vad_class.return_value = mock_vad_instance

    detector = VADDetector()
    frame_valido = b"\x00" * AudioConfig.FRAME_BYTES

    # 1. Simular um frame onde o candidato está falando
    mock_vad_instance.is_speech.return_value = True
    resultado = detector.process_frame(frame_valido)
    assert resultado is None  # Ainda acumulando, não deve retornar
    assert detector._speaking is True

    # 2. Simular silêncio contínuo até atingir o limite (SILENCE_FRAMES)
    mock_vad_instance.is_speech.return_value = False

    for _ in range(AudioConfig.SILENCE_FRAMES - 1):
        detector.process_frame(frame_valido)

    # O limite exato que engatilha o retorno dos buffers acumulados
    frames_prontos = detector.process_frame(frame_valido)

    assert frames_prontos is not None
    # Deve conter 1 frame de voz + 35 frames de silêncio
    assert len(frames_prontos) == AudioConfig.SILENCE_FRAMES + 1
    assert detector._speaking is False  # Estado resetado
