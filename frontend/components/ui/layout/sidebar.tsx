"use client"

import { Home, Play, FileText, Clock, User, LogOut, Sparkles } from "lucide-react"

interface SidebarProps {
  currentScreen: string
  navigateTo: (screen: string) => void
}

export const Sidebar = ({ currentScreen, navigateTo }: SidebarProps) => {
  // Lista de itens do menu baseada nas suas imagens
  const navItems = [
    { id: "dashboard", label: "Início", icon: Home },
    { id: "setup", label: "Nova Entrevista", icon: Play },
    { id: "resume", label: "Análise de Currículo", icon: FileText },
    { id: "history", label: "Histórico", icon: Clock },
    { id: "profile", label: "Meu Perfil", icon: User },
  ]

  return (
    <aside className="w-64 bg-[#0f172a] flex flex-col h-screen fixed left-0 top-0 border-r border-slate-800 z-50">
      
      {/* Logo Area */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400">
          <Sparkles className="w-6 h-6" />
        </div>
        <div className="flex flex-col">
          <h1 className="text-white font-bold text-xl leading-none">Nexus</h1>
          <span className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-semibold">
            Área do Desenvolvedor
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = currentScreen === item.id

          return (
            <button
              key={item.id}
              onClick={() => navigateTo(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive 
                  ? "bg-slate-800/80 text-cyan-400 font-medium border border-slate-700/50 shadow-sm" 
                  : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "text-cyan-400" : "text-slate-400"}`} />
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Logout Button */}
      <div className="p-4 mb-4">
        <button className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-all">
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sair</span>
        </button>
      </div>
      
    </aside>
  )
}