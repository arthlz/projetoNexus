from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum

class Cargo(str, Enum):
   """Opções de cargos disponíveis para a simulação da entrevista."""
   FRONT_END = "Front-end Developer"
   BACK_END = "Back-end Developer"
   FULLSTACK = "Full-stack Developer"
   MOBILE = "Mobile Developer"
   DATA_SCIENTIST = "Data Scientist"

class Senioridade(str, Enum):
   """Níveis de experiência aceitos pelo sistema."""
   JUNIOR = "Júnior"
   PLENO = "Pleno"
   SENIOR = "Sênior"
   ESPECIALISTA = "Especialista"

class Idioma(str, Enum):
   """Idiomas suportados para a condução da entrevista pela IA."""
   PORTUGUESE = "pt"
   ENGLISH = "en"

class Persona(str, Enum): # mudança nas personas para alinhar front e back (aguardar)
   """Perfis de personalidade que a IA pode assumir como recrutador."""
   RIGOROSO = "Rigoroso"
   ACOLHEDOR = "Acolhedor"
   PROVOCADOR = "Provocador"
   COMPORTAMENTAL = "Comportamental"

class ConfigurarEntrevista(BaseModel):
   """
   Modelo de dados (Schema) para a configuração inicial da entrevista.
  
   Este modelo define os parâmetros necessários para que a IA gere as
   perguntas personalizadas.
  
   Attributes:
      role: Cargo pretendido pelo candidato.
      level: Nível de senioridade do candidato.
      language: Idioma em que a entrevista será realizada.
      persona: Perfil comportamental do entrevistador virtual.
      company: (Opcional) Contexto corporativo para personalização das perguntas.
      analogy: (Opcional) Temática criativa para a construção de perguntas situacionais.
   """
   role: Cargo
   level: Senioridade
   language: Idioma
   persona: Persona
   company: Optional[str] = Field(None, max_length=50)
   analogy: Optional[str] = Field(None, max_length=100)

class RespostaCandidato(BaseModel):
   texto: str = Field(min_length=1, max_length=2000)

class ExibirFeedback(BaseModel):
   score: int
   tech: int
   comm: int
   soft: int
   feedback: str
   status: str = "completed"
