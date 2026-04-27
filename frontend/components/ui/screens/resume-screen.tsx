"use client"

import { FileText, Upload, X, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScoreGauge } from "@/components/ui/layout/score-gauge"
import { Screen } from "@/types/interview"

interface ResumeScreenProps {
  currentScreen: Screen
  pdfATSName: string | null
  setPdfATSName: (name: string | null) => void
  navigateTo: (screen: Screen) => void
}

export const ResumeScreen = ({ currentScreen, pdfATSName, setPdfATSName, navigateTo }: ResumeScreenProps) => {
  // Tela de Resultados do ATS
  if (currentScreen === "resume-results") {
    return (
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Resultado da Análise ATS</h1>
          <p className="text-muted-foreground mt-1">Veja como seu currículo se comporta.</p>
        </div>
        <Card>
          <CardContent className="p-8">
            <div className="flex flex-col items-center text-center mb-8">
              <ScoreGauge score={82} />
              <h3 className="text-xl font-semibold text-foreground mt-4">Compatibilidade ATS</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-semibold text-green-600 flex items-center gap-2"><Target className="w-5 h-5" /> Presentes</h4>
                <div className="flex flex-wrap gap-2">
                  {["React", "TypeScript", "Git"].map(k => (
                    <span key={k} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">{k}</span>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold text-amber-600 flex items-center gap-2"><Target className="w-5 h-5" /> Ausentes</h4>
                <div className="flex flex-wrap gap-2">
                  {["Docker", "AWS"].map(k => (
                    <span key={k} className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm">{k}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <Button variant="outline" onClick={() => { setPdfATSName(null); navigateTo("resume"); }} className="flex-1">Refazer</Button>
              <Button onClick={() => navigateTo("setup")} className="flex-1 bg-cyan-500 text-slate-900">Ir para Entrevista</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Tela de Upload Inicial
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Análise de Currículo ATS</h1>
        <p className="text-muted-foreground mt-1">Verifique a compatibilidade do seu currículo.</p>
      </div>
      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="job-description">Descrição da Vaga</Label>
            <Textarea id="job-description" placeholder="Cole a descrição aqui..." className="min-h-32" />
          </div>
          <div className="space-y-2">
            <Label>Seu Currículo (PDF)</Label>
            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-muted-foreground/30 rounded-xl cursor-pointer hover:bg-muted/50 transition-colors">
              {pdfATSName ? (
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-cyan-500" />
                  <span className="font-medium">{pdfATSName}</span>
                  <X className="w-5 h-5 text-red-500 cursor-pointer" onClick={(e) => { e.preventDefault(); setPdfATSName(null); }} />
                </div>
              ) : (
                <div className="text-center">
                  <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">Clique para subir o PDF</p>
                </div>
              )}
              <input type="file" accept=".pdf" className="hidden" onChange={(e) => setPdfATSName(e.target.files?.[0]?.name || null)} />
            </label>
          </div>
          <Button onClick={() => navigateTo("resume-results")} className="w-full bg-cyan-500 text-slate-900" disabled={!pdfATSName}>Analisar</Button>
        </CardContent>
      </Card>
    </div>
  )
}