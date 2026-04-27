"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export const ProfileScreen = () => {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Meu Perfil</h1>
        <p className="text-muted-foreground mt-1">Gerencie suas informações.</p>
      </div>
      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center gap-4 pb-6 border-b">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center text-2xl font-bold text-white">JD</div>
            <div>
              <h3 className="text-xl font-semibold">João Developer</h3>
              <p className="text-muted-foreground">Desenvolvedor Full Stack</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nome</Label><Input defaultValue="João Developer" /></div>
            <div className="space-y-2"><Label>E-mail</Label><Input type="email" defaultValue="joao@developer.com" /></div>
            <div className="space-y-2">
              <Label>Experiência</Label>
              <Select defaultValue="3-5">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-3">1-3 anos</SelectItem>
                  <SelectItem value="3-5">3-5 anos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button className="w-full bg-cyan-500 text-slate-900">Salvar Alterações</Button>
        </CardContent>
      </Card>
    </div>
  )
}