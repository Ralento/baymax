"""Carga modelo/.env (si existe) en las variables de entorno. Se importa antes que el resto.

Formato: una línea CLAVE=valor por variable; # para comentarios. Las variables ya definidas en el
sistema tienen prioridad sobre el archivo. El .env está ignorado por git: ahí viven las contraseñas.
"""
import os
from pathlib import Path


def cargar_env(ruta=Path(__file__).parent / ".env"):
    if not ruta.exists():
        return
    for linea in ruta.read_text(encoding="utf-8").splitlines():
        linea = linea.strip()
        if not linea or linea.startswith("#") or "=" not in linea:
            continue
        clave, valor = linea.split("=", 1)
        os.environ.setdefault(clave.strip(), valor.strip().strip("'\""))


cargar_env()
