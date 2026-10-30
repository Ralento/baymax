"""API de Baymax. Arrancar desde modelo/: uvicorn api:app --reload"""
from fastapi import FastAPI
from pydantic import BaseModel, Field

from baymax import predecir

app = FastAPI(title="Baymax", description="Orientación médica por síntomas. No es un diagnóstico.")


class Consulta(BaseModel):
    texto: str = Field(min_length=1, max_length=2000, examples=["tengo fiebre, tos y me duele el cuerpo"])
    top: int = Field(3, ge=1, le=10)


@app.post("/predict")
def predict(consulta: Consulta):
    return predecir(consulta.texto, top=consulta.top)
