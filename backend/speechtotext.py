import whisper

nome_arquivo = "teste_de_voz.mp3"

try:
    print("Carregando a IA na sua máquina...")
    model = whisper.load_model("large")

    print(f"Lendo o arquivo '{nome_arquivo}' e transcrevendo...")
    result = model.transcribe(nome_arquivo)

    print("\n------RESULTADO FINAL------")
    print(result["text"])
    print("---------------------------\n")

except FileNotFoundError:
    print(f"\nArquivo não encontrado")
except Exception as e:
    print(f"Ocorreu um erro no local: {e}")