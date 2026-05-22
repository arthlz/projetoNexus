
"use client"

import { useState, useEffect } from "react"
import { Mic, MicOff, Pause, Paperclip, Brain, Upload, FileText, X, Loader2 } from "lucide-react"
import { Button }   from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogDescription,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { useVoiceCall } from "@/hooks/useVoiceCall"

interface CallScreenProps {
  roomId:       string
  isMuted:      boolean
  setIsMuted:   (v: boolean) => void
  isPaused:     boolean
  setIsPaused:  (v: boolean) => void
  onEnd:        () => void
  isEndingCall: boolean
}

export const CallScreen = ({
  roomId, isMuted, setIsMuted, isPaused, setIsPaused, onEnd, isEndingCall,
}: CallScreenProps) => {
  const { startCall, stopCall, toggleMuteAudio, togglePauseAudio, isAISpeaking } =
    useVoiceCall(roomId)

  const [callTime,        setCallTime]        = useState(0)
  const [codeDialogOpen,  setCodeDialogOpen]  = useState(false)
  const [pdfCallName,     setPdfCallName]     = useState<string | null>(null)

  // Inicia a chamada ao montar o componente
  useEffect(() => {
    if (roomId) startCall()
    return () => { stopCall() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId])

  // Sincroniza mute/pause com o hook
  useEffect(() => { toggleMuteAudio(isMuted)   }, [isMuted,  toggleMuteAudio])
  useEffect(() => { togglePauseAudio(isPaused)  }, [isPaused, togglePauseAudio])

  // Timer
  useEffect(() => {
    if (isPaused) return
    const id = setInterval(() => setCallTime((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [isPaused])

  const handleEndCall = () => {
    stopCall()
    onEnd()
  }

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex flex-col">

      {/* Top bar */}
      <div className="flex items-center justify-between p-6">
        <span className="text-white text-2xl font-mono">{formatTime(callTime)}</span>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isAISpeaking ? "bg-cyan-400" : "bg-red-500 animate-pulse"}`} />
          <span className={`text-sm font-medium ${isAISpeaking ? "text-cyan-400" : "text-red-400"}`}>
            {isEndingCall ? "Gerando feedback…" : isAISpeaking ? "IA falando" : isPaused ? "Pausado" : "Gravando"}
          </span>
        </div>
      </div>

      {/* Orb central */}
      <div className="flex-1 flex items-center justify-center">
        <div className="relative">
          <div className={`w-48 h-48 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 absolute -inset-4 blur-xl
            ${isAISpeaking ? "opacity-40 animate-pulse" : "opacity-20"}`} />
          <div className="w-40 h-40 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center relative">
            <div className={`w-32 h-32 rounded-full bg-gradient-to-br from-violet-600 to-cyan-600
              ${isAISpeaking ? "animate-pulse" : !isPaused ? "animate-[pulse_3s_ease-in-out_infinite]" : ""}`} />
            <div className="absolute inset-0 flex items-center justify-center">
              <Brain className="w-16 h-16 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Barra de controles */}
      <div className="p-6">
        <div className="max-w-lg mx-auto bg-white/10 backdrop-blur-xl rounded-2xl p-4 flex items-center justify-center gap-4">

          {/* Mute */}
          <Button
            variant="ghost" size="icon"
            onClick={() => setIsMuted(!isMuted)}
            disabled={isAISpeaking || isEndingCall}
            className={`w-12 h-12 rounded-full
              ${isMuted || isAISpeaking ? "bg-red-500/20 text-red-400" : "bg-white/10 text-white"}
              hover:bg-white/20 disabled:opacity-40`}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>

          {/* Pause */}
          <Button
            variant="ghost" size="icon"
            onClick={() => setIsPaused(!isPaused)}
            disabled={isEndingCall}
            className={`w-12 h-12 rounded-full
              ${isPaused ? "bg-yellow-500/20 text-yellow-400" : "bg-white/10 text-white"}
              hover:bg-white/20 disabled:opacity-40`}
          >
            <Pause className="w-5 h-5" />
          </Button>

          {/* Upload de PDF */}
          <Dialog open={codeDialogOpen} onOpenChange={setCodeDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost" size="icon"
                disabled={isEndingCall}
                className="w-12 h-12 rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-40"
              >
                <Paperclip className="w-5 h-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Enviar Código (PDF)</DialogTitle>
                <DialogDescription>
                  Faça upload do seu código em PDF para compartilhar durante a entrevista.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <label
                  htmlFor="code-upload"
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-muted-foreground/30 rounded-xl cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  {pdfCallName ? (
                    <div className="flex items-center gap-2 text-foreground">
                      <FileText className="w-6 h-6 text-cyan-500" />
                      <span className="font-medium">{pdfCallName}</span>
                      <button onClick={(e) => { e.preventDefault(); setPdfCallName(null) }}
                        className="ml-2 p-1 hover:bg-muted rounded-full">
                        <X className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">Clique para selecionar PDF</span>
                    </>
                  )}
                  <input id="code-upload" type="file" accept=".pdf" className="hidden"
                    onChange={(e) => setPdfCallName(e.target.files?.[0]?.name ?? null)} />
                </label>
                <Button onClick={() => setCodeDialogOpen(false)}
                  className="w-full bg-cyan-500 hover:bg-cyan-600 text-slate-900"
                  disabled={!pdfCallName}>
                  Enviar
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Encerrar */}
          <Button
            onClick={handleEndCall}
            disabled={isEndingCall}
            className="px-6 h-12 rounded-full bg-red-500 hover:bg-red-600 text-white font-medium disabled:opacity-60"
          >
            {isEndingCall
              ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Processando…</>
              : "Encerrar"}
          </Button>

        </div>
      </div>
    </div>
  )
}
