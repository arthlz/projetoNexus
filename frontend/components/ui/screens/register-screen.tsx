"use client"

import { Sparkles } from "lucide-react"
import { Screen } from "@/types/interview"

interface RegisterScreenProps {
  navigateTo: (screen: Screen) => void
}

export const RegisterScreen = ({ navigateTo }: RegisterScreenProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 p-8 shadow-2xl">
          
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Cadastro</h1>
            <p className="text-slate-300">Crie sua conta no Nexus</p>
          </div>

          {/* Inputs */}
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Nome"
              className="w-full h-11 px-3 rounded-md bg-white/10 border border-white/20 text-white placeholder:text-slate-400"
            />

            <input
              type="email"
              placeholder="E-mail"
              className="w-full h-11 px-3 rounded-md bg-white/10 border border-white/20 text-white placeholder:text-slate-400"
            />

            <input
              type="password"
              placeholder="Senha"
              className="w-full h-11 px-3 rounded-md bg-white/10 border border-white/20 text-white placeholder:text-slate-400"
            />

            {/* Botão */}
            <button
              onClick={() => navigateTo("login")}
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-semibold h-11 rounded-md"
            >
              Criar conta
            </button>
          </div>

          {/* Footer */}
          <p className="text-center text-slate-400 text-sm mt-6">
            Já tem conta?{" "}
            <button
              onClick={() => navigateTo("login")}
              className="text-cyan-400 hover:text-cyan-300 font-medium"
            >
              Entrar
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}