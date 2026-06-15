export type Screen = 
  | "login" 
  | "register"
  | "dashboard" 
  | "setup" 
  | "resume" 
  | "resume-results" 
  | "history" 
  | "report" 
  | "profile" 
  | "call";

export interface InterviewHistory {
  id: number;
  role: string;
  company: string;
  score: number;
  tech: number;
  comm: number;
  soft: number;
  feedback: string;
  date: string;
}

export interface RelatorioAPIResponse {
  room_id: number;
  role: string;
  level?: string;
  persona?: string;
  company?: string | null;
  language?: string;
  date?: string;
  score?: number | null;
  tech?: number | null;
  comm?: number | null;
  soft?: number | null;
  feedback?: string | null;
}