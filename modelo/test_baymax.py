"""Pruebas: python test_baymax.py (entrena primero si no existe baymax.pt)."""
import torch

from baymax import NOMBRES_ES, PESOS, extraer_sintomas, predecir
from entrenar import entrenar

if not PESOS.exists():
    entrenar()

sin_traducir = set(torch.load(PESOS)["enfermedades"]) - NOMBRES_ES.keys()
assert not sin_traducir, f"enfermedades sin traducción en enfermedades_es.csv: {sin_traducir}"

assert extraer_sintomas("Tengo FIEBRE y me duele la cabeza") == ["headache", "fever"]
assert extraer_sintomas("Estoy muy cansada") == ["fatigue"]
assert extraer_sintomas("tostada") == []  # "tos" solo cuenta como palabra

# Texto -> alguna de las enfermedades aceptables dentro del top 5.
CASOS = {
    "tengo fiebre, tos, me duele el cuerpo y escalofríos": {"flu", "common cold", "acute bronchitis", "pneumonia"},
    "diarrea, vómito, náusea, fiebre y escalofríos": {"infectious gastroenteritis", "noninfectious gastroenteritis"},
    "ardor al orinar, orino mucho y dolor en el bajo vientre": {"urinary tract infection", "cystitis"},
    "estornudos, nariz tapada, me lloran los ojos y me pican los ojos": {"seasonal allergies (hay fever)", "allergy", "common cold", "conjunctivitis due to allergy"},
    "dolor de garganta, fiebre, anginas inflamadas y ganglios": {"strep throat", "pharyngitis", "tonsillitis", "peritonsillar abscess"},
}
# Hueco conocido del dataset: "diabetes" tiene 1 solo caso, así que "mucha sed, orino demasiado" no la detecta.
fallos = []
for texto, aceptables in CASOS.items():
    nombres = [e["id"] for e in predecir(texto, top=5)["posibles"]]
    if not aceptables & set(nombres):
        fallos.append(f"{texto!r}: obtuvo {nombres}")
assert not fallos, "\n".join(fallos)

assert predecir("me falta el aire y dolor en el pecho")["emergencia"]
assert predecir("me desmayé")["emergencia"]
assert predecir("quiero morir")["emergencia"]
assert not predecir("tengo tos")["emergencia"]
assert predecir("hola")["posibles"] == []
print("OK: todas las pruebas pasaron")
