"""Cuentas: registro, inicio de sesión, recuperación de contraseña y borrado. Sesión con JWT (Bearer)."""
import logging
import os
import re
import secrets
import time
from pathlib import Path

import bcrypt
import config  # noqa: F401  (carga modelo/.env: el secreto y el SMTP salen de ahí)
import correo
import jwt
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from psycopg import errors
from pydantic import BaseModel, Field, field_validator

from db import conexion

log = logging.getLogger("baymax")
router = APIRouter(prefix="/auth", tags=["cuenta"])

def _secreto():
    """JWT_SECRET si existe; si no, uno aleatorio guardado en modelo/.jwt_secret (ignorado por git).

    Así las sesiones sobreviven a reinicios en desarrollo sin que haya un secreto público en el código.
    En producción define JWT_SECRET.
    """
    if os.environ.get("JWT_SECRET"):
        return os.environ["JWT_SECRET"]
    archivo = Path(__file__).parent / ".jwt_secret"
    if not archivo.exists():
        archivo.write_text(secrets.token_hex(32))
    return archivo.read_text().strip()


SECRETO = _secreto()
SESION_DIAS = 7
RESET_MINUTOS = 30
FRONTEND = os.environ.get("FRONTEND_URL", "http://localhost:5173")
RE_EMAIL = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$")


# ---------- contraseñas y tokens ----------
def hashear(password):
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verificar(password, hash_):
    return bcrypt.checkpw(password.encode(), hash_.encode())


# Hash falso para gastar el mismo tiempo cuando el correo no existe (evita adivinar qué cuentas hay por la latencia).
_FALSO = hashear("no-existe")


def crear_token(usuario_id, proposito="acceso", segundos=SESION_DIAS * 86400, extra=None):
    ahora = int(time.time())
    return jwt.encode(
        {"sub": str(usuario_id), "prp": proposito, "iat": ahora, "exp": ahora + segundos, **(extra or {})},
        SECRETO, algorithm="HS256",
    )


def leer_token(token, proposito):
    try:
        datos = jwt.decode(token, SECRETO, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(401, "La sesión no es válida o expiró.")
    if datos.get("prp") != proposito:
        raise HTTPException(401, "La sesión no es válida o expiró.")
    return datos


_bearer = HTTPBearer(auto_error=False)


def usuario_actual(cred: HTTPAuthorizationCredentials | None = Depends(_bearer), conn=Depends(conexion)):
    """Dependencia: exige sesión y devuelve la fila del usuario. Todas las rutas del expediente la usan."""
    if not cred:
        raise HTTPException(401, "Inicia sesión para continuar.")
    datos = leer_token(cred.credentials, "acceso")
    u = conn.execute("SELECT id, email, nombre FROM usuarios WHERE id = %s", (int(datos["sub"]),)).fetchone()
    if not u:
        raise HTTPException(401, "La sesión no es válida o expiró.")
    return u


# ---------- modelos de entrada ----------
def _password(v):
    if len(v.encode()) > 72:  # límite de bcrypt
        raise ValueError("La contraseña es demasiado larga.")
    return v


class Registro(BaseModel):
    nombre: str = Field(min_length=2, max_length=120)
    email: str = Field(max_length=254)
    password: str = Field(min_length=8, max_length=72)

    @field_validator("nombre")
    @classmethod
    def _nombre(cls, v):
        return v.strip()

    @field_validator("email")
    @classmethod
    def _email(cls, v):
        v = v.strip().lower()
        if not RE_EMAIL.match(v):
            raise ValueError("Correo no válido.")
        return v

    _p = field_validator("password")(_password)


class Login(BaseModel):
    email: str = Field(max_length=254)
    password: str = Field(max_length=72)


class CambioPassword(BaseModel):
    actual: str = Field(max_length=72)
    nueva: str = Field(min_length=8, max_length=72)
    _p = field_validator("nueva")(_password)


class SoloNombre(BaseModel):
    nombre: str = Field(min_length=2, max_length=120)


class SoloPassword(BaseModel):
    password: str = Field(max_length=72)


class PedirReset(BaseModel):
    email: str = Field(max_length=254)


class Reset(BaseModel):
    token: str
    password: str = Field(min_length=8, max_length=72)
    _p = field_validator("password")(_password)


def _sesion(u):
    return {"token": crear_token(u["id"]), "usuario": {"id": u["id"], "email": u["email"], "nombre": u["nombre"]}}


# ---------- rutas ----------
@router.post("/registro", status_code=201)
def registro(d: Registro, conn=Depends(conexion)):
    try:
        u = conn.execute(
            "INSERT INTO usuarios (email, nombre, password_hash) VALUES (%s, %s, %s) RETURNING id, email, nombre",
            (d.email, d.nombre, hashear(d.password)),
        ).fetchone()
    except errors.UniqueViolation:
        raise HTTPException(409, "Ya existe una cuenta con ese correo.")
    # Al registrarse se crea el expediente vacío, ligado a la cuenta.
    conn.execute("INSERT INTO pacientes (usuario_id, nombre, email) VALUES (%s, %s, %s)", (u["id"], u["nombre"], u["email"]))
    conn.commit()
    return _sesion(u)


@router.post("/login")
def login(d: Login, conn=Depends(conexion)):
    u = conn.execute("SELECT id, email, nombre, password_hash FROM usuarios WHERE email = %s", (d.email.strip().lower(),)).fetchone()
    ok = verificar(d.password, u["password_hash"] if u else _FALSO)
    # Mismo mensaje para correo inexistente y contraseña errónea: no revela qué cuentas existen.
    if not u or not ok:
        raise HTTPException(401, "Correo o contraseña incorrectos.")
    return _sesion(u)


@router.get("/yo")
def yo(u=Depends(usuario_actual)):
    return u


@router.patch("/yo")
def renombrar(d: SoloNombre, u=Depends(usuario_actual), conn=Depends(conexion)):
    fila = conn.execute("UPDATE usuarios SET nombre = %s WHERE id = %s RETURNING id, email, nombre", (d.nombre.strip(), u["id"])).fetchone()
    conn.commit()
    return fila


@router.post("/password", status_code=204)
def cambiar_password(d: CambioPassword, u=Depends(usuario_actual), conn=Depends(conexion)):
    actual = conn.execute("SELECT password_hash FROM usuarios WHERE id = %s", (u["id"],)).fetchone()
    if not verificar(d.actual, actual["password_hash"]):
        raise HTTPException(400, "La contraseña actual no es correcta.")
    conn.execute("UPDATE usuarios SET password_hash = %s WHERE id = %s", (hashear(d.nueva), u["id"]))
    conn.commit()


@router.post("/eliminar", status_code=204)
def eliminar(d: SoloPassword, u=Depends(usuario_actual), conn=Depends(conexion)):
    actual = conn.execute("SELECT password_hash FROM usuarios WHERE id = %s", (u["id"],)).fetchone()
    if not verificar(d.password, actual["password_hash"]):
        raise HTTPException(400, "La contraseña no es correcta.")
    conn.execute("DELETE FROM usuarios WHERE id = %s", (u["id"],))  # el ON DELETE CASCADE borra todo el expediente
    conn.commit()


@router.post("/recuperar", status_code=202)
def recuperar(d: PedirReset, fondo: BackgroundTasks, conn=Depends(conexion)):
    """Genera un enlace de un solo uso y lo envía por correo (SMTP, ver correo.py).

    Siempre responde igual, exista o no la cuenta, para no revelar qué correos están registrados.
    El envío va en segundo plano para que la respuesta tarde lo mismo en ambos casos. Sin SMTP
    configurado (desarrollo), el enlace se imprime en el log de la API.
    """
    u = conn.execute("SELECT id, password_hash FROM usuarios WHERE email = %s", (d.email.strip().lower(),)).fetchone()
    if u:
        # `h` ata el token al hash actual: al cambiar la contraseña, el enlace deja de servir (un solo uso).
        token = crear_token(u["id"], "reset", RESET_MINUTOS * 60, {"h": u["password_hash"][-16:]})
        enlace = f"{FRONTEND}/restablecer?token={token}"
        if correo.configurado():
            fondo.add_task(correo.enviar_recuperacion, d.email.strip().lower(), enlace, RESET_MINUTOS)
        else:
            log.warning("SMTP sin configurar; enlace de recuperación para %s: %s", d.email, enlace)
    return {"mensaje": "Si existe una cuenta con ese correo, te enviamos un enlace para restablecer la contraseña."}


@router.post("/restablecer", status_code=204)
def restablecer(d: Reset, conn=Depends(conexion)):
    datos = leer_token(d.token, "reset")
    u = conn.execute("SELECT id, password_hash FROM usuarios WHERE id = %s", (int(datos["sub"]),)).fetchone()
    if not u or u["password_hash"][-16:] != datos.get("h"):
        raise HTTPException(401, "El enlace no es válido o ya se usó.")
    conn.execute("UPDATE usuarios SET password_hash = %s WHERE id = %s", (hashear(d.password), u["id"]))
    conn.commit()
