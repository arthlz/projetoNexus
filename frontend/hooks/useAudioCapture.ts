import { useCallback, useRef } from "react";

// ─── Constantes do protocolo Nexus ───────────────────────────────────────────
// Backend espera frames PCM 16-bit mono, 16 kHz, 960 amostras = 1920 bytes
const SAMPLE_RATE = 16_000;
const FRAME_SIZE = 960; // amostras por frame (30 ms @ 16 kHz)

export interface UseAudioCaptureReturn {
  /** Inicia a captura do microfone e começa a emitir frames via onFrame */
  startCapture: () => Promise<void>;
  /** Para a captura e libera o microfone */
  stopCapture: () => void;
}

export function useAudioCapture(
  onFrame: (pcmFrame: ArrayBuffer) => void
): UseAudioCaptureReturn {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const stopCapture = useCallback(() => {
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close();

    processorRef.current = null;
    sourceRef.current = null;
    streamRef.current = null;
    audioCtxRef.current = null;
  }, []);

  const startCapture = useCallback(async () => {
    // Garante limpeza de captura anterior, se houver
    stopCapture();

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { sampleRate: SAMPLE_RATE, channelCount: 1, echoCancellation: true },
    });
    streamRef.current = stream;

    const ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
    audioCtxRef.current = ctx;

    const source = ctx.createMediaStreamSource(stream);
    sourceRef.current = source;

    // (AudioWorklet seria o ideal, mas ScriptProcessor funciona em todos os
    //  browsers suportados pelo Next.js sem necessidade de worklet separado)
    const processor = ctx.createScriptProcessor(FRAME_SIZE, 1, 1);
    processorRef.current = processor;

    processor.onaudioprocess = (e: AudioProcessingEvent) => {
      const float32 = e.inputBuffer.getChannelData(0);

      // Converte Float32 [-1, 1] → Int16 PCM
      const int16 = new Int16Array(float32.length);
      for (let i = 0; i < float32.length; i++) {
        const clamped = Math.max(-1, Math.min(1, float32[i]));
        int16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
      }

      onFrame(int16.buffer);
    };

    source.connect(processor);
    processor.connect(ctx.destination);
  }, [onFrame, stopCapture]);

  return { startCapture, stopCapture };
}
