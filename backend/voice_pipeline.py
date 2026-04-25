"""
Pipeline de voz pro Nexus

Fluxo:
  1. WebSocket recebe chunks de áudio PCM 16-bit, 16kHz, mono
  2. VAD (webrtcvad) detecta fim de fala e dispara a transcrição
  3. Whisper small (pré-carregado) transcreve em ~0.3s
  4. LLM gera resposta em streaming
  5. TTS (OpenAI ou gTTS) converte os primeiros tokens já disponíveis
  6. WebSocket envia chunks de áudio de volta ao cliente

Instalar dependências:
  pip install faster-whisper webrtcvad openai python-dotenv

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
SAMPLE_RATE    = 16000   
FRAME_MS       = 30      
FRAME_BYTES    = int(SAMPLE_RATE * FRAME_MS / 1000) * 2  
VAD_AGGRESSIVENESS = 2   
SILENCE_FRAMES = 20      

# ── Modelos (Singletons) ──────────────────────────────────────────────────────

_vad: webrtcvad.Vad | None = None
_dg_client: DeepgramClient | None = None

def get_vad() -> webrtcvad.Vad:
    global _vad
    if _vad is None:
        _vad = webrtcvad.Vad(VAD_AGGRESSIVENESS)
    return _vad

def get_deepgram() -> DeepgramClient:
    global _dg_client
    if _dg_client is None:
        _dg_client = DeepgramClient(os.getenv("DEEPGRAM_API_KEY"))
    return _dg_client

# ── Funções auxiliares ────────────────────────────────────────────────────────

def frames_to_wav(frames: list[bytes]) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(b"".join(frames))
    return buf.getvalue()

# MUDANÇA: Removi o 'async' aqui para funcionar com o to_thread lá embaixo
def transcrever(frames: list[bytes], language: str = "pt-BR") -> str:
    """Transcreve usando a API do Deepgram (Nova-2)"""
    start_time = time.time()
    wav_bytes = frames_to_wav(frames)
    dg = get_deepgram()
    
    try:
        options = PrerecordedOptions(
            model="nova-2",
            language=language,
            smart_format=True,
        )
        payload = {"buffer": wav_bytes}
        
        # Chamada síncrona do SDK v3
        response = dg.listen.prerecorded.v("1").transcribe_file(payload, options)
        texto = response.results.channels[0].alternatives[0].transcript
        
        print(f"⏱️ [DEEPGRAM] Transcrição em: {time.time() - start_time:.3f}s")
        return texto.strip()
    except Exception as e:
        print(f"❌ Erro Deepgram: {e}")
        return ""

async def gerar_resposta_streaming(historico: list[dict]) -> asyncio.Queue:
    """Chama o LLM em streaming e empurra tokens em uma fila (Com proteção contra travamentos)."""
    client = AsyncOpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=os.getenv("OPENROUTER_API_KEY"),
    )
    queue: asyncio.Queue[str | None] = asyncio.Queue()

    async def _stream():
        try:
            async with client.chat.completions.stream(
                model="z-ai/glm-4.5-air:free",
                messages=historico,
            ) as stream:
                async for chunk in stream:
                    token = chunk.choices[0].delta.content or ""
                    if token:
                        await queue.put(token)
        except Exception as e:
            # Se o OpenRouter falhar, avisamos no terminal do Uvicorn
            print(f"❌ ERRO NO CÉREBRO (OpenRouter): {e}")
            # Mandamos uma frase de erro para o TTS falar, assim o cliente não trava!
            await queue.put("Desculpe, tive um problema na minha rede neural.") 
        finally:
            # ISSO É O MAIS IMPORTANTE: Sempre avisa que acabou, mesmo se der erro.
            await queue.put(None)

    asyncio.create_task(_stream())
    return queue

async def sintetizar_streaming(text_queue: asyncio.Queue, ws: WebSocket):
    """
    Consome tokens da fila e envia áudio TTS em chunks via WebSocket.

    Estratégia: acumula tokens até ter uma sentença (., !, ?) ou
    atingir ~80 chars, então chama o TTS e envia o áudio.
    Isso garante que o primeiro chunk de áudio chegue em < 1s.
    """
    client = AsyncOpenAI(api_key=os.getenv("DEEPGRAM_API_KEY"))  # TTS via OpenAI
    buffer = ""

    async def _falar(texto: str):
        if not texto.strip():
            return
        async with client.audio.speech.with_streaming_response.create(
            model="tts-1",       # "tts-1" = menor latência; "tts-1-hd" = maior qualidade
            voice="nova",
            input=texto,
            response_format="opus",  # Opus = menor tamanho, ideal para streaming
        ) as resp:
            async for chunk in resp.iter_bytes(chunk_size=4096):
                await ws.send_bytes(chunk)

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
async def voz_endpoint(ws: WebSocket, room_id: str, lang: str = "pt"):
    """
    Protocolo WebSocket:
      Cliente → servidor : bytes  (frames PCM 16-bit, 16kHz, 30ms cada)
      Servidor → cliente : bytes  (chunks de áudio Opus com resposta da IA)
      Servidor → cliente : {"type": "transcript", "text": "..."}  (JSON)
      Servidor → cliente : {"type": "done"}
    """
    await ws.accept()
    vad = get_vad()

    speech_frames: list[bytes] = []
    silence_count = 0
    speaking = False

    try:
        while True:
            frame = await ws.receive_bytes()

            # Valida tamanho do frame (webrtcvad é rígido quanto a isso)
            if len(frame) != FRAME_BYTES:
                continue

            is_speech = vad.is_speech(frame, SAMPLE_RATE)

            if is_speech:
                speech_frames.append(frame)
                silence_count = 0
                speaking = True
            elif speaking:
                speech_frames.append(frame)  # inclui silêncio pós-fala
                silence_count += 1

                if silence_count >= SILENCE_FRAMES:
                    # ── Usuário parou de falar → transcreve ──────────────────
                    texto = await asyncio.to_thread(transcrever, speech_frames, lang)
                    speech_frames.clear()
                    silence_count = 0
                    speaking = False

                    if not texto:
                        print("⚠️ PASSO 1: Deepgram devolveu texto vazio (áudio ininteligível ou silêncio).")
                        # Avisa o cliente que não entendeu nada, em vez de deixar ele no vácuo
                        await ws.send_json({"type": "transcript", "text": "[Áudio sem voz detectada]"})
                        await ws.send_json({"type": "done"})
                        continue

                    print(f"📍 PASSO 1: Deepgram devolveu: '{texto}'")
                    await ws.send_json({"type": "transcript", "text": texto})
                    
                    print("📍 PASSO 2: JSON enviado ao site. Acionando a IA...")
                    historico = [{"role": "user", "content": texto}]
                    text_queue = await gerar_resposta_streaming(historico)
                    
                    print("📍 PASSO 3: IA processando! Acionando a Voz (OpenAI)...")
                    await sintetizar_streaming(text_queue, ws)
                    
                    print("📍 PASSO 4: Áudio gerado! Encerrando o fluxo.")
                    await ws.send_json({"type": "done"})

    except WebSocketDisconnect:
        pass