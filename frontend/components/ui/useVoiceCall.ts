/**
 * hooks/useVoiceCall.ts
 * ─────────────────────
 * Hook que gerencia toda a comunicação de voz com o back-end via WebSocket.
 *
 * MUDANÇAS em relação à versão original:
 *
 * 1. ÁUDIO BINÁRIO DA IA
 *    O back-end agora envia bytes MP3 diretamente (Deepgram TTS).
 *    O handler de mensagens binárias já existia mas estava comentado —
 *    agora está ativo e reproduz o áudio automaticamente.
 *    Utilizamos AudioContext.decodeAudioData em vez de new Audio(url)
 *    para garantir compatibilidade cross-browser e controle de sobreposição
 *    (cancela o áudio anterior se o candidato falar durante a resposta).
 *
 * 2. ESTADO isAISpeaking
 *    Exposto para que a CallScreen anime o orb enquanto a IA fala,
 *    e bloqueie o envio de frames (evita capturar o áudio da própria IA).
 *
 * 3. PAUSA REAL DO MICROFONE
 *    togglePauseAudio suspende o AudioContext, o que interrompe tanto o
 *    envio de frames quanto a reprodução do áudio da IA.
 *
 * 4. LIMPEZA DE RECURSOS
 *    stopCall() cancela corretamente a fonte de áudio ativa (aiSourceNode)
 *    antes de fechar o contexto, evitando erros de "already closed".
 */

import { useState, useRef, useCallback } from 'react';

const WS_BASE = process.env.NEXT_PUBLIC_API_WS_URL ?? 'ws://localhost:8000';

export function useVoiceCall(roomId: string | number | null) {
  const [isCalling, setIsCalling]       = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);

  const wsRef           = useRef<WebSocket | null>(null);
  const streamRef       = useRef<MediaStream | null>(null);
  const audioCtxRef     = useRef<AudioContext | null>(null);
  const processorRef    = useRef<ScriptProcessorNode | null>(null);
  const aiSourceRef     = useRef<AudioBufferSourceNode | null>(null);
  // Flag interna: bloqueia envio de frames enquanto a IA fala
  const aiSpeakingRef   = useRef(false);

  // ── Reprodução do áudio da IA ─────────────────────────────────────────────

  const playAIAudio = useCallback(async (data: ArrayBuffer) => {
    const ctx = audioCtxRef.current;
    if (!ctx || ctx.state === 'closed') return;

    // Cancela qualquer fala anterior da IA
    if (aiSourceRef.current) {
      try { aiSourceRef.current.stop(); } catch (_) {}
      aiSourceRef.current = null;
    }

    try {
      const buffer = await ctx.decodeAudioData(data.slice(0)); // cópia para evitar detach
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);

      aiSpeakingRef.current = true;
      setIsAISpeaking(true);

      source.onended = () => {
        aiSpeakingRef.current = false;
        setIsAISpeaking(false);
        aiSourceRef.current = null;
      };

      source.start();
      aiSourceRef.current = source;
    } catch (err) {
      console.error('Erro ao decodificar áudio da IA:', err);
      aiSpeakingRef.current = false;
      setIsAISpeaking(false);
    }
  }, []);

  // ── Conexão WebSocket ─────────────────────────────────────────────────────

  const connectWS = useCallback((id: string | number) => {
    const url = `${WS_BASE}/room/${id}/entrevista`;
    const ws  = new WebSocket(url);
    wsRef.current = ws;

    ws.onmessage = async (event) => {
      // Mensagem de controle JSON
      if (typeof event.data === 'string') {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'error') {
            console.error('[Nexus WS]', msg.text);
          }
          // "transcript" e "done" podem ser usados pela UI via estado externo
        } catch (_) {}
        return;
      }

      // Bytes binários = MP3 da resposta da IA
      if (event.data instanceof Blob) {
        const ab = await event.data.arrayBuffer();
        await playAIAudio(ab);
      } else if (event.data instanceof ArrayBuffer) {
        await playAIAudio(event.data);
      }
    };

    ws.onerror = (e) => console.error('[Nexus WS] erro:', e);
    ws.onclose = (e) => console.log('[Nexus WS] fechado:', e.code, e.reason);
  }, [playAIAudio]);

  // ── Início da chamada ─────────────────────────────────────────────────────

  const startCall = useCallback(async () => {
    if (!roomId) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // AudioContext a 16 kHz — exigido pelo VAD do back-end
      const ctx = new AudioContext({ sampleRate: 16000 });
      audioCtxRef.current = ctx;

      const source    = ctx.createMediaStreamSource(stream);
      const processor = ctx.createScriptProcessor(8192, 1, 1);
      processorRef.current = processor;

      let overflow = new Int16Array(0);

      processor.onaudioprocess = (e) => {
        // Não envia frames enquanto a IA está falando
        if (aiSpeakingRef.current) return;
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        const float32 = e.inputBuffer.getChannelData(0);
        const int16   = new Int16Array(float32.length);

        for (let i = 0; i < float32.length; i++) {
          const s = Math.max(-1, Math.min(1, float32[i]));
          int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        // Acumula e fatia em chunks de 480 amostras = 960 bytes (30 ms)
        const combined = new Int16Array(overflow.length + int16.length);
        combined.set(overflow);
        combined.set(int16, overflow.length);

        let offset = 0;
        while (offset + 480 <= combined.length) {
          wsRef.current.send(combined.slice(offset, offset + 480).buffer);
          offset += 480;
        }
        overflow = combined.slice(offset);
      };

      source.connect(processor);
      processor.connect(ctx.destination);

      connectWS(roomId);
      setIsCalling(true);
    } catch (err) {
      console.error('Erro ao iniciar chamada:', err);
    }
  }, [roomId, connectWS]);

  // ── Encerramento ──────────────────────────────────────────────────────────

  const stopCall = useCallback(async () => {
    // Para o áudio da IA se estiver tocando
    if (aiSourceRef.current) {
      try { aiSourceRef.current.stop(); } catch (_) {}
      aiSourceRef.current = null;
    }

    // Desconecta o processor antes de fechar o contexto
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (audioCtxRef.current) {
      const ctx = audioCtxRef.current;
      audioCtxRef.current = null;
      try {
        if (ctx.state !== 'closed') await ctx.close();
      } catch (_) {}
    }

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    wsRef.current?.close();
    wsRef.current = null;

    aiSpeakingRef.current = false;
    setIsAISpeaking(false);
    setIsCalling(false);
  }, []);

  // ── Controles de microfone ────────────────────────────────────────────────

  const toggleMuteAudio = useCallback((muted: boolean) => {
    streamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !muted;
    });
  }, []);

  const togglePauseAudio = useCallback((paused: boolean) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    if (paused && ctx.state === 'running')   ctx.suspend();
    if (!paused && ctx.state === 'suspended') ctx.resume();
  }, []);

  return {
    isCalling,
    isAISpeaking,
    wsRef,
    startCall,
    stopCall,
    toggleMuteAudio,
    togglePauseAudio,
  };
}