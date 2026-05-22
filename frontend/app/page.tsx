
"use client"

import { useState } from "react"
import { Screen, InterviewHistory } from "@/types/interview"
import { Sidebar }         from "@/components/ui/layout/sidebar"
import { DashboardScreen } from "@/components/ui/screens/dashboard-screen"
import { LoginScreen }     from "@/components/ui/screens/login-screen"
import { SetupScreen }     from "@/components/ui/screens/setup-screen"
import { CallScreen }      from "@/components/ui/screens/call-screen"
import { HistoryScreen }   from "@/components/ui/screens/history-screen"
import { ReportScreen }    from "@/components/ui/screens/report-screen"
import { ResumeScreen }    from "@/components/ui/screens/resume-screen"
import { ProfileScreen }   from "@/components/ui/screens/profile-screen"
import { RegisterScreen }  from "@/components/ui/screens/register-screen"

const API_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://localhost:8000"

export default function NexusApp() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("login")
  const [pdfATSName,    setPdfATSName]    = useState<string | null>(null)
  const [selectedReport, setSelectedReport] = useState<InterviewHistory | null>(null)
  const [isMuted,  setIsMuted]  = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [language, setLanguage] = useState<"pt" | "en">("pt")
  const [roomId,   setRoomId]   = useState<string>("")
  const [isEndingCall, setIsEndingCall] = useState(false)

  const navigateTo = (screen: Screen) => setCurrentScreen(screen)

  const handleHistoryClick = (item: InterviewHistory) => {
    setSelectedReport(item)
    setCurrentScreen("report")
  }

  // ── Encerramento real: chama /encerrar + /relatorio ───────────────────────
  const handleEndCall = async () => {
    setIsEndingCall(true)
    try {
      // 1. Gera o feedback via LLM
      const encerrarRes = await fetch(`${API_BASE}/room/${roomId}/encerrar`, {
        method: "POST",
      })

      if (!encerrarRes.ok) {
        console.error("Erro ao encerrar entrevista:", await encerrarRes.text())
        // Fallback: vai para o relatório mesmo sem feedback
        setSelectedReport(buildFallbackReport())
        setCurrentScreen("report")
        return
      }

      // 2. Busca o relatório completo (metadados + histórico + feedback)
      const relatorioRes = await fetch(`${API_BASE}/room/${roomId}/relatorio`)

      if (!relatorioRes.ok) {
        // Usa o feedback do /encerrar diretamente como fallback
        const fb = await encerrarRes.json()
        setSelectedReport({
          id: Number(roomId),
          role: "Entrevista Técnica",
          company: "",
          score: fb.score ?? 0,
          tech:  fb.tech  ?? 0,
          comm:  fb.comm  ?? 0,
          soft:  fb.soft  ?? 0,
          feedback: fb.feedback ?? "",
          date: new Date().toLocaleDateString("pt-BR", {
            day: "2-digit", month: "short", year: "numeric",
          }),
        })
      } else {
        const relatorio = await relatorioRes.json()
        setSelectedReport(relatorioToHistory(relatorio))
      }

      setCurrentScreen("report")
    } catch (err) {
      console.error("Falha na finalização:", err)
      setSelectedReport(buildFallbackReport())
      setCurrentScreen("report")
    } finally {
      setIsEndingCall(false)
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  function relatorioToHistory(r: any): InterviewHistory {
    const company = r.company ? ` — ${r.company}` : ""
    return {
      id:       r.room_id,
      role:     `${r.role}${company}`,
      company:  r.company ?? "",
      score:    r.score   ?? 0,
      tech:     r.tech    ?? 0,
      comm:     r.comm    ?? 0,
      soft:     r.soft    ?? 0,
      feedback: r.feedback ?? "Feedback indisponível.",
      date:     r.date
        ? new Date(r.date).toLocaleDateString("pt-BR", {
            day: "2-digit", month: "short", year: "numeric",
          })
        : new Date().toLocaleDateString("pt-BR", {
            day: "2-digit", month: "short", year: "numeric",
          }),
    }
  }

  function buildFallbackReport(): InterviewHistory {
    return {
      id: 0,
      role: "Entrevista Técnica",
      company: "",
      score: 0, tech: 0, comm: 0, soft: 0,
      feedback: "Não foi possível gerar o feedback. Tente novamente.",
      date: new Date().toLocaleDateString("pt-BR", {
        day: "2-digit", month: "short", year: "numeric",
      }),
    }
  }

  // ── Layout com Sidebar ────────────────────────────────────────────────────

  const Layout = ({ children }: { children: React.ReactNode }) => (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar currentScreen={currentScreen} navigateTo={navigateTo} />
      <main className="flex-1 ml-64 p-8 overflow-y-auto">{children}</main>
    </div>
  )

  // ── Telas sem sidebar ─────────────────────────────────────────────────────

  if (currentScreen === "login")    return <LoginScreen    navigateTo={navigateTo} />
  if (currentScreen === "register") return <RegisterScreen navigateTo={navigateTo} />

  if (currentScreen === "call") {
    return (
      <CallScreen
        roomId={roomId}
        isMuted={isMuted}   setIsMuted={setIsMuted}
        isPaused={isPaused} setIsPaused={setIsPaused}
        onEnd={handleEndCall}
        isEndingCall={isEndingCall}
      />
    )
  }

  // ── Telas com sidebar ─────────────────────────────────────────────────────

  if (currentScreen === "dashboard")
    return <Layout><DashboardScreen navigateTo={navigateTo} /></Layout>

  if (currentScreen === "resume" || currentScreen === "resume-results")
    return (
      <Layout>
        <ResumeScreen
          currentScreen={currentScreen}
          pdfATSName={pdfATSName}
          setPdfATSName={setPdfATSName}
          navigateTo={navigateTo}
        />
      </Layout>
    )

  if (currentScreen === "setup")
    return (
      <Layout>
        <SetupScreen
          language={language}
          setLanguage={setLanguage}
          onStart={(newRoomId: string) => {
            setRoomId(newRoomId)
            navigateTo("call")
          }}
        />
      </Layout>
    )

  if (currentScreen === "history")
    return <Layout><HistoryScreen onItemClick={handleHistoryClick} /></Layout>

  if (currentScreen === "report" && selectedReport)
    return (
      <Layout>
        <ReportScreen
          report={selectedReport}
          onBackToHome={() => navigateTo("dashboard")}
        />
      </Layout>
    )

  if (currentScreen === "profile")
    return <Layout><ProfileScreen /></Layout>

  return null
}
