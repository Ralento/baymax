"""Baymax: síntomas en texto -> enfermedades probables (orientación, no diagnóstico)."""
import csv
import re
import sys
import unicodedata
from pathlib import Path

import torch
from torch import nn

DIR = Path(__file__).parent
DATASET = DIR.parent / "datos" / "disease_symptoms_2023.csv"
SINONIMOS_CSV = DIR / "sintomas_es.csv"
ENFERMEDADES_CSV = DIR / "enfermedades_es.csv"
PESOS = DIR / "baymax.pt"

AVISO = "Baymax orienta, no diagnostica. Consulta a un médico."

# Señales de alarma: se avisa de urgencias sin importar la predicción.
EMERGENCIA_SINTOMAS = {
    "shortness of breath", "difficulty breathing", "sharp chest pain", "chest tightness", "fainting",
    "seizures", "vomiting blood", "hemoptysis", "slurring words", "focal weakness",
}
EMERGENCIA_FRASES = ["inconsciente", "paralisis", "sangrado abundante", "mucha sangre", "suicid", "quiero morir", "quitarme la vida"]


def normalizar(texto):
    sin_acentos = unicodedata.normalize("NFD", texto.lower())
    return "".join(c for c in sin_acentos if unicodedata.category(c) != "Mn")


def a_regex(frase):
    # "cansad*" es raíz (cansado, cansada); sin "*" la frase debe ser palabra completa ("tos" no está en "tostada").
    if frase.endswith("*"):
        return re.escape(normalizar(frase[:-1]))
    return re.escape(normalizar(frase)) + r"\b"


def cargar_sinonimos():
    """{síntoma del dataset: (nombre en español, regex de sus frases)}."""
    with open(SINONIMOS_CSV, encoding="utf-8") as f:
        filas = list(csv.DictReader(f))
    return {
        f["sintoma"]: (f["nombre"], re.compile(r"\b(?:" + "|".join(a_regex(p) for p in f["frases"].split("|")) + ")"))
        for f in filas
    }


SINONIMOS = cargar_sinonimos()

with open(ENFERMEDADES_CSV, encoding="utf-8") as f:
    NOMBRES_ES = {fila["enfermedad"]: fila["nombre"] for fila in csv.DictReader(f)}


def extraer_sintomas(texto):
    # shortcut: coincidencia por frases, no entiende negaciones ("no tengo fiebre"); cambiar a un modelo de lenguaje cuando haya datos reales.
    t = normalizar(texto)
    return [s for s, (_, patron) in SINONIMOS.items() if patron.search(t)]


def crear_red(n_sintomas, n_enfermedades):
    return nn.Sequential(nn.Linear(n_sintomas, 512), nn.ReLU(), nn.Dropout(0.3), nn.Linear(512, n_enfermedades))


def cargar_modelo():
    datos = torch.load(PESOS)
    red = crear_red(len(datos["sintomas"]), len(datos["enfermedades"]))
    red.load_state_dict(datos["pesos"])
    red.eval()
    return red, datos["sintomas"], datos["enfermedades"]


_modelo = None


def predecir(texto, top=3):
    global _modelo
    if _modelo is None:
        _modelo = cargar_modelo()
    red, columnas, enfermedades = _modelo
    sintomas = extraer_sintomas(texto)
    resultado = {
        "sintomas": list(dict.fromkeys(SINONIMOS[s][0] for s in sintomas)),
        "emergencia": bool(EMERGENCIA_SINTOMAS & set(sintomas)) or any(f in normalizar(texto) for f in EMERGENCIA_FRASES),
        "aviso": AVISO,
        "posibles": [],
    }
    if not sintomas:
        return resultado
    v = torch.zeros(len(columnas))
    for s in sintomas:
        v[columnas.index(s)] = 1.0
    with torch.no_grad():
        valores, indices = torch.softmax(red(v), dim=0).topk(top)
    resultado["posibles"] = [
        {"id": enfermedades[i], "nombre": NOMBRES_ES.get(enfermedades[i], enfermedades[i]), "probabilidad": round(p.item(), 3)}
        for p, i in zip(valores, indices.tolist())
    ]
    return resultado


if __name__ == "__main__":
    r = predecir(" ".join(sys.argv[1:]) or input("¿Qué síntomas tienes? "))
    if r["emergencia"]:
        print("⚠️  POSIBLE EMERGENCIA: acude a urgencias o llama al 911.")
    print("Síntomas detectados:", ", ".join(r["sintomas"]) or "ninguno")
    for e in r["posibles"]:
        print(f"  {e['nombre']}: {e['probabilidad']:.0%}")
    print(r["aviso"])
