"use client"

import { Brain, MessageSquare, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
// Lembre-se de verificar se o caminho do ScoreGauge e da tipagem estão corretos no seu projeto
import { ScoreGauge } from "@/components/ui/layout/score-gauge" 
import { InterviewHistory } from "@/types/interview"

interface ReportScreenProps {
  report: InterviewHistory
  onBackToHome: () => void
}

export const ReportScreen = ({ report, onBackToHome }: ReportScreenProps) => {
  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Círculo de Pontuação Geral */}
      <div className="flex flex-col items-center text-center space-y-4 mb-8">
        <ScoreGauge score={report.score} size="large" />
        <h2 className="text-2xl font-bold text-foreground">Pontuação Geral</h2>
      </div>

      <Card className="border-muted/50 shadow-lg">
        <CardContent className="p-8 space-y-8">
          
          {/* Barras de Progresso */}
          <div className="space-y-6">
            
            {/* Habilidades Técnicas */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-cyan-500">
                  <Brain className="w-5 h-5" />
                  <span className="font-medium text-foreground">Habilidades Técnicas</span>
                </div>
                <span className="font-bold text-foreground">{report.tech}%</span>
              </div>
              <Progress value={report.tech} className="h-3 bg-muted" />
            </div>

            {/* Comunicação */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-violet-500">
                  <MessageSquare className="w-5 h-5" />
                  <span className="font-medium text-foreground">Comunicação</span>
                </div>
                <span className="font-bold text-foreground">{report.comm}%</span>
              </div>
              <Progress value={report.comm} className="h-3 bg-muted" />
            </div>

            {/* Soft Skills */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-500">
                  <Users className="w-5 h-5" />
                  <span className="font-medium text-foreground">Soft Skills</span>
                </div>
                <span className="font-bold text-foreground">{report.soft}%</span>
              </div>
              <Progress value={report.soft} className="h-3 bg-muted" />
            </div>
            
          </div>

          {/* Feedback Detalhado */}
          <div className="p-6 bg-muted/30 rounded-xl border border-muted space-y-3">
            <h3 className="font-semibold text-foreground text-lg">Feedback Detalhado</h3>
            <p className="text-muted-foreground leading-relaxed">
              {report.feedback}
            </p>
          </div>

          {/* Botão Voltar */}
          <Button
            onClick={onBackToHome}
            className="w-full h-12 text-lg bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-xl transition-all"
          >
            Voltar ao Início
          </Button>

        </CardContent>
      </Card>
    </div>
  )
}