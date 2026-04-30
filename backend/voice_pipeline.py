import asyncio, os, io, wave
import webrtcvad
from fastapi import WebSocket
from dotenv import load_dotenv
from deepgram import DeepgramClient, PrerecordedOptions

load_dotenv()

_dg_client = DeepgramClient(os.getenv("DEEPGRAM_API_KEY"))

class AudioConfig:
    SAMPLE_RATE = 16000
    FRAME_MS = 30
    FRAME_BYTES = int(SAMPLE_RATE * FRAME_MS / 1000) * 2  # 960 bytes
    VAD_AGGRESSIVENESS = 2
    SILENCE_FRAMES = 35

class VADDetector:
    def __init__(self):
        self.vad = webrtcvad.Vad(AudioConfig.VAD_AGGRESSIVENESS)
        self.speech_frames = []
        self.silence_count = 0
        self.speaking = False

    def process_frame(self, frame: bytes) -> list[bytes] | None:
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

def transcrever_audio(frames: list[bytes]) -> str:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(AudioConfig.SAMPLE_RATE)
        wf.writeframes(b"".join(frames))

    try:
        options = PrerecordedOptions(model="nova-2", language="en-US", smart_format=True, punctuate=True, diarize=False, filler_words=False, utterances=True)
        response = _dg_client.listen.prerecorded.v("1").transcribe_file(
            {"buffer": buf.getvalue()}, options
        )
        texto = response.results.channels[0].alternatives[0].transcript.strip()
        print(f"📝 Transcrito: {texto}")
        return texto
    except Exception as e:
        print(f"❌ Erro Deepgram: {e}")
        return ""

async def handle_voice(ws: WebSocket):
    """
    Função principal chamada pelo room_routes.py.
    Só faz VAD + transcrição e devolve o texto ao frontend.
    """
    await ws.accept()
    detector = VADDetector()

    try:
        while True:
            frame = await ws.receive_bytes()
            frames_prontos = detector.process_frame(frame)

            if frames_prontos:
                texto = await asyncio.to_thread(transcrever_audio, frames_prontos)

                if texto:
                    await ws.send_json({"type": "transcript", "text": texto})

    except Exception as e:
        print(f"🔌 WebSocket encerrado: {e}")