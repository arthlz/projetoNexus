import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

//Tipos do protocolo Nexus

export type WsStatus = "idle" | "connecting" | "open" | "closed" | "error";

/** Mensagens JSON que chegam do backend via WebSocket */
export type ServerMessage =
  | { type: "transcript"; text: string }
  | { type: "done" }
  | { type: "error"; text: string };

export interface UseWebSocketReturn {
  /** Estado atual da conexão */
  status: WsStatus;
  /** Envia frames PCM binários para o backend (960 bytes, 16-bit, 16 kHz) */
  sendFrame: (pcmFrame: ArrayBuffer) => void;
  /** Abre a conexão WS para a sala de entrevista */
  connect: () => void;
  /** Fecha a conexão e limpa recursos */
  disconnect: () => void;
  /** Último erro recebido, se houver */
  error: string | null;
}

interface Options {
  roomId: string;
  token: string;
  /** Callback chamado a cada mensagem JSON do backend */
  onMessage: (msg: ServerMessage) => void;
  /** Callback chamado a cada chunk MP3 recebido (resposta de áudio da IA) */
  onAudioChunk: (chunk: ArrayBuffer) => void;
}

const WS_BASE_URL =
  process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000";

/**
 * useWebSocket
 *
 * Responsabilidade única: gerenciar o ciclo de vida da conexão WebSocket
 * com o backend do Nexus (/room/{id}/entrevista).
 *
 * Não sabe nada de captura de áudio, reprodução ou estado de UI —
 * apenas abre/fecha a conexão, envia frames binários e despacha mensagens
 * JSON recebidas para os callbacks fornecidos.
 */
export function useWebSocket({
  roomId,
  token,
  onMessage,
  onAudioChunk,
}: Options): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<WsStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  // Refs estáveis para os callbacks — evita stale closures nos handlers do WS
  const onMessageRef = useRef(onMessage);
  const onAudioChunkRef = useRef(onAudioChunk);
  useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);
  useEffect(() => { onAudioChunkRef.current = onAudioChunk; }, [onAudioChunk]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus("closed");
  }, []);

  const connect = useCallback(async () => {
    // Evita abrir conexão duplicada
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setStatus("connecting");
    setError(null);

    try {
      // 1. Busca a sessão do usuário no Supabase
      const { data: { session } } = await supabase.auth.getSession();
      
      // 2. Extrai o token de acesso (JWT) ou usa o fallback caso dê erro
      const authToken = session?.access_token || token;

      // 3. Monta a URL injetando o token de autenticação
      const url = `${WS_BASE_URL}/room/${roomId}/entrevista?token=${authToken}`;
      const ws = new WebSocket(url);

      ws.onopen = () => setStatus("open");

      ws.onmessage = (event: MessageEvent) => {
        // Áudio MP3 chega como Blob/ArrayBuffer; JSON chega como string
        if (event.data instanceof Blob) {
          event.data.arrayBuffer().then((buf) => onAudioChunkRef.current(buf));
        } else if (event.data instanceof ArrayBuffer) {
          onAudioChunkRef.current(event.data);
        } else if (typeof event.data === "string") {
          try {
            const msg = JSON.parse(event.data) as ServerMessage;
            onMessageRef.current(msg);
          } catch {
            // mensagem mal-formada — ignorar silenciosamente
          }
        }
      };

      ws.onerror = () => {
        setStatus("error");
        setError("Erro na conexão com o servidor de entrevistas.");
      };

      ws.onclose = () => {
        setStatus("closed");
        wsRef.current = null;
      };

      wsRef.current = ws;
    } catch (err) {
      console.error("Erro ao obter sessão para o WebSocket:", err);
      setStatus("error");
      setError("Falha de autenticação ao conectar na sala.");
    }
  }, [roomId, token]);

  const sendFrame = useCallback((pcmFrame: ArrayBuffer) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(pcmFrame);
    }
  }, []);

  // Limpa a conexão quando o hook é desmontado
  useEffect(() => () => { wsRef.current?.close(); }, []);

  return { status, sendFrame, connect, disconnect, error };
}
