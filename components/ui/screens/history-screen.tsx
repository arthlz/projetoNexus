"use client"

import { ChevronRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { mockHistory } from "@/constants/mock-data"
import { InterviewHistory } from "@/types/interview"

interface HistoryScreenProps {
  onItemClick: (item: InterviewHistory) => void
}

export const HistoryScreen = ({ onItemClick }: HistoryScreenProps) => {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Histórico de Entrevistas</h1>
        <p className="text-muted-foreground mt-1">Acompanhe seu progresso.</p>
      </div>
      <div className="space-y-4">
        {mockHistory.map((item) => (
          <Card
            key={item.id}
            className="cursor-pointer hover:shadow-lg hover:border-cyan-500/50 transition-all"
            onClick={() => onItemClick(item)}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center font-bold text-white ${
                    item.score >= 80 ? "bg-green-500" : item.score >= 60 ? "bg-yellow-500" : "bg-red-500"
                  }`}>
                    {item.score}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{item.company} - {item.role}</h3>
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
  )
}