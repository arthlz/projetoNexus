"use client"

import { Screen, InterviewHistory } from "@/types/interview"
import { useState } from "react"
import { defaultReport } from "@/constants/mock-data"
import { Sidebar } from "@/components/ui/layout/sidebar"
import { DashboardScreen } from "@/components/ui/screens/dashboard-screen"
import { LoginScreen } from "@/components/ui/screens/login-screen"
import { SetupScreen } from "@/components/ui/screens/setup-screen"
import { CallScreen } from "@/components/ui/screens/call-screen"
import { HistoryScreen } from "@/components/ui/screens/history-screen"
import { ReportScreen } from "@/components/ui/screens/report-screen"
import { ResumeScreen } from "@/components/ui/screens/resume-screen"
import { ProfileScreen } from "@/components/ui/screens/profile-screen"
import { RegisterScreen } from "@/components/ui/screens/register-screen"

export default function NexusApp() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("login")
  const [pdfATSName, setPdfATSName] = useState<string | null>(null)
  const [selectedReport, setSelectedReport] = useState<InterviewHistory | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [language, setLanguage] = useState<"pt" | "en">("pt")
  
  // NOVO: Estado para armazenar o ID da sala gerado pelo back-end
  const [roomId, setRoomId] = useState<string>("") 

  //Função para navegar entre as telas
  const navigateTo = (screen: Screen) => {
    setCurrentScreen(screen)
  }

  //Ações da aplicação
  const handleHistoryClick = (item: InterviewHistory) => {
    setSelectedReport(item)
    setCurrentScreen("report")
  }

  const handleEndCall = () => {
    setSelectedReport(defaultReport)
    setCurrentScreen("report")
  }

  //Layout que envolve páginas internas
  const Layout = ({ children }: { children: React.ReactNode }) => (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar currentScreen={currentScreen} navigateTo={navigateTo} />
      {/* O ml-64 empurra o conteúdo 256px para a direita, evitando ficar debaixo da Sidebar */}
      <main className="flex-1 ml-64 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  )

  //Página de Login
  if (currentScreen === "login") {
    return <LoginScreen navigateTo={navigateTo} />
  }

  if (currentScreen === "register") {
    return <RegisterScreen navigateTo={navigateTo} />
  }

  //Tela de ligação (Ocupa a tela inteira, sem o Layout da Sidebar)
  if (currentScreen === "call") {
    return (
      <CallScreen 
        roomId={roomId} // <-- NOVO: Passando o ID da sala para a CallScreen
        isMuted={isMuted}
        setIsMuted={setIsMuted}
        isPaused={isPaused}
        setIsPaused={setIsPaused}
        onEnd={handleEndCall}
      />
    )
  }

  //Dashboard
  if (currentScreen === "dashboard") {
    return (
      <Layout>
        <DashboardScreen navigateTo={navigateTo} />
      </Layout>
    )
  }
  
  //Tela do currículo (ATS) e resultado
  if (currentScreen === "resume" || currentScreen === "resume-results") {
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
  }

  //Tela do Setup (Nova Entrevista)
  if (currentScreen === "setup") {
    return (
      <Layout>
        <SetupScreen 
          language={language} 
          setLanguage={setLanguage} 
          // NOVO: Agora o onStart recebe o ID que vem do back-end, salva no state e muda a tela
          onStart={(newRoomId: string) => {
            setRoomId(newRoomId)
            navigateTo("call")
          }} 
        />
      </Layout>
    )
  }

  //Tela de histórico
  if (currentScreen === "history") {
    return (
      <Layout>
        <HistoryScreen onItemClick={handleHistoryClick} />
      </Layout>
    )
  }

  //Tela de relatório
  if (currentScreen === "report" && selectedReport) {
    return (
      <Layout>
        <ReportScreen 
          report={selectedReport} 
          onBackToHome={() => navigateTo("dashboard")} 
        />
      </Layout>
    )
  }

  //Tela de perfil
  if (currentScreen === "profile") {
    return (
      <Layout>
        <ProfileScreen />
      </Layout>
    )
  }

  return null
}