"""Expediente médico del usuario con sesión: datos personales, historial, vacunas, tratamientos,
enfermedades crónicas y consultas guardadas. Todo se lee y escribe en PostgreSQL y solo del dueño."""
from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from psycopg import errors
from psycopg.types.json import Jsonb
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from auth import usuario_actual
from db import conexion

router = APIRouter(prefix="/expediente", tags=["expediente"])


class Base(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    @model_validator(mode="before")
    @classmethod
    def vacios_a_none(cls, datos):
        # El formulario manda "" en los campos opcionales vacíos; en la base deben ser NULL.
        if isinstance(datos, dict):
            return {k: (None if v == "" else v) for k, v in datos.items()}
        return datos


def no_futura(v):
    if v and v > date.today():
        raise ValueError("La fecha no puede ser futura.")
    return v


class PacienteIn(Base):
    nombre: str = Field(min_length=1, max_length=120)
    fecha_nacimiento: date | None = None
    sexo: Literal["F", "M", "X"] | None = None
    tipo_sangre: Literal["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] | None = None
    telefono: str | None = Field(None, max_length=30)
    curp: str | None = Field(None, pattern=r"^[A-Z0-9]{18}$")
    email: str | None = Field(None, max_length=254, pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$")
    _f = field_validator("fecha_nacimiento")(no_futura)


class AntecedenteIn(Base):
    tipo: Literal["enfermedad", "cirugia", "alergia", "hospitalizacion", "familiar"]
    descripcion: str = Field(min_length=1, max_length=300)
    fecha: date | None = None
    notas: str | None = Field(None, max_length=1000)
    _f = field_validator("fecha")(no_futura)


class VacunaIn(Base):
    vacuna: str = Field(min_length=1, max_length=120)
    dosis: str | None = Field(None, max_length=60)
    fecha_aplicacion: date
    lote: str | None = Field(None, max_length=60)
    _f = field_validator("fecha_aplicacion")(no_futura)


class TratamientoIn(Base):
    medicamento: str = Field(min_length=1, max_length=120)
    dosis: str | None = Field(None, max_length=60)
    frecuencia: str | None = Field(None, max_length=60)
    fecha_inicio: date
    fecha_fin: date | None = None  # puede ser futura: el tratamiento sigue vigente hasta entonces
    _f = field_validator("fecha_inicio")(no_futura)

    @model_validator(mode="after")
    def fin_despues_de_inicio(self):
        if self.fecha_fin and self.fecha_fin < self.fecha_inicio:
            raise ValueError("fecha_fin no puede ser antes de fecha_inicio.")
        return self


class CronicaIn(Base):
    enfermedad: str = Field(min_length=1, max_length=200)
    degenerativa: bool = False
    fecha_diagnostico: date | None = None
    notas: str | None = Field(None, max_length=1000)
    _f = field_validator("fecha_diagnostico")(no_futura)


class Posible(BaseModel):
    nombre: str
    probabilidad: float = Field(ge=0, le=1)


class ConsultaIn(Base):
    texto: str = Field(min_length=1, max_length=2000)
    sintomas: list[str] = Field(default_factory=list, max_length=50)
    emergencia: bool = False
    posibles: list[Posible] = Field(default_factory=list, max_length=10)


def paciente_id(conn, usuario):
    return conn.execute("SELECT id FROM pacientes WHERE usuario_id = %s", (usuario["id"],)).fetchone()["id"]


# Cada colección: (nombre en la URL, tabla, columnas editables, orden al listar, modelo de entrada).
# Los nombres de tablas y columnas salen de esta lista fija, nunca del cliente, así que el SQL es seguro.
COLECCIONES = [
    ("antecedentes", "antecedentes", ["tipo", "descripcion", "fecha", "notas"], "fecha DESC NULLS LAST, id DESC", AntecedenteIn),
    ("vacunas", "vacunas", ["vacuna", "dosis", "fecha_aplicacion", "lote"], "fecha_aplicacion DESC, id DESC", VacunaIn),
    ("tratamientos", "tratamientos", ["medicamento", "dosis", "frecuencia", "fecha_inicio", "fecha_fin"], "fecha_inicio DESC, id DESC", TratamientoIn),
    ("cronicas", "enfermedades_cronicas", ["enfermedad", "degenerativa", "fecha_diagnostico", "notas"], "enfermedad", CronicaIn),
]
CONSULTA_COLS = "id, texto, sintomas, emergencia, posibles, creada_en"


def crear_rutas(nombre, tabla, columnas, orden, Modelo):
    """Genera crear / editar / borrar para una colección. Una sola plantilla sirve a las cuatro tablas."""
    cols = ", ".join(columnas)
    marcas = ", ".join(["%s"] * len(columnas))
    sets = ", ".join(f"{c} = %s" for c in columnas)
    valores = lambda d: [getattr(d, c) for c in columnas]

    @router.post(f"/{nombre}", status_code=201, name=f"crear_{nombre}")
    def crear(d: Modelo, u=Depends(usuario_actual), conn=Depends(conexion)):
        fila = conn.execute(
            f"INSERT INTO {tabla} (paciente_id, {cols}) VALUES (%s, {marcas}) RETURNING id, {cols}",
            (paciente_id(conn, u), *valores(d)),
        ).fetchone()
        conn.commit()
        return fila

    @router.put(f"/{nombre}/{{item_id}}", name=f"editar_{nombre}")
    def editar(item_id: int, d: Modelo, u=Depends(usuario_actual), conn=Depends(conexion)):
        fila = conn.execute(
            f"UPDATE {tabla} SET {sets} WHERE id = %s AND paciente_id = %s RETURNING id, {cols}",
            (*valores(d), item_id, paciente_id(conn, u)),
        ).fetchone()
        if not fila:  # no existe o es de otro usuario: misma respuesta
            raise HTTPException(404, "No se encontró el registro.")
        conn.commit()
        return fila

    @router.delete(f"/{nombre}/{{item_id}}", status_code=204, name=f"borrar_{nombre}")
    def borrar(item_id: int, u=Depends(usuario_actual), conn=Depends(conexion)):
        hecho = conn.execute(f"DELETE FROM {tabla} WHERE id = %s AND paciente_id = %s", (item_id, paciente_id(conn, u)))
        if hecho.rowcount == 0:
            raise HTTPException(404, "No se encontró el registro.")
        conn.commit()


for _c in COLECCIONES:
    crear_rutas(*_c)


@router.get("")
def expediente_completo(u=Depends(usuario_actual), conn=Depends(conexion)):
    """Todo el expediente en una sola respuesta, para que la app lo cargue al iniciar sesión."""
    p = conn.execute(
        "SELECT id, curp, nombre, fecha_nacimiento, sexo, tipo_sangre, telefono, email FROM pacientes WHERE usuario_id = %s", (u["id"],)
    ).fetchone()
    pid = p.pop("id")
    datos = {"paciente": p}
    for nombre, tabla, columnas, orden, _ in COLECCIONES:
        datos[nombre] = conn.execute(f"SELECT id, {', '.join(columnas)} FROM {tabla} WHERE paciente_id = %s ORDER BY {orden}", (pid,)).fetchall()
    datos["consultas"] = conn.execute(f"SELECT {CONSULTA_COLS} FROM consultas WHERE paciente_id = %s ORDER BY creada_en DESC", (pid,)).fetchall()
    return datos


@router.put("/paciente")
def guardar_paciente(d: PacienteIn, u=Depends(usuario_actual), conn=Depends(conexion)):
    try:
        fila = conn.execute(
            "UPDATE pacientes SET nombre = %s, fecha_nacimiento = %s, sexo = %s, tipo_sangre = %s, telefono = %s, curp = %s, email = %s"
            " WHERE usuario_id = %s RETURNING curp, nombre, fecha_nacimiento, sexo, tipo_sangre, telefono, email",
            (d.nombre, d.fecha_nacimiento, d.sexo, d.tipo_sangre, d.telefono, d.curp, d.email, u["id"]),
        ).fetchone()
    except errors.UniqueViolation as e:
        raise HTTPException(409, "Ese CURP ya está registrado." if "curp" in (e.diag.constraint_name or "") else "Ese correo ya está en uso.")
    conn.commit()
    return fila


@router.post("/consultas", status_code=201)
def guardar_consulta(d: ConsultaIn, u=Depends(usuario_actual), conn=Depends(conexion)):
    fila = conn.execute(
        f"INSERT INTO consultas (paciente_id, texto, sintomas, emergencia, posibles) VALUES (%s, %s, %s, %s, %s) RETURNING {CONSULTA_COLS}",
        (paciente_id(conn, u), d.texto, d.sintomas, d.emergencia, Jsonb([p.model_dump() for p in d.posibles])),
    ).fetchone()
    conn.commit()
    return fila


@router.delete("/consultas/{item_id}", status_code=204)
def borrar_consulta(item_id: int, u=Depends(usuario_actual), conn=Depends(conexion)):
    hecho = conn.execute("DELETE FROM consultas WHERE id = %s AND paciente_id = %s", (item_id, paciente_id(conn, u)))
    if hecho.rowcount == 0:
        raise HTTPException(404, "No se encontró el registro.")
    conn.commit()
