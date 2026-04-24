import asyncio
import websockets
import json
import wave
import time

async def testar_websocket():
    uri = "ws://localhost:8000/voice/sala-teste?lang=pt"
    print("🔌 Conectando ao servidor...")
    
    async with websockets.connect(uri) as ws:
        print("✅ Conectado!\n")
        
        # 1. Tarefa para escutar as respostas do servidor
        async def escutar():
            try:
                while True:
                    mensagem = await ws.recv()
                    if isinstance(mensagem, str):
                        dados = json.loads(mensagem)
                        if dados.get("type") == "transcript":
                            print(f"\n📝 VOCÊ DISSE: {dados['text']}")
                        elif dados.get("type") == "done":
                            print("\n✅ Resposta da IA concluída!")
                            break
                    else:
                        print(f"🔊 Recebendo pedaço da voz da IA... ({len(mensagem)} bytes)")
            except Exception as e:
                pass

        tarefa_escuta = asyncio.create_task(escutar())
        
        # 2. Tarefa para enviar o áudio
        print("🎙️ Enviando áudio de teste...")
        
        with wave.open("audioalterado.wav", "rb") as wf:
            chunk_size = int(16000 * 0.03) # Pedaços de 30ms
            while True:
                frames = wf.readframes(chunk_size)
                if not frames:
                    break
                await ws.send(frames)
                await asyncio.sleep(0.03) # Finge que está falando em tempo real

        print("🔇 Fim do áudio. Aguardando processamento...")
        await tarefa_escuta

if __name__ == "__main__":
    asyncio.run(testar_websocket())