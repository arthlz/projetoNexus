from google import genai
from dotenv import load_dotenv
import os

load_dotenv(override=True)

print(os.getenv("GEMINI_API_KEY"))

client = genai.Client(api_key=os.getenv("AIzaSyDi04CwP90tEIB2uVckxuLhDj-RoSBklqI"))

audio = client.files.upload(file="teste_de_voz.mp3")

response = client.models.generate_content(
    model="gemini-1.5-flash",
    contents=[
        "Transcreva esse áudio para texto.",
        audio
    ]
)

print(response.text)