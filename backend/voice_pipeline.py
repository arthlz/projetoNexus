"""
Pipeline de voz pro Nexus

Fluxo:
  1. WebSocket recebe chunks de áudio PCM 16-bit, 16kHz, mono
  2. VAD (webrtcvad) detecta fim de fala e dispara a transcrição
  3. DeepGram (pré-carregado) transcreve em ~0.3s
  4. LLM gera resposta em streaming
  5. TTS (OpenAI ou gTTS) converte os primeiros tokens já disponíveis
  6. WebSocket envia chunks de áudio de volta ao cliente

Instalar dependências:
  pip install deepgram-sdk webrtcvad openai python-dotenv

Para rodar junto ao FastAPI:
  No main.py, adicione:  app.include_router(voice_router)
"""

import asyncio, os, struct, io, wave, time
import webrtcvad
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
# REMOVIDO: from faster_whisper import WhisperModel (Não precisa mais!)
from openai import AsyncOpenAI
from dotenv import load_dotenv
from deepgram import DeepgramClient, PrerecordedOptions

load_dotenv()

# ── Configurações ──────────────────────────────────────────────────────────────
class AudioConfig:
    SAMPLE_RATE    = 16000   
    FRAME_MS       = 30      
    FRAME_BYTES    = int(SAMPLE_RATE * FRAME_MS / 1000) * 2  
    VAD_AGGRESSIVENESS = 2   
    SILENCE_FRAMES = 20      

# ── Modelos (Singletons) ──────────────────────────────────────────────────────

class VADDetector:
    def __init__(self):
        self.vad = webrtcvad.Vad(AudioConfig.VAD_AGGRESSIVENESS)
        self.speech_frames = []
        self.silence_count = 0
        self.speaking = False
    
    def process_frame(self, frame: bytes) -> list[bytes] | None:
        """
        Processa um frame de áudio.
        Retorna a lista de frames se a fala acabou, senão retorna None.
        """
        if len(frame) != AudioConfig.FRAME_BYTES:
            return None
        
        is_speech = self.vad.is_speech(frame, AudioConfig.SAMPLE_RATE)

        if is_speech:
            self.speech_frames.append(frame)
            self.silence_count = 0
            self.speaking = True

        elif self.speaking:
            self.speech_frames.append(frame)
            self.silence_count += 1

            if self.silence_count >= AudioConfig.SILENCE_FRAMES:
                frames_to_return = self.speech_frames.copy()
                self.reset()
                return frames_to_return
            
        return None
    
    def reset(self):
        self.speech_frames.clear()
        self.silence_count = 0
        self.speaking = False

def transcrever_audio(frames: list[bytes], language: str) -> str:
    """
    Serviço isolado para o DeepGram.
    """
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(AudioConfig.SAMPLE_RATE)
        wf.writeframes(b"".join(frames))

    try:
        dg_client = DeepgramClient(os.getenv("DEEPGRAM_API_KEY"))
        options = PrerecordedOptions(model="nova-2", language=language, smart_format=True)
        response = dg_client.listen.prerecorded.v("1").transcribe_file({"buffer": buf.getvalue()}, options)
        return response.results.channels[0].alternatives[0].transcript.strip()
    
    except Exception as e:
        print(f"❌ Erro Deepgram: {e}") 
        return ""

async def gerar_resposta_streaming(texto_usuario: str) -> asyncio.Queue:
    """Chama o LLM em streaming e empurra tokens em uma fila (Com proteção contra travamentos)."""
    client = AsyncOpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=os.getenv("OPENROUTER_API_KEY"),
    )
    queue = asyncio.Queue()

    async def _stream():
        try:
            async with client.chat.completions.stream(
                model="z-ai/glm-4.5-air:free",
                messages=[{"role": "user", "content": texto_usuario}],
            ) as stream:
                async for chunk in stream:
                    token = chunk.choices[0].delta.content or ""
                    if token:
                        await queue.put(token)
        except Exception as e:
            print(f"❌ ERRO NO CÉREBRO (OpenRouter): {e}")
            await queue.put("Falha no processamento lógico.") 
        finally:
            await queue.put(None)

    asyncio.create_task(_stream())
    return queue

async def sintetizar_streaming(text_queue: asyncio.Queue, ws: WebSocket):
    """
    Serviço isolado para o TTS (OpenAI).
    """
    client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))  # TTS via OpenAI
    buffer = ""

    async def _falar(texto: str):
        if not texto.strip(): return
        
        try:
            async with client.audio.speech.with_streaming_response.create(
                model="tts-1", voice="nova", input=texto, response_format="opus",  # Opus = menor tamanho, ideal para streaming
            ) as resp:
                async for chunk in resp.iter_bytes(chunk_size=4096):
                    await ws.send_bytes(chunk)
        except Exception as e:
            print(f"❌ Erro OpenAI TTS: {e}")

    while True:
        token = await text_queue.get()
        if token is None:
            await _falar(buffer)  # flush do restante
            break

        buffer += token
        # Envia a cada sentença completa ou a cada ~80 chars acumulados
        if buffer[-1] in ".!?\n" or len(buffer) >= 80:
            await _falar(buffer)
            buffer = ""

# ── Rota WebSocket ─────────────────────────────────────────────────────────────

voice_router = APIRouter(prefix="/voice", tags=["voice"])

@voice_router.websocket("/{room_id}")
async def voz_endpoint(ws: WebSocket, room_id: str, lang: str = "en"):
    await ws.accept()
    detector_vad = VADDetector()

    try:
        while True:
            frame = await ws.receive_bytes()
            audio_completo = detector_vad.process_frame(frame)

            # Valida tamanho do frame (webrtcvad é rígido quanto a isso)
            if audio_completo:
                texto = await asyncio.to_thread(transcrever_audio, audio_completo, lang)
                
                if not texto:
                    await ws.send_json({"type": "transcript", "text": "[Áudio não compreendido]"})
                    await ws.send_json({"type": "done"})
                    continue
                
                await ws.send_json({"type": "transcript", "text": texto})

                text_queue = await gerar_resposta_streaming(texto)
                await sintetizar_streaming(text_queue, ws)

                await ws.send_json({"type": "done"})

    except WebSocketDisconnect:
        print("🔌 Cliente desconectado.")