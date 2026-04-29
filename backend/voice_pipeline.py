"""
Pipeline de voz para o Nexus

Fluxo:
  1. WebSocket recebe chunks de áudio PCM 16-bit, 16kHz, mono
  2. VAD (webrtcvad) detecta fim de fala e dispara a transcrição
  3. DeepGram transcreve em ~0.3s
  4. LLM gera resposta em streaming
  5. TTS via OpenAI converte os primeiros tokens já disponíveis
  6. WebSocket envia chunks de áudio de volta ao cliente

Instalar dependências:
  pip install deepgram-sdk webrtcvad openai python-dotenv

Para rodar junto ao FastAPI:
  Este módulo é importado por room_routes.py. A rota de voz está
  registrada como WebSocket em /room/{room_id}/entrevista.
"""

import asyncio, os, io, wave
import webrtcvad
import edge_tts
from fastapi import WebSocket
from openai import AsyncOpenAI
from dotenv import load_dotenv
from deepgram import DeepgramClient, PrerecordedOptions

load_dotenv()

# ── Singletons (os clientes HTTP são instanciados apenas uma vez) ──────────────

_dg_client = DeepgramClient(os.getenv("DEEPGRAM_API_KEY"))
_llm_client = AsyncOpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY"),
)
_tts_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ── Configurações ──────────────────────────────────────────────────────────────

class AudioConfig:
    SAMPLE_RATE = 16000   
    FRAME_MS = 30      
    FRAME_BYTES = int(SAMPLE_RATE * FRAME_MS / 1000) * 2 # FRAME_BYTES = 960
    VAD_AGGRESSIVENESS = 2   
    SILENCE_FRAMES = 20      

# ── Modelos ────────────────────────────────────────────────────────────────────

class VADDetector:
    """
    Detecta início e fim de fala frame a frame, acumulando o áudio falado.
    Deve ser instanciada uma vez por conexão WebSocket — o estado interno
    (frames acumulados, contagem de silêncio) é isolado por instância.
    """
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
    Organiza os frames de áudio no formato WAV e envia ao Deepgram para transcrição.
    Retorna o texto transcrito ou, em caso de erro, uma string vazia.
    """
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(AudioConfig.SAMPLE_RATE)
        wf.writeframes(b"".join(frames))

    try:
        options = PrerecordedOptions(model="nova-2", language="pt-BR", smart_format=True)
        response = _dg_client.listen.prerecorded.v("1").transcribe_file({"buffer": buf.getvalue()}, options)
        return response.results.channels[0].alternatives[0].transcript.strip()
    
    except Exception as e:
        print(f"❌ Erro Deepgram: {e}") 
        return ""

async def gerar_resposta_streaming(historico: list) -> asyncio.Queue:
    """
    Chama o LLM em streaming usando o histórico completo da entrevista.
    Retorna uma fila imediatamente, pois os tokens são empurrados de forma assíncrona conforme chegam,
    permitindo que o TTS comece antes da resposta terminar.
    """
    queue = asyncio.Queue()

    historico_valido = [
        m for m in historico
        if m.get("content") and str(m["content"]).strip() != ""
    ]

    if not historico_valido:
        print("⚠️ Histórico vazio ou mensagem inválida. Abortando chamada.")
        await queue.put("Desculpe, não consegui ouvir nada. Pode repetir?")
        await queue.put(None)
        return queue

    async def _stream():
        try:
            print("================ DEBUG HISTORICO ================")
            print(historico_valido)
            print("=================================================")
            async with _llm_client.chat.completions.stream(
                model="minimax/minimax-m2.5:free",
                messages=historico_valido,
            ) as stream:
                async for chunk in stream:
                    if hasattr(chunk, "choices") and len(chunk.choices) > 0:
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

async def sintetizar_streaming(text_queue: asyncio.Queue, ws: WebSocket) -> str:
    """
    Consome a fila de tokens e os envia ao TTS da OpenAI em trechos,
    transmitindo o áudio opus ao cliente via WebSocket.
    Retorna o texto completo da resposta para ser persistido no histórico da sala.
    """
    buffer = "" # Zera toda vez que um trecho é enviado ao TTS
    full_text = "" # Nunca é zerado, persiste no histórico da sala (importante para o feedback!)

    async def _falar(texto: str):
        if not texto.strip(): return

        try:

            communicate = edge_tts.Communicate(texto, "pt-BR-FranciscaNeural")
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    await ws.send_bytes(chunk["data"])
        except Exception as e:
            print(f"❌ Erro OpenAI TTS: {e}")

    while True:
        token = await text_queue.get()
        if token is None:
            await _falar(buffer) # Envia o restante do buffer ao TTS antes de encerrar
            break

        buffer += token
        full_text += token
        # Envia o buffer ao TTS a cada sentença completa ou a cada ~80 chars acumulados
        if buffer[-1] in ".!?\n" or len(buffer) >= 80:
            await _falar(buffer)
            buffer = ""

    return full_text
