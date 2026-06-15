"""
services/voice_pipeline.py
──────────────────────────
Pipeline de voz completo: VAD + STT (Deepgram) + TTS (Deepgram).

Por que Deepgram para TTS também?
  O projeto já usa Deepgram para STT, portanto já existe uma API key
  configurada. Usar o mesmo provedor evita adicionar uma nova dependência
  e uma nova variável de ambiente ao projeto. O modelo Aura do Deepgram
  tem qualidade suficiente e latência baixa para entrevistas em tempo real.

Fluxo de áudio completo:
  Microfone (front) → frames 960 bytes → VAD → WAV em memória
  → Deepgram STT → texto → LLM → texto resposta
  → Deepgram TTS → bytes MP3 → WebSocket → front-end toca via Audio API

Mapa de vozes TTS por idioma:
  "pt" → "aura-2-andromeda-pt"  (voz feminina em português)
  "en" → "aura-2-asteria-en"    (voz feminina em inglês)
  Se o modelo Aura 2 não estiver disponível no plano, usar os aliases
  sem "-2-": "aura-asteria-en" / "aura-orpheus-pt"
"""

import io
import wave
from http.client import HTTPSConnection
import json

import webrtcvad

from backend.core.config import get_settings

# ── Mapas de idioma ───────────────────────────────────────────────────────────

# Código Nexus → código Deepgram STT
DEEPGRAM_STT_LANG_MAP: dict[str, str] = {
    "pt": "pt-BR",
    "en": "en-US",
}

# Código Nexus → modelo de voz Deepgram TTS
DEEPGRAM_TTS_VOICE_MAP: dict[str, str] = {
    "en": "aura-asteria-en",
    "en": "aura-asteria-en",
}


# ── Configuração de áudio ─────────────────────────────────────────────────────

class AudioConfig:
    """
    Constantes de áudio fixas. Centralizar aqui evita "números mágicos"
    espalhados pelo código. Se o front-end mudar a taxa de amostragem,
    basta alterar aqui.
    """
    SAMPLE_RATE: int = 16000
    FRAME_MS: int = 30
    FRAME_BYTES: int = int(SAMPLE_RATE * FRAME_MS / 1000) * 2  # 960 bytes
    VAD_AGGRESSIVENESS: int = 2
    SILENCE_FRAMES: int = 35  # ~1 segundo de silêncio


# ── VAD ───────────────────────────────────────────────────────────────────────

class VADDetector:
    """
    Detector de Atividade de Voz usando webrtcvad (Google WebRTC VAD).

    Recebe frames de 960 bytes (30ms de áudio a 16kHz mono 16-bit).
    Acumula frames enquanto há voz e os retorna quando detecta silêncio
    prolongado (~1s), sinalizando fim de fala do candidato.

    Frames com tamanho diferente de 960 bytes são descartados
    silenciosamente — o webrtcvad trava com tamanhos inválidos.
    """

    def __init__(self) -> None:
        self.vad = webrtcvad.Vad(AudioConfig.VAD_AGGRESSIVENESS)
        self._speech_frames: list[bytes] = []
        self._silence_count: int = 0
        self._speaking: bool = False

    def process_frame(self, frame: bytes) -> list[bytes] | None:
        if len(frame) != AudioConfig.FRAME_BYTES:
            return None

        is_speech = self.vad.is_speech(frame, AudioConfig.SAMPLE_RATE)

        if is_speech:
            self._speech_frames.append(frame)
            self._silence_count = 0
            self._speaking = True
        elif self._speaking:
            self._speech_frames.append(frame)
            self._silence_count += 1

            if self._silence_count >= AudioConfig.SILENCE_FRAMES:
                frames_prontos = self._speech_frames.copy()
                self._reset()
                return frames_prontos

        return None

    def _reset(self) -> None:
        self._speech_frames.clear()
        self._silence_count = 0
        self._speaking = False


# ── STT ───────────────────────────────────────────────────────────────────────

def transcrever_audio(frames: list[bytes], language_code: str = "pt") -> str:
    """
    Recebe os frames de voz acumulados, monta um WAV em memória e
    envia para o Deepgram para transcrição (STT).

    Executado via asyncio.to_thread() pois o SDK síncrono do Deepgram
    bloquearia o event loop se chamado diretamente numa coroutine.
    """
    from deepgram import DeepgramClient, PrerecordedOptions

    settings = get_settings()
    dg_client = DeepgramClient(settings.deepgram_api_key)

    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(AudioConfig.SAMPLE_RATE)
        wf.writeframes(b"".join(frames))

    deepgram_lang = DEEPGRAM_STT_LANG_MAP.get(language_code, "pt-BR")

    try:
        options = PrerecordedOptions(
            model="nova-2",
            language=deepgram_lang,
            smart_format=True,
            punctuate=True,
            diarize=False,
            filler_words=False,
            utterances=True,
        )
        response = dg_client.listen.prerecorded.v("1").transcribe_file(
            {"buffer": buf.getvalue()}, options
        )
        texto = response.results.channels[0].alternatives[0].transcript.strip()
        print(f"📝 Transcrito ({deepgram_lang}): {texto}")
        return texto
    except Exception as exc:
        print(f"❌ Erro Deepgram STT: {exc}")
        return ""


# ── TTS ───────────────────────────────────────────────────────────────────────

def sintetizar_fala(texto: str, language_code: str = "pt") -> bytes:
    """
    Converte texto em áudio MP3 usando o Deepgram TTS (modelo Aura).
    Retorna os bytes do MP3 prontos para envio via WebSocket.

    Por que usar a API REST diretamente em vez do SDK?
      O SDK do Deepgram Python ainda não tem suporte estável para TTS
      streaming — a API REST é mais simples e confiável para este caso.
      O áudio completo é retornado em uma única resposta (não streaming),
      o que é adequado para respostas curtas de entrevista.

    Executado via asyncio.to_thread() assim como o STT.
    """
    settings = get_settings()
    voice = DEEPGRAM_TTS_VOICE_MAP.get(language_code, "aura-asteria-en")

    payload = json.dumps({"text": texto})
    headers = {
        "Authorization": f"Token {settings.deepgram_api_key}",
        "Content-Type": "application/json",
    }

    try:
        conn = HTTPSConnection("api.deepgram.com")
        conn.request(
            "POST",
            f"/v1/speak?model={voice}&encoding=mp3",
            body=payload,
            headers=headers,
        )
        response = conn.getresponse()

        if response.status != 200:
            erro = response.read().decode()
            print(f"❌ Erro Deepgram TTS (HTTP {response.status}): {erro}")
            return b""

        audio_bytes = response.read()
        print(f"🔊 TTS gerado: {len(audio_bytes)} bytes ({voice})")
        return audio_bytes

    except Exception as exc:
        print(f"❌ Erro Deepgram TTS: {exc}")
        return b""
    finally:
        conn.close()