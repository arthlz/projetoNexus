# Para rodar o código, executar no terminal: uvicorn main:app --reload
from fastapi import FastAPI
from room_routes import room_router
from fastapi.middleware.cors import CORSMiddleware
from voice_pipeline import voice_router

app = FastAPI()

app.include_router(voice_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

app.include_router(room_router)

@app.get("/")
async def root():
    return {
        "message": "Este é o Nexus."
    }
