export type Screen = 
  | "login" 
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