"use client"

import { Play, FileText, TrendingUp, ChevronRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { mockHistory } from "@/constants/mock-data"
import { Screen } from "@/types/interview"

interface DashboardScreenProps {
  navigateTo: (screen: Screen) => void
}

export const DashboardScreen = ({ navigateTo }: DashboardScreenProps) => {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Bem-vindo de volta!</h1>
        <p className="text-muted-foreground mt-1">Continue sua jornada para dominar entrevistas técnicas.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card
          className="cursor-pointer hover:shadow-lg transition-all hover:border-cyan-500/50 group"
          onClick={() => navigateTo("setup")}
        >
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mb-4">
                  <Play className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Iniciar Simulação</h3>
                <p className="text-muted-foreground text-sm">
                  Pratique com nossa IA avançada em cenários reais de entrevistas técnicas.
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-cyan-500 group-hover:translate-x-1 transition-all" />
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-lg transition-all hover:border-violet-500/50 group"
          onClick={() => navigateTo("resume")}
        >
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-4">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Testar ATS</h3>
                <p className="text-muted-foreground text-sm">
                  Analise seu currículo e otimize para sistemas de rastreamento ATS.
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-violet-500 group-hover:translate-x-1 transition-all" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-cyan-500" />
            Evolução de Desempenho
          </CardTitle>
          <CardDescription>Seu progresso nas últimas entrevistas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-end justify-between gap-4 px-4">
            {mockHistory.map((item) => (
              <div key={item.id} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className="w-full bg-gradient-to-t from-cyan-500 to-blue-500 rounded-t-lg transition-all hover:from-cyan-400 hover:to-blue-400"
                  style={{ height: `${item.score * 2}px` }}
                />
                <span className="text-xs text-muted-foreground">{item.company}</span>
                <span className="text-sm font-semibold text-foreground">{item.score}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4 text-center">
          <div className="text-3xl font-bold text-foreground">{mockHistory.length}</div>
          <div className="text-sm text-muted-foreground">Entrevistas</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <div className="text-3xl font-bold text-foreground">
            {Math.round(mockHistory.reduce((acc, item) => acc + item.score, 0) / mockHistory.length)}%
          </div>
          <div className="text-sm text-muted-foreground">Média Geral</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <div className="text-3xl font-bold text-cyan-500">{Math.max(...mockHistory.map((i) => i.score))}%</div>
          <div className="text-sm text-muted-foreground">Melhor Score</div>
        </CardContent></Card>
      </div>
    </div>
  )
}