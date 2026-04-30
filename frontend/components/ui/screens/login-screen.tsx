"use client"

import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Screen } from "@/types/interview"
import { useState } from "react"
import { supabase } from "@/lib/lib/supabase"

interface LoginScreenProps {
  navigateTo: (screen: Screen) => void
}

export const LoginScreen = ({ navigateTo }: LoginScreenProps) => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleLogin = async () => {
    console.log("Tentando login:", { email })
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    console.log("Resposta do login:", { data, error })

    if (error) {
      if (error.message.includes("Email not confirmed")) {
        alert("Email não confirmado! Verifique sua caixa de entrada e confirme seu email antes de fazer login.")
      } else if (error.message.includes("Invalid login credentials")) {
        alert("E-mail ou senha incorretos!")
      } else {
        alert(`Erro no login: ${error.message}`)
      }
      return
    }

    alert("Login realizado com sucesso!")
    navigateTo("dashboard")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.2)', padding: '32px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
          
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'linear-gradient(to bottom right, #06b6d4, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Sparkles style={{ width: '32px', height: '32px', color: 'white' }} />
            </div>

            <h1 style={{ fontSize: '36px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
              Nexus
            </h1>

            <p style={{ color: '#94a3b8' }}>
              Domine sua próxima entrevista.
            </p>
          </div>

          {/* Inputs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ color: '#e2e8f0' }}>
                E-mail
              </label>

              <input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', height: '44px', padding: '0 12px', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ color: '#e2e8f0' }}>
                Senha
              </label>

              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', height: '44px', padding: '0 12px', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white' }}
              />
            </div>

            {/* Botão */}
            <button
              onClick={handleLogin}
              style={{ width: '100%', backgroundColor: '#06b6d4', color: '#0f172a', fontWeight: '600', height: '44px', borderRadius: '6px' }}
            >
              Entrar
            </button>
          </div>

          {/* Footer */}
          <p style={{ textAlign: 'center', color: '#64748b', fontSize: '14px', marginTop: '24px' }}>
            Não tem conta?{" "}
            
            <button
              onClick={() => navigateTo("register")}
              style={{ color: '#06b6d4' }}
            >
              Cadastre-se
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}