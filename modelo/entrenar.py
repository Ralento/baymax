"""Entrena la red con el dataset de Mendeley (773 enfermedades, 377 síntomas, CC BY 4.0)."""
import csv

import numpy as np
import torch
from torch import nn

from baymax import DATASET, PESOS, SINONIMOS, crear_red


def cargar_dataset():
    with open(DATASET, encoding="utf-8") as f:
        lector = csv.reader(f)
        columnas = next(lector)[1:]
        etiquetas, filas = [], []
        for fila in lector:
            etiquetas.append(fila[0])
            filas.append(np.array([v == "1" for v in fila[1:]]))
    faltan = set(columnas) - SINONIMOS.keys()
    assert not faltan, f"síntomas sin traducción en sintomas_es.csv: {faltan}"
    enfermedades = sorted(set(etiquetas))
    indice = {e: i for i, e in enumerate(enfermedades)}
    X = torch.from_numpy(np.stack(filas).astype(np.uint8))
    y = torch.tensor([indice[e] for e in etiquetas])
    return X, y, columnas, enfermedades


def evaluar(red, X, y):
    red.eval()
    with torch.no_grad():
        logits = red(X.float())
    top1 = (logits.argmax(1) == y).float().mean().item()
    top3 = (logits.topk(3).indices == y.unsqueeze(1)).any(1).float().mean().item()
    return top1, top3


def entrenar(epocas=8):
    torch.manual_seed(0)
    X, y, columnas, enfermedades = cargar_dataset()
    print(f"{len(y)} casos, {len(enfermedades)} enfermedades, {len(columnas)} síntomas")
    orden = torch.randperm(len(y))
    corte = int(len(y) * 0.9)
    entreno, prueba = orden[:corte], orden[corte:]

    red = crear_red(len(columnas), len(enfermedades))
    optim = torch.optim.Adam(red.parameters(), lr=1e-3)
    perdida = nn.CrossEntropyLoss()
    for epoca in range(epocas):
        red.train()
        for lote in entreno[torch.randperm(len(entreno))].split(512):
            optim.zero_grad()
            perdida(red(X[lote].float()), y[lote]).backward()
            optim.step()
        top1, top3 = evaluar(red, X[prueba], y[prueba])
        print(f"Época {epoca + 1}: top-1 {top1:.1%}, top-3 {top3:.1%}")

    torch.save({"pesos": red.state_dict(), "sintomas": columnas, "enfermedades": enfermedades}, PESOS)
    print(f"Modelo guardado en {PESOS}")
    return top1, top3


if __name__ == "__main__":
    entrenar()
