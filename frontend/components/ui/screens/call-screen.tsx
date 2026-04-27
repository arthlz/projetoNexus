"use client"

import { useState, useEffect } from "react"
import { Mic, MicOff, Pause, Paperclip, Brain, Upload, FileText, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface CallScreenProps {
  isMuted: boolean
  setIsMuted: (val: boolean) => void
  isPaused: boolean
  setIsPaused: (val: boolean) => void
  onEnd: () => void
}

export const CallScreen = ({ isMuted, setIsMuted, isPaused, setIsPaused, onEnd }: CallScreenProps) => {
  // Estados locais para gerenciar o PDF e o Timer dentro da própria tela
  const [callTime, setCallTime] = useState(0)
  const [codeDialogOpen, setCodeDialogOpen] = useState(false)
  const [pdfCallName, setPdfCallName] = useState<string | null>(null)

  // Lógica do Timer restaurada
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (!isPaused) {
      interval = setInterval(() => {
        setCallTime((prev) => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isPaused])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between p-6">
        <div className="flex items-center gap-4">
          <span className="text-white text-2xl font-mono">{formatTime(callTime)}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          <span className="text-red-400 text-sm font-medium">
            {isPaused ? "Pausado" : "Gravando"}
          </span>
        </div>
      </div>

      {/* Center - AI Orb */}
      <div className="flex-1 flex items-center justify-center">
        <div className="relative">
          <div className="w-48 h-48 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 animate-pulse opacity-20 absolute -inset-4 blur-xl" />
          <div className="w-40 h-40 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center relative">
            <div className={`w-32 h-32 rounded-full bg-gradient-to-br from-violet-600 to-cyan-600 ${!isPaused ? 'animate-pulse' : ''}`} />
            <div className="absolute inset-0 flex items-center justify-center">
              <Brain className="w-16 h-16 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom control bar */}
      <div className="p-6">
        <div className="max-w-lg mx-auto bg-white/10 backdrop-blur-xl rounded-2xl p-4 flex items-center justify-center gap-4">
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMuted(!isMuted)}
            className={`w-12 h-12 rounded-full ${isMuted ? "bg-red-500/20 text-red-400" : "bg-white/10 text-white"} hover:bg-white/20`}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsPaused(!isPaused)}
            className={`w-12 h-12 rounded-full ${isPaused ? "bg-yellow-500/20 text-yellow-400" : "bg-white/10 text-white"} hover:bg-white/20`}
          >
            <Pause className="w-5 h-5" />
          </Button>

          {/* Modal de Upload de PDF */}
          <Dialog open={codeDialogOpen} onOpenChange={setCodeDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-12 h-12 rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <Paperclip className="w-5 h-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Enviar Código (PDF)</DialogTitle>
                <DialogDescription>Faça upload do seu código em formato PDF para compartilhar durante a entrevista.</DialogDescription>
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
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          setPdfCallName(null)
                        }}
                        className="ml-2 p-1 hover:bg-muted rounded-full"
                      >
                        <X className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">Clique para selecionar PDF</span>
                    </>
                  )}
                  <input
                    id="code-upload"
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setPdfCallName(file.name)
                      }
                    }}
                  />
                </label>
                <Button
                  onClick={() => setCodeDialogOpen(false)}
                  className="w-full bg-cyan-500 hover:bg-cyan-600 text-slate-900"
                  disabled={!pdfCallName}
                >
                  Enviar
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            onClick={onEnd}
            className="px-6 h-12 rounded-full bg-red-500 hover:bg-red-600 text-white font-medium"
          >
            Encerrar
          </Button>
        </div>
      </div>
    </div>
  )
}