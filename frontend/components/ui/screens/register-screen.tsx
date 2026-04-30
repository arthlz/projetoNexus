"use client"

import { Sparkles } from "lucide-react"
import { Screen } from "@/types/interview"
import { useState } from "react"
import { supabase } from "@/lib/supabase"

interface RegisterScreenProps {
  navigateTo: (screen: Screen) => void
}

export const RegisterScreen = ({
  navigateTo,
}: RegisterScreenProps) => {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  async function handleRegister() {
    console.log("Tentando registrar:", { email, name })
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
        // Para desenvolvimento, vamos tentar confirmar automaticamente
        emailRedirectTo: window.location.origin
      },
    })

    console.log("Resposta do registro:", { data, error })

    if (error) {
      alert(`Erro ao cadastrar: ${error.message}`)
      return
    }

    // Se o usuário foi criado mas não confirmado, vamos tentar confirmar automaticamente
    if (data.user && !data.user.email_confirmed_at) {
      // Para desenvolvimento, vamos tentar fazer login imediatamente
      // Isso pode funcionar se o Supabase estiver configurado para confirmar automaticamente
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (!loginError) {
        alert("Conta criada e login realizado com sucesso!")
        navigateTo("dashboard")
        return
      }
      
      alert("Conta criada! Mas você precisa confirmar seu email antes de fazer login. Verifique sua caixa de entrada.")
    } else {
      alert("Conta criada com sucesso!")
    }
    
    navigateTo("login")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 p-8 shadow-2xl">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>

            <h1 className="text-3xl font-bold text-white mb-2">
              Cadastro
            </h1>

            <p className="text-slate-300">
              Crie sua conta no Nexus
            </p>
          </div>

          {/* Inputs */}
          <div className="space-y-4">

            <input
              type="text"
              placeholder="Nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-11 px-3 rounded-md bg-white/10 border border-white/20 text-white placeholder:text-slate-400"
            />

            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-11 px-3 rounded-md bg-white/10 border border-white/20 text-white placeholder:text-slate-400"
            />

            <input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-11 px-3 rounded-md bg-white/10 border border-white/20 text-white placeholder:text-slate-400"
            />

            {/* Botão */}
            <button
              onClick={handleRegister}
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