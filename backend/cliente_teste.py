import asyncio
import websockets
import json
import wave

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
                            break # Encerra o loop quando a IA termina
                    else:
                        print(f"🔊 Recebendo pedaço da voz da IA... ({len(mensagem)} bytes)")
            except websockets.exceptions.ConnectionClosed:
                print("🔌 Conexão encerrada pelo servidor.")
            except Exception as e:
                print(f"❌ Erro na escuta: {e}")

        # Inicia a escuta em segundo plano
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

        print("🔇 Fim do áudio real.")

        print("🤫 Enviando silêncio para forçar a transcrição...")
        frame_silencio = b'\x00' * (int(16000 * 0.03) * 2)
        for _ in range(25): # Envia ~750ms de silêncio artificial
            await ws.send(frame_silencio)
            await asyncio.sleep(0.03)

        print("⏳ Aguardando processamento do Nexus...")

        # Aguarda a tarefa de escuta terminar (ela termina quando recebe o "done" da IA)
        await tarefa_escuta

if __name__ == "__main__":
    asyncio.run(testar_websocket())