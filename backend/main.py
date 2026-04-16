# Para rodar o código, executar no terminal: uvicorn main:app --reload
from fastapi import FastAPI

app = FastAPI()

from room_routes import room_router

app.include_router(room_router)

@app.get("/")
async def root():
    return {
        "message": "Este é o Nexus."
    }
