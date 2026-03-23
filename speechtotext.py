from openai import OpenAI
from dotenv import load_dotenv
import os

load_dotenv()
chave_whisper = os.getenv("WHISPER_API")
# 1. Coloque o seu crachá (Chave da API)
# Substitua pela sua chave real que começa com sk-...
client = OpenAI(api_key=chave_whisper)

# 2. O local do arquivo de áudio

nome_do_arquivo = "teste_de_voz.mp3"

print(f"Procurando o arquivo: {nome_do_arquivo}...")

# 3. O bloco de segurança (Try / Except)
try:
    # Tenta abrir o arquivo de áudio no modo de leitura binária ("rb")
    with open(nome_do_arquivo, "rb") as arquivo_de_audio:
        
        print("Arquivo encontrado! Enviando para o Whisper traduzir...")
        
        # 4. A chamada oficial para a API
        resposta = client.audio.transcriptions.create(
            model="whisper-1",
            file=arquivo_de_audio
        )
        
        # 5. Imprime o resultado final (o texto que a IA ouviu)
        print("\n=== TEXTO RECONHECIDO ===")
        print(resposta.text)
        print("=========================\n")

except FileNotFoundError:
    print(f"\n❌ Ops! O arquivo '{nome_do_arquivo}' não foi encontrado.")
    print("Dica: Grave um áudio no celular, salve nesta mesma pasta com esse nome e rode o código de novo!")
except Exception as e:
    print(f"\n❌ Ocorreu um erro na API: {e}")