"""Pruebas de la API: python test_api.py"""
from fastapi.testclient import TestClient

from api import app

cliente = TestClient(app)

r = cliente.post("/predict", json={"texto": "tengo fiebre, tos, me duele el cuerpo y escalofríos"})
assert r.status_code == 200, r.text
cuerpo = r.json()
assert len(cuerpo["posibles"]) == 3 and cuerpo["posibles"][0]["id"] == "flu", cuerpo
assert cuerpo["aviso"] and not cuerpo["emergencia"]

assert cliente.post("/predict", json={"texto": "me falta el aire"}).json()["emergencia"]
assert len(cliente.post("/predict", json={"texto": "tos", "top": 5}).json()["posibles"]) == 5

# Validación de entrada
assert cliente.post("/predict", json={"texto": ""}).status_code == 422
assert cliente.post("/predict", json={"texto": "x" * 2001}).status_code == 422
assert cliente.post("/predict", json={"texto": "tos", "top": 50}).status_code == 422
assert cliente.post("/predict", json={}).status_code == 422
print("OK: API")
