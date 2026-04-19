from fastapi import APIRouter, HTTPException
from schemas import ConfigurarEntrevista, ExibirFeedback, RespostaCandidato
from tools import configurar_prompt, resposta_ia, gerar_feedback
from datetime import datetime
import uuid
import json

db_temp = {}
room_router = APIRouter(prefix="/room", tags=["room"])

@room_router.post("/setup")
async def configurar_sala(dados: ConfigurarEntrevista):
   room_id = str(uuid.uuid4())
   db_temp[room_id] = {
      "config": dados,
      "history": [],
      "criado_em": datetime.now()
   }

   return {
      "room_id": room_id,
      "status": "success",
      "message": "Configuração salva na memória!",
      "config": dados.model_dump()
   }

@room_router.post("/{room_id}/gerar-chat") # incorporar as informações do currículo (sprint 3)
async def gerar_chat(room_id: str):
   sala = db_temp.get(room_id)
    
   if not sala:
      raise HTTPException(status_code=404, detail="Sala não encontrada.")
   
   config = sala["config"]

   if sala["history"]:
      raise HTTPException(status_code=409, detail="Entrevista já iniciada para esta sala.")

   mapa_idiomas = {
      "pt": "Português do Brasil",
      "en": "Inglês Americano"
   }
   idioma_final = mapa_idiomas.get(config.language, "Português do Brasil")

   system_prompt = configurar_prompt(
      cargo=config.role,
      senioridade=config.level,
      idioma=idioma_final,
      perfil_recrutador=config.persona,
      empresa=config.company,
      analogia=config.analogy,
   )

   sala["history"] = system_prompt

   try:
      pergunta = await resposta_ia(sala["history"])

      sala["history"].append({
         "role": "assistant",
         "content": pergunta
      })
      
      return {
         "room_id": room_id,
         "question": pergunta
      }

   except Exception as e:
      raise HTTPException(status_code=500, detail=f"Erro na IA: {str(e)}")

@room_router.post("/{room_id}/responder")
async def responder_pergunta(room_id: str, dados: RespostaCandidato):
   sala = db_temp.get(room_id)
   if not sala:
      raise HTTPException(status_code=404, detail="Sala não encontrada.")
   
   sala["history"].append({
      "role": "user",
      "content": dados.texto
   })

   try:
      proxima_pergunta = await resposta_ia(sala["history"])

      sala["history"].append({
         "role": "assistant",
         "content": proxima_pergunta
      })

      return{
         "room_id": room_id,
         "question": proxima_pergunta
      }
   
   except Exception as e:
      raise HTTPException(status_code=500, detail=f"Erro na IA: {str(e)}")

@room_router.post("/{room_id}/encerrar-chat", response_model=ExibirFeedback)
async def encerrar_chat(room_id: str):
   sala = db_temp.get(room_id)
   if not sala:
      raise HTTPException(status_code=404, detail="Sala não encontrada.")

   current_history = sala.get("history", [])

   prompt_final = gerar_feedback(current_history)

   try:
      resposta_texto = await resposta_ia(prompt_final) # a função retorna uma string

      dados = json.loads(resposta_texto) # transforma em dicionário
      return ExibirFeedback(**dados) # unpack

   except Exception as e:
      raise HTTPException(status_code=500, detail=f"Erro na avaliação: {str(e)}")
