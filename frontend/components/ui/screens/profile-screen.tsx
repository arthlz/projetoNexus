"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"

export const ProfileScreen = () => {
  // Estados iniciais definidos com os dados pretendidos
  const [name, setName] = useState("Arthur Luz")
  const [email, setEmail] = useState("arthurluz@gmail.com")
  const [experience, setExperience] = useState("1-3")
  
  // Estados para controlo de interface
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error) throw error

        if (user) {
         
          setEmail(user.email || "arthurluz@gmail.com")
          
          setName(user.user_metadata?.full_name || user.user_metadata?.name || "Arthur Luz")
         
        }
      } catch (error) {
        console.error("Erro ao carregar o perfil:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadProfile()
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        alert("Utilizador não autenticado.")
        return
      }

      // Atualiza as informações nos metadados do Supabase Auth
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: name,
          experience: experience
        }
      })

      if (error) throw error

      alert("Perfil atualizado com sucesso!")
    } catch (error) {
      console.error("Erro ao guardar o perfil:", error)
      alert("Ocorreu um erro ao guardar as alterações.")
    } finally {
      setIsSaving(false)
    }
  }

  // Função auxiliar para criar o avatar com as iniciais do nome de forma dinâmica
  const getInitials = (fullName: string) => {
    const names = fullName.trim().split(" ")
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
    }
    return fullName.substring(0, 2).toUpperCase()
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Meu Perfil</h1>
        <p className="text-muted-foreground mt-1">Gerencie suas informações.</p>
      </div>
      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center gap-4 pb-6 border-b">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center text-2xl font-bold text-white">
              {getInitials(name)}
            </div>
            <div>
              <h3 className="text-xl font-semibold">{isLoading ? "A carregar..." : name}</h3>
              <p className="text-muted-foreground">Desenvolvedor Full Stack</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                disabled={isLoading || isSaving}
              />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              {/* O campo de e-mail está desativado pq nn faz sentido alterar o email */}
              <Input 
                type="email" 
                value={email} 
                disabled 
              />
            </div>
            <div className="space-y-2">
              <Label>Experiência</Label>
              <Select 
                value={experience} 
                onValueChange={setExperience}
                disabled={isLoading || isSaving}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-3">1-3 anos</SelectItem>
                  <SelectItem value="3-5">3-5 anos</SelectItem>
                  <SelectItem value="5+">5+ anos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button 
            className="w-full bg-cyan-500 text-slate-900 hover:bg-cyan-600" 
            onClick={handleSave}
            disabled={isLoading || isSaving}
          >
            {isSaving ? "A guardar..." : "Salvar Alterações"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}