"use client"

import { useState } from "react"
import { Play, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface SetupScreenProps {
  language: "pt" | "en"
  setLanguage: (lang: "pt" | "en") => void
  onStart: (roomId: string) => void
}

export const SetupScreen = ({ language, setLanguage, onStart }: SetupScreenProps) => {
  const [role, setRole] = useState("Front-end Developer")
  const [level, setLevel] = useState("Pleno")
  const [company, setCompany] = useState("")
  const [analogy, setAnalogy] = useState("")
  const [persona, setPersona] = useState("Rigoroso")
  const [isLoading, setIsLoading] = useState(false)

  const handleStartInterview = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("http://localhost:8000/room/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role,
          level,
          language,
          persona,
          company: company.trim() !== "" ? company : null,
          analogy: analogy.trim() !== "" ? analogy : null,
        }),
      })

      if (!response.ok) {
        throw new Error("Erro ao configurar a sala")
      }

      const data = await response.json()
      
      if (data.status === "success" && data.room_id) {
        onStart(data.room_id)
      }
    } catch (error) {
      console.warn("Backend não encontrado. Entrando em modo Mock.", error)
      
      // MODO MOCK: Gera um ID falso e avisa o usuário
      const mockRoomId = `mock-${Math.random().toString(36).substring(7)}`
      alert("⚠️ Backend offline! Entrando no Modo Simulação (apenas interface). A IA não vai responder.")
      
      onStart(mockRoomId)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Cabeçalho */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Configurar Entrevista</h1>
        <p className="text-slate-500">Personalize sua simulação para uma experiência mais relevante.</p>
      </div>

      {/* Container do Formulário */}
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-6">

        {/* Cargo e Nível */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-900">Cargo</label>
            <select 
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all cursor-pointer"
            >
              <option value="Front-end Developer">Front-end Developer</option>
              <option value="Back-end Developer">Back-end Developer</option>
              <option value="Full-stack Developer">Full-stack Developer</option>
              <option value="Mobile Developer">Mobile Developer</option>
              <option value="Data Scientist">Data Scientist</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-900">Nível</label>
            <select 
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all cursor-pointer"
            >
              <option value="Júnior">Júnior</option>
              <option value="Pleno">Pleno</option>
              <option value="Sênior">Sênior</option>
              <option value="Especialista">Especialista</option>
            </select>
          </div>
        </div>

        {/* Idioma da Entrevista */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-900">Idioma da Entrevista</label>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setLanguage("pt")}
              className={`h-12 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                language === "pt"
                  ? "bg-cyan-500 text-white shadow-md border-transparent"
                  : "bg-white text-slate-600 border border-slate-200 hover:border-cyan-500 hover:text-cyan-600"
              }`}
            >
              <span className="text-[10px] font-bold uppercase opacity-70">BR</span>
              Português
            </button>
            <button
              onClick={() => setLanguage("en")}
              className={`h-12 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                language === "en"
                  ? "bg-cyan-500 text-white shadow-md border-transparent"
                  : "bg-white text-slate-600 border border-slate-200 hover:border-cyan-500 hover:text-cyan-600"
              }`}
            >
              <span className="text-[10px] font-bold uppercase opacity-70">US</span>
              Inglês
            </button>
          </div>
        </div>

        {/* Empresa Alvo */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-900">Empresa Alvo (opcional)</label>
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Ex: Google, Nubank, iFood..."
            className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
          />
        </div>

        {/* Tema de Analogia */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-900">Tema de Analogia (opcional)</label>
          <input
            type="text"
            value={analogy}
            onChange={(e) => setAnalogy(e.target.value)}
            placeholder="Ex: Futebol, Música, Culinária..."
            className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
          />
        </div>

        {/* Persona do Entrevistador */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-900">Persona do Entrevistador</label>
          <select 
            value={persona}
            onChange={(e) => setPersona(e.target.value)}
            className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all cursor-pointer"
          >
            <option value="Rigoroso">Rigoroso (Arquiteto Técnico Sênior)</option>
            <option value="Acolhedor">Acolhedor (Gerente de Engenharia)</option>
            <option value="Provocador">Provocador (Tech Lead Cético)</option>
            <option value="Comportamental">Comportamental (Líder de RH)</option>
          </select>
        </div>

        {/* Botão de Ação */}
        <div className="pt-4">
          <Button
            onClick={handleStartInterview}
            disabled={isLoading}
            className="w-full h-14 text-lg bg-cyan-500 hover:bg-cyan-600 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Play className="w-5 h-5 fill-current" />
            )}
            {isLoading ? "Configurando Sala..." : "Entrar na Sala"}
          </Button>
        </div>

      </div>
    </div>
  )
}