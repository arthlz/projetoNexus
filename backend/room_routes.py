from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from schemas import ConfigurarEntrevista, ExibirFeedback
from tools import configurar_prompt, resposta_ia, gerar_feedback
from voice_pipeline import VADDetector, transcrever_audio, gerar_resposta_streaming, sintetizar_streaming
from datetime import datetime
import uuid
import json
import re
import asyncio

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

@room_router.websocket("/{room_id}/entrevista")
async def iniciar_entrevista(ws: WebSocket, room_id: str):
   await ws.accept()

   sala = db_temp.get(room_id)
   if not sala:
      await ws.close(code=4004)
      return

   config = sala["config"]

   # Inicializa o system prompt na primeira conexão (equivale ao antigo /gerar-chat)
   if not sala["history"]:
      mapa_idiomas = {"pt": "Português do Brasil", "en": "Inglês Americano"}
      idioma_final = mapa_idiomas.get(config.language, "Português do Brasil")
      sala["history"] = configurar_prompt(
         cargo=config.role,
         senioridade=config.level,
         idioma=idioma_final,
         perfil_recrutador=config.persona,
         empresa=config.company,
         analogia=config.analogy,
      )

      # IA abre a entrevista antes do usuário falar
      text_queue = await gerar_resposta_streaming(sala["history"])
      abertura = await sintetizar_streaming(text_queue, ws)
      sala["history"].append({"role": "assistant", "content": abertura})
      await ws.send_json({"type": "done"})

   detector_vad = VADDetector()

   try:
      while True:
         frame = await ws.receive_bytes()
         audio_completo = detector_vad.process_frame(frame)

         # Valida tamanho do frame (webrtcvad é rígido quanto a isso)
         if audio_completo:
            texto = await asyncio.to_thread(transcrever_audio, audio_completo, config.language)

            if not texto:
               await ws.send_json({"type": "transcript", "text": "[Áudio não compreendido]"})
               await ws.send_json({"type": "done"})
               continue

            await ws.send_json({"type": "transcript", "text": texto})

            sala["history"].append({"role": "user", "content": texto})

            text_queue = await gerar_resposta_streaming(sala["history"])
            resposta = await sintetizar_streaming(text_queue, ws)
            sala["history"].append({"role": "assistant", "content": resposta})

            await ws.send_json({"type": "done"})

   except WebSocketDisconnect:
      print("🔌 Cliente desconectado.")


@room_router.post("/{room_id}/encerrar", response_model=ExibirFeedback)
async def encerrar_entrevista(room_id: str):
   sala = db_temp.get(room_id)
   if not sala:
      raise HTTPException(status_code=404, detail="Sala não encontrada.")

   current_history = sala.get("history", [])

   prompt_final = gerar_feedback(current_history)

   try:
      # Envia o histórico ao LLM e recebe o feedback como texto puro (string 'suja')
      resposta_texto = await resposta_ia(prompt_final)

      # Extrai o objeto JSON da resposta (string 'limpa'), ignorando texto extra ou blocos de markdown
      match = re.search(r'\{.*\}', resposta_texto, re.DOTALL)
      if not match:
         raise ValueError("Nenhum JSON encontrado na resposta do modelo.")

      # Converte o JSON extraído em dicionário Python
      dados = json.loads(match.group())

      # Valida os dados contra o schema (scores entre 0-100, campos obrigatórios, etc)
      feedback = ExibirFeedback(**dados)

      # Só deleta a sala após tudo ter dado certo (se falhar, o usuário pode tentar de novo)
      db_temp.pop(room_id)
      return feedback

   except Exception as e:
      raise HTTPException(status_code=500, detail=f"Erro na avaliação: {str(e)}")
