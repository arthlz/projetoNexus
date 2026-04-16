from fastapi import APIRouter, HTTPException
from schemas import ConfigurarEntrevista
import uuid

db_temp = {}
room_router = APIRouter(prefix="/room", tags=["room"])

@room_router.post("/setup")
async def configurar_sala(dados: ConfigurarEntrevista):
   room_id = str(uuid.uuid4())
   db_temp[room_id] = dados

   return {
      "room_id": room_id,
      "status": "success",
      "mensagem": "Configuração salva na memória!",
      "config": dados.model_dump()
   }
