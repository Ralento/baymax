"""Prueba el envío real de correo con tu configuración de modelo/.env.

Uso (desde modelo/):  ..\\.venv\\Scripts\\python.exe probar_correo.py destino@correo.com
Manda el mismo correo de recuperación, con un enlace de ejemplo que no sirve para entrar a nada.
"""
import logging
import sys

import config  # noqa: F401
import correo

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

if not correo.configurado():
    sys.exit("Falta SMTP_USER y SMTP_PASSWORD. Copia modelo/.env.example como modelo/.env y llénalo.")
if len(sys.argv) != 2:
    sys.exit("Uso: python probar_correo.py destino@correo.com")

correo.enviar_recuperacion(sys.argv[1], "http://localhost:5173/restablecer?token=PRUEBA", 30)
print("Listo. Si arriba no hay un ERROR, revisa la bandeja de entrada (y spam) de", sys.argv[1])
