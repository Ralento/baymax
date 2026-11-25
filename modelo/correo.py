"""Envío de correos por SMTP (pensado para Gmail con una "contraseña de aplicación").

Variables de entorno:
  SMTP_USER      cuenta que envía, p. ej. tucuenta@gmail.com
  SMTP_PASSWORD  contraseña de aplicación de 16 letras (NO la contraseña normal de la cuenta)
  SMTP_HOST      por defecto smtp.gmail.com
  SMTP_PORT      por defecto 587 (STARTTLS); con 465 se usa SSL directo
  SMTP_FROM      remitente visible, por defecto "Baymax <SMTP_USER>"
"""
import logging
import os
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr
from html import escape

log = logging.getLogger("baymax")


def configurado():
    return bool(os.environ.get("SMTP_USER") and os.environ.get("SMTP_PASSWORD"))


def _enviar(mensaje):
    host = os.environ.get("SMTP_HOST", "smtp.gmail.com")
    puerto = int(os.environ.get("SMTP_PORT", "587"))
    usuario = os.environ["SMTP_USER"]
    clave = os.environ["SMTP_PASSWORD"].replace(" ", "")  # Google la muestra en grupos de 4 con espacios
    contexto = ssl.create_default_context()
    if puerto == 465:
        with smtplib.SMTP_SSL(host, puerto, timeout=15, context=contexto) as s:
            s.login(usuario, clave)
            s.send_message(mensaje)
    else:
        with smtplib.SMTP(host, puerto, timeout=15) as s:
            s.starttls(context=contexto)
            s.login(usuario, clave)
            s.send_message(mensaje)


def enviar_recuperacion(destino, enlace, minutos):
    """Manda el enlace para restablecer la contraseña. Corre en segundo plano: si falla, solo se registra.

    No se propaga el error a propósito: la API responde igual exista o no la cuenta (no revela qué
    correos están registrados), así que un fallo de envío tampoco debe notarse desde fuera.
    """
    m = EmailMessage()
    m["Subject"] = "Restablece tu contraseña de Baymax"
    m["From"] = os.environ.get("SMTP_FROM") or formataddr(("Baymax", os.environ["SMTP_USER"]))
    m["To"] = destino
    m.set_content(
        f"Hola,\n\nRecibimos una solicitud para restablecer la contraseña de tu cuenta de Baymax.\n\n"
        f"Abre este enlace para elegir una nueva (vence en {minutos} minutos y solo se puede usar una vez):\n{enlace}\n\n"
        "Si tú no lo pediste, ignora este mensaje: tu contraseña no cambiará.\n\nBaymax orienta, no diagnostica."
    )
    url = escape(enlace, quote=True)
    m.add_alternative(
        f"""<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#14262c">
<h2 style="margin:0 0 12px">Restablece tu contraseña</h2>
<p>Recibimos una solicitud para restablecer la contraseña de tu cuenta de Baymax.</p>
<p><a href="{url}" style="display:inline-block;background:#4fd8c4;color:#0d1a1f;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:bold">Elegir nueva contraseña</a></p>
<p style="color:#5b6f76;font-size:14px">El enlace vence en {minutos} minutos y solo se puede usar una vez. Si tú no lo pediste, ignora este mensaje: tu contraseña no cambiará.</p>
<p style="color:#5b6f76;font-size:12px">Baymax orienta, no diagnostica.</p></div>""",
        subtype="html",
    )
    try:
        _enviar(m)
        log.info("Correo de recuperación enviado.")
    except Exception as e:  # noqa: BLE001 - cualquier fallo de red/credenciales debe quedar solo en el log
        log.error("No se pudo enviar el correo de recuperación (%s): %s", type(e).__name__, e)
