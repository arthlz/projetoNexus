import { useCallback, useState } from "react";
import { useAudioCapture } from "./useAudioCapture";
import { useAudioPlayer } from "./useAudioPlayer";
import { useWebSocket, type ServerMessage } from "./useWebSocket";

/**
 * Orquestrador fino: compõe useWebSocket + useAudioCapture + useAudioPlayer
 * e expõe apenas a interface de alto nível que os componentes de UI precisam.
 *
 * Cada responsabilidade vive em seu próprio hook:
 *  - useWebSocket   → conexão e protocolo WS
 *  - useAudioCapture → captura do microfone e emissão de frames PCM
 *  - useAudioPlayer  → fila de reprodução dos chunks MP3 da IA
 *
 * Este hook só gerencia estado de UI (status, transcript, errorMessage)
 * e a sequência de inicialização/encerramento.
 */

// ─── Tipos públicos do hook ───────────────────────────────────────────────────

export type CallStatus =
  | "idle"        // antes de qualquer ação
  | "connecting"  // aguardando WS abrir + permissão de microfone
  | "active"      // entrevista em andamento
  | "ai_speaking" // IA está respondendo (microfone pausado)
  | "ended"       // entrevista encerrada normalmente
  | "error";      // falha irrecuperável

export interface TranscriptEntry {
  speaker: "user" | "ai";
  text: string;
}

export interface UseVoiceCallReturn {
  /** Estado atual da chamada */
  status: CallStatus;
  /** Histórico de transcrições da entrevista */
  transcript: TranscriptEntry[];
  /** Mensagem de erro legível, se status === "error" */
  errorMessage: string | null;
  /** Inicia a entrevista: abre WS e começa captura de microfone */
  startInterview: () => Promise<void>;
  /** Encerra a entrevista e libera todos os recursos */
  endInterview: () => void;
}

interface Options {
  roomId: string;
  token: string;
}

export function useVoiceCall({ roomId, token }: Options): UseVoiceCallReturn {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ── Player de áudio ────────────────────────────────────────────────────────
  const { enqueueChunk, flush: flushAudio } = useAudioPlayer();

  // ── Handlers de mensagens do backend ──────────────────────────────────────
  const handleMessage = useCallback((msg: ServerMessage) => {
    switch (msg.type) {
      case "transcript":
        setTranscript((prev) => [...prev, { speaker: "ai", text: msg.text }]);
        break;
      case "done":
        // IA terminou de falar — devolve o microfone ao usuário
        setStatus("active");
        break;
      case "error":
        setErrorMessage(msg.text);
        // Erros não-fatais: mantém a entrevista ativa
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
  const { connect, disconnect, sendFrame, error: wsError } = useWebSocket({
    roomId,
    token,
    onMessage: handleMessage,
    onAudioChunk: handleAudioChunk,
  });

  // ── Captura de áudio ───────────────────────────────────────────────────────
  const { startCapture, stopCapture } = useAudioCapture(sendFrame);

  // ── API pública ────────────────────────────────────────────────────────────

  const startInterview = useCallback(async () => {
    setStatus("connecting");
    setTranscript([]);
    setErrorMessage(null);

    try {
      connect();
      await startCapture();
      setStatus("active");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao iniciar entrevista.";
      setErrorMessage(msg);
      setStatus("error");
    }
  }, [connect, startCapture]);

  const endInterview = useCallback(() => {
    stopCapture();
    disconnect();
    flushAudio();
    setStatus("ended");
  }, [stopCapture, disconnect, flushAudio]);

  // Repassa erro de WS para o estado de UI
  if (wsError && status !== "error") {
    setErrorMessage(wsError);
    setStatus("error");
  }

  return {
    status,
    transcript,
    errorMessage,
    startInterview,
    endInterview,
  };
}
