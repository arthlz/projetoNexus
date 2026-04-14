"use client"

import { useState, useEffect, useRef } from "react"
import {
  Home,
  Play,
  FileText,
  History,
  User,
  LogOut,
  Mic,
  MicOff,
  Pause,
  Paperclip,
  Upload,
  X,
  TrendingUp,
  Target,
  Brain,
  MessageSquare,
  Users,
  ChevronRight,
  Sparkles,
  ArrowLeft,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"

type Screen = "login" | "dashboard" | "setup" | "resume" | "resume-results" | "history" | "report" | "profile" | "call"

interface InterviewHistory {
  id: number
  role: string
  company: string
  score: number
  tech: number
  comm: number
  soft: number
  feedback: string
  date: string
}

const mockHistory: InterviewHistory[] = [
  {
    id: 1,
    role: "Front-end Sênior",
    company: "Nubank",
    score: 92,
    tech: 95,
    comm: 90,
    soft: 85,
    feedback: "Excelente domínio de React e arquitetura de componentes. Demonstrou conhecimento sólido em performance e otimização. Melhore o conhecimento em System Design para entrevistas de nível sênior.",
    date: "10 Out 2026",
  },
  {
    id: 2,
    role: "Back-end Pleno",
    company: "Itaú",
    score: 78,
    tech: 80,
    comm: 70,
    soft: 85,
    feedback: "Bom conhecimento em APIs REST e bancos de dados. Revisar conceitos de microsserviços e mensageria (Kafka, RabbitMQ). Comunicação pode ser mais assertiva.",
    date: "05 Out 2026",
  },
  {
    id: 3,
    role: "Fullstack Júnior",
    company: "Mercado Livre",
    score: 65,
    tech: 60,
    comm: 70,
    soft: 70,
    feedback: "Fundamentos básicos estão presentes. Focar em lógica de programação e algoritmos. Pratique mais problemas de código e estruturas de dados.",
    date: "01 Out 2026",
  },
]

const defaultReport: InterviewHistory = {
  id: 0,
  role: "Entrevista Técnica",
  company: "Empresa",
  score: 85,
  tech: 88,
  comm: 82,
  soft: 85,
  feedback: "Boa performance geral na entrevista. Continue praticando para aprimorar suas habilidades técnicas e de comunicação.",
  date: new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }),
}

export default function NexusApp() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("login")
  const [pdfATSName, setPdfATSName] = useState<string | null>(null)
  const [pdfCallName, setPdfCallName] = useState<string | null>(null)
  const [selectedReport, setSelectedReport] = useState<InterviewHistory | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [callTime, setCallTime] = useState(0)
  const [codeDialogOpen, setCodeDialogOpen] = useState(false)
  const [language, setLanguage] = useState<"pt" | "en">("pt")

  // Timer for call screen
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (currentScreen === "call" && !isPaused) {
      interval = setInterval(() => {
        setCallTime((prev) => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [currentScreen, isPaused])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const handleHistoryClick = (item: InterviewHistory) => {
    setSelectedReport(item)
    setCurrentScreen("report")
  }

  const handleEndCall = () => {
    setPdfCallName(null)
    setCallTime(0)
    setSelectedReport(defaultReport)
    setCurrentScreen("report")
  }

  const navigateTo = (screen: Screen) => {
    if (screen === "login") {
      setSelectedReport(null)
    }
    setCurrentScreen(screen)
  }

  // Sidebar Component
  const Sidebar = () => (
    <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col h-screen">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-white">Nexus</h1>
            <p className="text-xs text-sidebar-foreground/70">Área do Desenvolvedor</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        <SidebarLink
          icon={<Home className="w-5 h-5" />}
          label="Início"
          active={currentScreen === "dashboard"}
          onClick={() => navigateTo("dashboard")}
        />
        <SidebarLink
          icon={<Play className="w-5 h-5" />}
          label="Nova Entrevista"
          active={currentScreen === "setup"}
          onClick={() => navigateTo("setup")}
        />
        <SidebarLink
          icon={<FileText className="w-5 h-5" />}
          label="Análise de Currículo"
          active={currentScreen === "resume" || currentScreen === "resume-results"}
          onClick={() => navigateTo("resume")}
        />
        <SidebarLink
          icon={<History className="w-5 h-5" />}
          label="Histórico"
          active={currentScreen === "history"}
          onClick={() => navigateTo("history")}
        />
        <SidebarLink
          icon={<User className="w-5 h-5" />}
          label="Meu Perfil"
          active={currentScreen === "profile"}
          onClick={() => navigateTo("profile")}
        />
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <button
          onClick={() => navigateTo("login")}
          className="flex items-center gap-3 px-3 py-2 w-full text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Sair</span>
        </button>
      </div>
    </aside>
  )

  const SidebarLink = ({
    icon,
    label,
    active,
    onClick,
  }: {
    icon: React.ReactNode
    label: string
    active: boolean
    onClick: () => void
  }) => (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 w-full rounded-lg transition-colors ${
        active
          ? "bg-sidebar-accent text-cyan-400"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white"
      }`}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </button>
  )

  // Layout wrapper for internal pages
  const Layout = ({ children }: { children: React.ReactNode }) => (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  )

  // Score Gauge Component
  const ScoreGauge = ({ score, size = "large" }: { score: number; size?: "large" | "small" }) => {
    const radius = size === "large" ? 80 : 50
    const strokeWidth = size === "large" ? 12 : 8
    const circumference = 2 * Math.PI * radius
    const progress = (score / 100) * circumference
    const color = score >= 80 ? "#22c55e" : score >= 60 ? "#eab308" : "#ef4444"

    return (
      <div className="relative flex items-center justify-center">
        <svg
          width={radius * 2 + strokeWidth * 2}
          height={radius * 2 + strokeWidth * 2}
          className="transform -rotate-90"
        >
          <circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-muted"
          />
          <circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className={`font-bold ${size === "large" ? "text-4xl" : "text-2xl"} text-foreground`}>{score}</span>
          <span className="text-muted-foreground text-sm">/100</span>
        </div>
      </div>
    )
  }

  // LOGIN SCREEN
  if (currentScreen === "login") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 p-8 shadow-2xl">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Nexus</h1>
              <p className="text-slate-300">Domine sua próxima entrevista.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-200">
                  E-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-200">
                  Senha
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                />
              </div>
              <Button
                onClick={() => navigateTo("dashboard")}
                className="w-full bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-semibold h-11"
              >
                Entrar
              </Button>
            </div>

            <p className="text-center text-slate-400 text-sm mt-6">
              Não tem conta?{" "}
              <button className="text-cyan-400 hover:text-cyan-300 font-medium">Cadastre-se</button>
            </p>
          </div>
        </div>
      </div>
    )
  }

  // CALL SCREEN
  if (currentScreen === "call") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center gap-4">
            <span className="text-white text-2xl font-mono">{formatTime(callTime)}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-red-400 text-sm font-medium">Gravando</span>
          </div>
        </div>

        {/* Center - AI Orb */}
        <div className="flex-1 flex items-center justify-center">
          <div className="relative">
            <div className="w-48 h-48 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 animate-pulse opacity-20 absolute -inset-4 blur-xl" />
            <div className="w-40 h-40 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center relative">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-violet-600 to-cyan-600 animate-pulse" />
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
              onClick={handleEndCall}
              className="px-6 h-12 rounded-full bg-red-500 hover:bg-red-600 text-white font-medium"
            >
              Encerrar
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // DASHBOARD SCREEN
  if (currentScreen === "dashboard") {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Bem-vindo de volta!</h1>
            <p className="text-muted-foreground mt-1">Continue sua jornada para dominar entrevistas técnicas.</p>
          </div>

          {/* Hero Cards */}
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

          {/* Performance Chart */}
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
                {mockHistory.map((item, index) => (
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

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-foreground">{mockHistory.length}</div>
                <div className="text-sm text-muted-foreground">Entrevistas</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-foreground">
                  {Math.round(mockHistory.reduce((acc, item) => acc + item.score, 0) / mockHistory.length)}%
                </div>
                <div className="text-sm text-muted-foreground">Média Geral</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-cyan-500">{Math.max(...mockHistory.map((i) => i.score))}%</div>
                <div className="text-sm text-muted-foreground">Melhor Score</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    )
  }

  // RESUME (ATS) SCREEN
  if (currentScreen === "resume") {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Análise de Currículo ATS</h1>
            <p className="text-muted-foreground mt-1">
              Verifique a compatibilidade do seu currículo com sistemas de rastreamento.
            </p>
          </div>

          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="job-description">Descrição da Vaga</Label>
                <Textarea
                  id="job-description"
                  placeholder="Cole aqui a descrição da vaga para análise comparativa..."
                  className="min-h-32"
                />
              </div>

              <div className="space-y-2">
                <Label>Seu Currículo (PDF)</Label>
                <label
                  htmlFor="resume-upload"
                  className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-muted-foreground/30 rounded-xl cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  {pdfATSName ? (
                    <div className="flex items-center gap-3 text-foreground">
                      <FileText className="w-8 h-8 text-cyan-500" />
                      <div className="text-left">
                        <span className="font-medium block">{pdfATSName}</span>
                        <span className="text-sm text-muted-foreground">Clique para trocar</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          setPdfATSName(null)
                        }}
                        className="ml-4 p-2 hover:bg-muted rounded-full"
                      >
                        <X className="w-5 h-5 text-muted-foreground" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-muted-foreground mb-3" />
                      <span className="text-muted-foreground font-medium">Clique ou arraste seu currículo</span>
                      <span className="text-sm text-muted-foreground/70">Formato PDF, máx. 5MB</span>
                    </>
                  )}
                  <input
                    id="resume-upload"
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setPdfATSName(file.name)
                      }
                    }}
                  />
                </label>
              </div>

              <Button
                onClick={() => navigateTo("resume-results")}
                className="w-full bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-semibold h-11"
                disabled={!pdfATSName}
              >
                Analisar Currículo
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    )
  }

  // RESUME RESULTS SCREEN
  if (currentScreen === "resume-results") {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Resultado da Análise ATS</h1>
            <p className="text-muted-foreground mt-1">Veja como seu currículo se comporta em sistemas de rastreamento.</p>
          </div>

          <Card>
            <CardContent className="p-8">
              <div className="flex flex-col items-center text-center mb-8">
                <ScoreGauge score={82} />
                <h3 className="text-xl font-semibold text-foreground mt-4">Compatibilidade ATS</h3>
                <p className="text-muted-foreground">Seu currículo está bem otimizado!</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-semibold text-green-600 flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Palavras-chave Encontradas
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {["React", "TypeScript", "Node.js", "APIs REST", "Git", "Agile"].map((keyword) => (
                      <span key={keyword} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-amber-600 flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Palavras-chave Ausentes
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {["Docker", "Kubernetes", "CI/CD", "AWS"].map((keyword) => (
                      <span key={keyword} className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 p-4 bg-muted rounded-xl">
                <h4 className="font-semibold text-foreground mb-2">Sugestões de Melhoria</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Adicione experiência com containers (Docker/Kubernetes)</li>
                  <li>• Mencione práticas de CI/CD e automação</li>
                  <li>• Inclua certificações de cloud (AWS, GCP, Azure)</li>
                </ul>
              </div>

              <div className="flex gap-4 mt-8">
                <Button
                  variant="outline"
                  onClick={() => {
                    setPdfATSName(null)
                    navigateTo("resume")
                  }}
                  className="flex-1"
                >
                  Refazer Upload
                </Button>
                <Button onClick={() => navigateTo("setup")} className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-slate-900">
                  Continuar para Entrevista
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    )
  }

  // SETUP SCREEN
  if (currentScreen === "setup") {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Configurar Entrevista</h1>
            <p className="text-muted-foreground mt-1">Personalize sua simulação para uma experiência mais relevante.</p>
          </div>

          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Cargo</Label>
                  <Select defaultValue="frontend">
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Selecione o cargo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="frontend">Front-end Developer</SelectItem>
                      <SelectItem value="backend">Back-end Developer</SelectItem>
                      <SelectItem value="fullstack">Fullstack Developer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="level">Nível</Label>
                  <Select defaultValue="pleno">
                    <SelectTrigger id="level">
                      <SelectValue placeholder="Selecione o nível" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="junior">Júnior</SelectItem>
                      <SelectItem value="pleno">Pleno</SelectItem>
                      <SelectItem value="senior">Sênior</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Idioma da Entrevista</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={language === "pt" ? "default" : "outline"}
                    onClick={() => setLanguage("pt")}
                    className={`flex-1 ${language === "pt" ? "bg-cyan-500 hover:bg-cyan-600 text-slate-900" : ""}`}
                  >
                    🇧🇷 Português
                  </Button>
                  <Button
                    type="button"
                    variant={language === "en" ? "default" : "outline"}
                    onClick={() => setLanguage("en")}
                    className={`flex-1 ${language === "en" ? "bg-cyan-500 hover:bg-cyan-600 text-slate-900" : ""}`}
                  >
                    🇺🇸 Inglês
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">Empresa Alvo (opcional)</Label>
                <Input id="company" placeholder="Ex: Google, Nubank, iFood..." />
              </div>

              <div className="space-y-2">
                <Label htmlFor="analogy">Tema de Analogia (opcional)</Label>
                <Input id="analogy" placeholder="Ex: Futebol, Música, Culinária..." />
              </div>

              <div className="space-y-2">
                <Label htmlFor="persona">Persona do Entrevistador</Label>
                <Select defaultValue="tech-lead">
                  <SelectTrigger id="persona">
                    <SelectValue placeholder="Selecione a persona" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tech-lead">Líder Técnico</SelectItem>
                    <SelectItem value="analyst">Analista de RH</SelectItem>
                    <SelectItem value="coach">Coach de Carreira</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={() => {
                  setCallTime(0)
                  navigateTo("call")
                }}
                className="w-full bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-semibold h-12"
              >
                <Play className="w-5 h-5 mr-2" />
                Entrar na Sala
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    )
  }

  // HISTORY SCREEN
  if (currentScreen === "history") {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Histórico de Entrevistas</h1>
            <p className="text-muted-foreground mt-1">Revise suas simulações anteriores e acompanhe seu progresso.</p>
          </div>

          <div className="space-y-4">
            {mockHistory.map((item) => (
              <Card
                key={item.id}
                className="cursor-pointer hover:shadow-lg hover:border-cyan-500/50 transition-all"
                onClick={() => handleHistoryClick(item)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-14 h-14 rounded-xl flex items-center justify-center font-bold text-white ${
                          item.score >= 80 ? "bg-green-500" : item.score >= 60 ? "bg-yellow-500" : "bg-red-500"
                        }`}
                      >
                        {item.score}
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {item.company} - {item.role}
                        </h3>
                        <p className="text-sm text-muted-foreground">{item.date}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </Layout>
    )
  }

  // REPORT SCREEN
  if (currentScreen === "report") {
  const report = selectedReport || defaultReport
  
  return (
  <Layout>
  <div className="max-w-3xl mx-auto space-y-8">
  <button
    onClick={() => {
      setSelectedReport(null)
      setCurrentScreen("history")
    }}
    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 font-medium cursor-pointer w-fit"
  >
    <ArrowLeft className="w-4 h-4" />
    Voltar para o Histórico
  </button>
  <div>
  <h1 className="text-3xl font-bold text-foreground">
  {report.company} - {report.role}
  </h1>
  <p className="text-muted-foreground mt-1">{report.date}</p>
  </div>

          <Card>
            <CardContent className="p-8">
              <div className="flex flex-col items-center text-center mb-8">
                <ScoreGauge score={report.score} />
                <h3 className="text-xl font-semibold text-foreground mt-4">Pontuação Geral</h3>
              </div>

              <div className="space-y-4 mb-8">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-2 text-foreground">
                      <Brain className="w-4 h-4 text-cyan-500" />
                      Habilidades Técnicas
                    </span>
                    <span className="font-semibold">{report.tech}%</span>
                  </div>
                  <Progress value={report.tech} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-2 text-foreground">
                      <MessageSquare className="w-4 h-4 text-violet-500" />
                      Comunicação
                    </span>
                    <span className="font-semibold">{report.comm}%</span>
                  </div>
                  <Progress value={report.comm} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-2 text-foreground">
                      <Users className="w-4 h-4 text-emerald-500" />
                      Soft Skills
                    </span>
                    <span className="font-semibold">{report.soft}%</span>
                  </div>
                  <Progress value={report.soft} className="h-2" />
                </div>
              </div>

              <div className="p-4 bg-muted rounded-xl mb-8">
                <h4 className="font-semibold text-foreground mb-2">Feedback Detalhado</h4>
                <p className="text-muted-foreground text-sm leading-relaxed">{report.feedback}</p>
              </div>

              <Button onClick={() => navigateTo("dashboard")} className="w-full bg-cyan-500 hover:bg-cyan-600 text-slate-900">
                Voltar ao Início
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    )
  }

  // PROFILE SCREEN
  if (currentScreen === "profile") {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Meu Perfil</h1>
            <p className="text-muted-foreground mt-1">Gerencie suas informações pessoais.</p>
          </div>

          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center gap-4 pb-6 border-b border-border">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center text-2xl font-bold text-white">
                  JD
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground">João Developer</h3>
                  <p className="text-muted-foreground">Desenvolvedor Full Stack</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input id="name" defaultValue="João Developer" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profile-email">E-mail</Label>
                  <Input id="profile-email" type="email" defaultValue="joao@developer.com" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Cargo Atual</Label>
                  <Input id="title" defaultValue="Desenvolvedor Full Stack" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="experience">Anos de Experiência</Label>
                  <Select defaultValue="3-5">
                    <SelectTrigger id="experience">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0-1">0-1 anos</SelectItem>
                      <SelectItem value="1-3">1-3 anos</SelectItem>
                      <SelectItem value="3-5">3-5 anos</SelectItem>
                      <SelectItem value="5-10">5-10 anos</SelectItem>
                      <SelectItem value="10+">10+ anos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button className="w-full bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-semibold">
                Salvar Alterações
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    )
  }

  return null
}
