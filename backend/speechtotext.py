from faster_whisper import WhisperModel
import time

print("Iniciando o Whisper... (O download do modelo compactado ocorrerá agora, apenas na 1ª vez)")

inicio_carregamento = time.time()

modelo = WhisperModel("large-v3", device="cpu", compute_type="int8")

tempo_carregamento = time.time() - inicio_carregamento
print(f"Modelo carregado na memória em {tempo_carregamento:.2f} segundos.\n")

print("Transcrevendo o áudio...")
inicio_transcricao = time.time()

segmentos, informacoes = modelo.transcribe("teste_de_voz.mp3", language="pt")

print("\n=== TEXTO RECONHECIDO ===")
for segmento in segmentos:
    print(segmento.text)
print("=========================\n")

tempo_transcricao = time.time() - inicio_transcricao
print(f"Tempo total de transcrição: {tempo_transcricao:.2f} segundos.")