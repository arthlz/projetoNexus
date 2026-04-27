# Para rodar o código, executar no terminal: uvicorn main:app --reload
from fastapi import FastAPI
from room_routes import room_router
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"]
)

# voice_router removido: a rota de voz foi integrada ao room_router.py como /room/{room_id}/entrevista
app.include_router(room_router)

@app.get("/")
async def root():
    return {
        "message": "Este é o Nexus."
    }
