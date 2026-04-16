from fastapi import APIRouter, HTTPException
from schemas import ConfigurarEntrevista, ExibirFeedback
from backend.tools import configurar_prompt, resposta_ia, gerar_feedback
import uuid

db_temp = {}
room_router = APIRouter(prefix="/room", tags=["room"])

@room_router.post("/setup") # cleanup periódico/timestamp (memória)
async def configurar_sala(dados: ConfigurarEntrevista):
   room_id = str(uuid.uuid4())
   db_temp[room_id] = {
      "config": dados,
      "history": []
   }

   return {
      "room_id": room_id,
      "status": "success",
      "message": "Configuração salva na memória!",
      "config": dados.model_dump()
   }

@room_router.post("/{room_id}/gerar-chat") # adicionar mais um endpoint para a resposta ou refatorar a interação totalmente
async def gerar_chat(room_id: str):
   """LIMITAÇÕES ATUAIS:
   - Gera apenas a primeira pergunta (não mantém conversa)
   - Não recebe respostas do candidato
   - Sem contexto de respostas anteriores
   - Campo hardcoded: info_candidato"""
   sala = db_temp.get(room_id)
    
   if not sala:
      raise HTTPException(status_code=404, detail="Sala não encontrada.")
   
   config = sala["config"]

   mapa_idiomas = {
      "pt": "Português do Brasil",
      "en": "Inglês Americano"
   }
   idioma_final = mapa_idiomas.get(config.language, "Português do Brasil")
    
   system_prompt = configurar_prompt(
      nivel=config.level,
      perfil_recrutador=config.persona,
      idioma=idioma_final,
      info_candidato="currículo aqui"
   )
    
   try:
      pergunta = await resposta_ia(system_prompt)

      sala["history"].append({"question": pergunta})
      
      return {
         "room_id": room_id,
         "question": pergunta
      }

   except Exception as e:
      raise HTTPException(status_code=500, detail=f"Erro na IA: {str(e)}")

@room_router.post("/{room_id}/encerrar-chat", response_model=ExibirFeedback) # rota incompleta
async def encerrar_chat(room_id: str):
   sala = db_temp.get(room_id)
   if not sala:
      raise HTTPException(status_code=404, detail="Sala não encontrada.")

   current_history = sala.get("history", [])

   prompt_final = gerar_feedback(current_history)

   try:
      resposta_json = await resposta_ia(prompt_final)
      
      return ExibirFeedback(**resposta_json) 

   except Exception as e:
      raise HTTPException(status_code=500, detail=f"Erro na avaliação: {str(e)}")
