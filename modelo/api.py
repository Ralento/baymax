"""API de Baymax. Arrancar desde modelo/: uvicorn api:app --reload"""
import config  # noqa: F401  (carga modelo/.env antes que todo lo demás)
from fastapi import FastAPI
from pydantic import BaseModel, Field

import auth
import expediente
from baymax import predecir

app = FastAPI(title="Baymax", description="Orientación médica por síntomas y expediente. No es un diagnóstico.")
app.include_router(auth.router)
app.include_router(expediente.router)


class Consulta(BaseModel):
    texto: str = Field(min_length=1, max_length=2000, examples=["tengo fiebre, tos y me duele el cuerpo"])
    top: int = Field(3, ge=1, le=10)


@app.post("/predict")
def predict(consulta: Consulta):
    return predecir(consulta.texto, top=consulta.top)
