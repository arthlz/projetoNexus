import { useCallback, useRef } from "react";

export interface UseAudioPlayerReturn {
  /**
   * Enfileira um chunk de áudio MP3 para reprodução sequencial.
   * Inicia a reprodução automaticamente se a fila estiver vazia.
   */
  enqueueChunk: (mp3Chunk: ArrayBuffer) => void;
  /** Limpa a fila e interrompe qualquer reprodução em andamento */
  flush: () => void;
}

/**
 * useAudioPlayer
 *
 * Responsabilidade única: reproduzir chunks MP3 recebidos do backend
 * de forma sequencial, sem sobreposição, via Web Audio API.
 *
 * Não sabe nada de WebSocket, captura de microfone ou estado de UI.
 * Recebe ArrayBuffers MP3 e os toca em ordem de chegada.
 */
export function useAudioPlayer(): UseAudioPlayerReturn {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const queueRef = useRef<ArrayBuffer[]>([]);
  const isPlayingRef = useRef(false);

  const getAudioContext = useCallback((): AudioContext => {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  }, []);

  const playNext = useCallback(async () => {
    if (isPlayingRef.current || queueRef.current.length === 0) return;

    const chunk = queueRef.current.shift()!;
    isPlayingRef.current = true;

    try {
      const ctx = getAudioContext();

      // Retoma o contexto se estiver suspenso (política de autoplay dos browsers)
      if (ctx.state === "suspended") await ctx.resume();

      const audioBuffer = await ctx.decodeAudioData(chunk.slice(0));
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      source.onended = () => {
        isPlayingRef.current = false;
        playNext(); // processa o próximo da fila
      };

      source.start();
    } catch {
      // Chunk inválido ou contexto fechado — descarta e tenta o próximo
      isPlayingRef.current = false;
      playNext();
    }
  }, [getAudioContext]);

  const enqueueChunk = useCallback(
    (mp3Chunk: ArrayBuffer) => {
      queueRef.current.push(mp3Chunk);
      playNext();
    },
    [playNext]
  );

  const flush = useCallback(() => {
    queueRef.current = [];
    isPlayingRef.current = false;
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
  }, []);

  return { enqueueChunk, flush };
}
