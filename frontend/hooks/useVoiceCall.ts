import { useCallback, useState } from "react";
import { useAudioCapture } from "./useAudioCapture";
import { useAudioPlayer } from "./useAudioPlayer";
import { useWebSocket, type ServerMessage } from "./useWebSocket";

/**
 * useVoiceCall
 *
 * Orquestrador de alto nível: compõe useWebSocket + useAudioCapture + useAudioPlayer
 * e expõe a interface que o CallScreen precisa.
 *
 * Contrato da API pública:
 *  - startCall()           → abre WS + inicia captura de microfone
 *  - stopCall()            → encerra tudo e libera recursos
 *  - toggleMuteAudio(bool) → silencia/desmuta o microfone sem parar a captura
 *  - togglePauseAudio(bool)→ pausa/retoma o envio de frames ao backend
 *  - isAISpeaking          → true enquanto a IA está respondendo em áudio
 */

// ─── Tipos internos ───────────────────────────────────────────────────────────

type CallStatus =
  | "idle"
  | "connecting"
  | "active"
  | "ai_speaking"
  | "ended"
  | "error";

export interface UseVoiceCallReturn {
  /** Inicia a chamada: abre WS e começa captura de microfone */
  startCall: () => Promise<void>;
  /** Encerra a chamada e libera todos os recursos */
  stopCall: () => void;
  /**
   * Controla o mute do microfone.
   * true  → envia silêncio ao backend (stream mantido ativo)
   * false → retoma envio do áudio real
   */
  toggleMuteAudio: (muted: boolean) => void;
  /**
   * Controla a pausa do envio de frames.
   * true  → para completamente o envio de frames (microfone continua capturando)
   * false → retoma o envio
   */
  togglePauseAudio: (paused: boolean) => void;
  /** true enquanto a IA está reproduzindo áudio de resposta */
  isAISpeaking: boolean;
}

export function useVoiceCall(roomId: string): UseVoiceCallReturn {
  const [status, setStatus] = useState<CallStatus>("idle");

  // Token fixo por enquanto — substituir por prop ou contexto de autenticação
  const token = "";

  // ── Player de áudio ────────────────────────────────────────────────────────
  const { enqueueChunk, flush: flushAudio } = useAudioPlayer();

  // ── Handlers de mensagens do backend ──────────────────────────────────────
  const handleMessage = useCallback((msg: ServerMessage) => {
    switch (msg.type) {
      case "transcript":
        // Disponível para extensão futura (ex: exibir transcrição na UI)
        break;
      case "done":
        // IA terminou de falar — volta ao estado ativo
        setStatus("active");
        break;
      case "error":
        // Erros não-fatais: loga mas mantém a chamada ativa
        console.error("[useVoiceCall] erro do backend:", msg.text);
        break;
    }
  }, []);

  const handleAudioChunk = useCallback(
    (chunk: ArrayBuffer) => {
      setStatus("ai_speaking");
      enqueueChunk(chunk);
    },
    [enqueueChunk]
  );

  // ── WebSocket ──────────────────────────────────────────────────────────────
  const { connect, disconnect, sendFrame } = useWebSocket({
    roomId,
    token,
    onMessage: handleMessage,
    onAudioChunk: handleAudioChunk,
  });

  // ── Captura de áudio ───────────────────────────────────────────────────────
  const { startCapture, stopCapture, setMuted, setPaused } =
    useAudioCapture(sendFrame);

  // ── API pública ────────────────────────────────────────────────────────────

  const startCall = useCallback(async () => {
    if (status === "connecting" || status === "active") return;

    setStatus("connecting");
    try {
      connect();
      await startCapture();
      setStatus("active");
    } catch (err) {
      console.error("[useVoiceCall] falha ao iniciar:", err);
      setStatus("error");
    }
  }, [status, connect, startCapture]);

  const stopCall = useCallback(() => {
    stopCapture();
    disconnect();
    flushAudio();
    setStatus("ended");
  }, [stopCapture, disconnect, flushAudio]);

  const toggleMuteAudio  = useCallback((muted: boolean)  => setMuted(muted),   [setMuted]);
  const togglePauseAudio = useCallback((paused: boolean) => setPaused(paused), [setPaused]);

  return {
    startCall,
    stopCall,
    toggleMuteAudio,
    togglePauseAudio,
    isAISpeaking: status === "ai_speaking",
  };
}