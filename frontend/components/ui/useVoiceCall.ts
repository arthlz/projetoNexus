import { useState, useRef, useEffect } from 'react';

export function useVoiceCall(roomId: string | null) {
  const [isCalling, setIsCalling] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  useEffect(() => {
    if (!roomId) return;
    
    // Conecta na rota correta do FastAPI
    const wsUrl = `ws://localhost:8000/room/${roomId}/entrevista`;
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onmessage = async (event) => {
      // Se for String, é o JSON com a transcrição ({"type": "transcript", "text": "..."})
      if (typeof event.data === "string") {
        const data = JSON.parse(event.data);
        console.log("Servidor:", data);
        // Aqui você pode expandir no futuro para mostrar o texto na tela
        return;
      }

      // Se for Binário, é o áudio em Streaming do OpenAI TTS
      const audioBlob = new Blob([event.data], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      await audio.play();
    };

    return () => wsRef.current?.close();
  }, [roomId]);

  const startCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Força a amostragem para 16kHz exigida pelo VAD do Python
      const audioContext = new window.AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      let audioBuffer = new Int16Array(0);

      processor.onaudioprocess = (e) => {
        if (wsRef.current?.readyState !== WebSocket.OPEN) return;

        const inputData = e.inputBuffer.getChannelData(0);
        const int16Data = new Int16Array(inputData.length);

        // Converte Float32 (padrão Web) para PCM 16-bit
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Acumula os dados em um buffer
        const newBuffer = new Int16Array(audioBuffer.length + int16Data.length);
        newBuffer.set(audioBuffer, 0);
        newBuffer.set(int16Data, audioBuffer.length);
        audioBuffer = newBuffer;

        // Extrai fatias EXATAS de 480 amostras (960 bytes, 30ms) exigidas pelo backend
        while (audioBuffer.length >= 480) {
          const chunk = audioBuffer.slice(0, 480);
          audioBuffer = audioBuffer.slice(480);
          wsRef.current.send(chunk.buffer);
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      setIsCalling(true);
    } catch (err) {
      console.error("Erro ao acessar o microfone:", err);
    }
  };

  const stopCall = async () => {
    if (processorRef.current){
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (audioContextRef.current){
      const ctx = audioContextRef.current;

      audioContextRef.current = null;

      try{
        if(ctx.state !== "closed"){
          await ctx.close();
        }
      }catch(e){
        console.warn("AudioContext já estava encerrado ou em transição.")
      }
    }
    streamRef.current?.getTracks().forEach(track => track.stop());
    setIsCalling(false);
  };

  const toggleMuteAudio = (isMuted: boolean) => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
      });
    }
  };

  const togglePauseAudio = (isPaused: boolean) => {
    if (audioContextRef.current) {
      if (isPaused && audioContextRef.current.state === 'running') {
        audioContextRef.current.suspend();
      } else if (!isPaused && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
    }
  };

  return { startCall, stopCall, toggleMuteAudio, togglePauseAudio };
}