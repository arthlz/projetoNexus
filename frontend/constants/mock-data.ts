import { InterviewHistory } from "@/types/interview"

export const mockHistory: InterviewHistory[] = [
  {
    id: 1,
    role: "Front-end Sênior",
    company: "Nubank",
    score: 92,
    tech: 95,
    comm: 90,
    soft: 85,
    feedback: "Excelente domínio de React e arquitetura de componentes. Demonstrou conhecimento sólido em performance e otimização. Melhore o conhecimento em System Design para entrevistas de nível sênior.",
    date: "10 Out 2026",
  },
  {
    id: 2,
    role: "Back-end Pleno",
    company: "Itaú",
    score: 78,
    tech: 80,
    comm: 70,
    soft: 85,
    feedback: "Bom conhecimento em APIs REST e bancos de dados. Revisar conceitos de microsserviços e mensageria (Kafka, RabbitMQ). Comunicação pode ser mais assertiva.",
    date: "05 Out 2026",
  },
  {
    id: 3,
    role: "Fullstack Júnior",
    company: "Mercado Livre",
    score: 65,
    tech: 60,
    comm: 70,
    soft: 70,
    feedback: "Fundamentos básicos estão presentes. Focar em lógica de programação e algoritmos. Pratique mais problemas de código e estruturas de dados.",
    date: "01 Out 2026",
  },
]

export const defaultReport: InterviewHistory = {
  id: 0,
  role: "Entrevista Técnica",
  company: "Empresa",
  score: 85,
  tech: 88,
  comm: 82,
  soft: 85,
  feedback: "Boa performance geral na entrevista. Continue praticando para aprimorar suas habilidades técnicas e de comunicação.",
  date: new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }),
}