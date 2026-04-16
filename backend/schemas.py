from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum

class Cargo(str, Enum):
   """Opções de cargos disponíveis para a simulação da entrevista."""
   FRONT_END = "frontend"
   BACK_END = "backend"
   FULLSTACK = "fullstack"

class Senioridade(str, Enum):
   """Níveis de experiência aceitos pelo sistema."""
   JUNIOR = "junior"
   PLENO = "pleno"
   SENIOR = "senior"

class Idioma(str, Enum):
   """Idiomas suportados para a condução da entrevista pela IA."""
   PORTUGUESE = "pt"
   ENGLISH = "en"

class Persona(str, Enum):
   """Perfis de personalidade que a IA pode assumir como recrutador."""
   TECH_LEAD = "tech-lead"
   ANALYST = "analyst"
   COACH = "coach"

class ConfigurarEntrevista(BaseModel):
   """
   Modelo de dados (Schema) para a configuração inicial da entrevista.
  
   Este modelo define os parâmetros necessários para que a IA gere as
   perguntas personalizadas.
  
   Attributes:
      role: Cargo pretendido pelo candidato.
      level: Nível de senioridade do candidato.
      language: Idioma em que a entrevista será realizada.
      company: (Opcional) Contexto corporativo para personalização das perguntas.
      analogy: (Opcional) Temática criativa para a construção de perguntas situacionais.
      persona: Perfil comportamental do entrevistador virtual.
   """
   role: Cargo
   level: Senioridade
   language: Idioma
   company: Optional[str] = Field(None, max_length=50)
   analogy: Optional[str] = Field(None, max_length=100)
   persona: Persona
