"""Pruebas del backend (cuentas + expediente): python test_backend.py, con PostgreSQL corriendo.

Corre contra un esquema temporal ("prueba_api") dentro de la base, que se borra al terminar:
no toca los datos reales.
"""
import os
from pathlib import Path

import psycopg

BASE = os.environ.get("DATABASE_URL", "postgresql://postgres@localhost/baymax").split("?")[0]
ESQUEMA = (Path(__file__).parent.parent / "db" / "esquema.sql").read_text(encoding="utf-8")
SCHEMA = "prueba_api"

with psycopg.connect(BASE, autocommit=True) as admin:
    admin.execute(f"DROP SCHEMA IF EXISTS {SCHEMA} CASCADE")
    admin.execute(f"CREATE SCHEMA {SCHEMA}")
os.environ["DATABASE_URL"] = f"{BASE}?options=-csearch_path%3D{SCHEMA}"
with psycopg.connect(os.environ["DATABASE_URL"], autocommit=True) as c:
    c.execute(ESQUEMA)

from fastapi.testclient import TestClient  # noqa: E402  (después de fijar DATABASE_URL)

from api import app  # noqa: E402

cl = TestClient(app)


def registrar(email, nombre="Ana Torres", password="clave12345"):
    r = cl.post("/auth/registro", json={"nombre": nombre, "email": email, "password": password})
    assert r.status_code == 201, r.text
    return {"Authorization": "Bearer " + r.json()["token"]}


try:
    # ---- Cuentas ----
    ana = registrar("Ana@Correo.com")  # el correo se guarda en minúsculas
    assert cl.post("/auth/registro", json={"nombre": "X Y", "email": "ana@correo.com", "password": "clave12345"}).status_code == 409
    assert cl.post("/auth/registro", json={"nombre": "X Y", "email": "malo", "password": "clave12345"}).status_code == 422
    assert cl.post("/auth/registro", json={"nombre": "X Y", "email": "x@y.com", "password": "corta"}).status_code == 422
    assert cl.post("/auth/registro", json={"nombre": "X Y", "email": "x@y.com", "password": "ñ" * 40}).status_code == 422  # >72 bytes

    r = cl.post("/auth/login", json={"email": "ana@correo.com", "password": "clave12345"})
    assert r.status_code == 200 and r.json()["usuario"]["email"] == "ana@correo.com"
    mal1 = cl.post("/auth/login", json={"email": "ana@correo.com", "password": "incorrecta"})
    mal2 = cl.post("/auth/login", json={"email": "nadie@correo.com", "password": "clave12345"})
    assert mal1.status_code == mal2.status_code == 401 and mal1.json() == mal2.json()  # no revela qué cuentas existen

    with psycopg.connect(os.environ["DATABASE_URL"]) as c:  # la contraseña nunca se guarda en claro
        h = c.execute("SELECT password_hash FROM usuarios WHERE email = 'ana@correo.com'").fetchone()[0]
    assert h.startswith("$2") and "clave12345" not in h

    assert cl.get("/expediente").status_code == 401
    assert cl.get("/expediente", headers={"Authorization": "Bearer basura"}).status_code == 401
    assert cl.get("/auth/yo", headers=ana).json()["nombre"] == "Ana Torres"

    # ---- Expediente vacío tras registrarse ----
    e = cl.get("/expediente", headers=ana).json()
    assert e["paciente"]["nombre"] == "Ana Torres" and e["paciente"]["sexo"] is None
    assert all(e[k] == [] for k in ["antecedentes", "vacunas", "tratamientos", "cronicas", "consultas"])

    # ---- Datos personales ----
    pac = {"nombre": "Ana Torres", "fecha_nacimiento": "1998-04-12", "sexo": "F", "tipo_sangre": "O+", "telefono": "", "curp": "TOAA980412MDFRNN09", "email": "ana@correo.com"}
    r = cl.put("/expediente/paciente", json=pac, headers=ana)
    assert r.status_code == 200 and r.json()["tipo_sangre"] == "O+" and r.json()["telefono"] is None, r.text  # "" -> NULL
    for malo in [{**pac, "sexo": "Z"}, {**pac, "tipo_sangre": "C+"}, {**pac, "curp": "corto"}, {**pac, "fecha_nacimiento": "2999-01-01"}, {**pac, "nombre": ""}]:
        assert cl.put("/expediente/paciente", json=malo, headers=ana).status_code == 422, malo

    # ---- CRUD de cada colección ----
    muestras = {
        "antecedentes": ({"tipo": "alergia", "descripcion": "Penicilina", "fecha": "", "notas": ""}, {"tipo": "cirugia", "descripcion": "Apendicectomía", "fecha": "2019-03-14"}),
        "vacunas": ({"vacuna": "Influenza", "dosis": "Anual", "fecha_aplicacion": "2025-10-20", "lote": ""}, {"vacuna": "COVID-19", "fecha_aplicacion": "2024-11-02"}),
        "tratamientos": ({"medicamento": "Loratadina", "fecha_inicio": "2026-01-10", "fecha_fin": "2999-01-01"}, {"medicamento": "Amoxicilina", "fecha_inicio": "2026-01-05", "fecha_fin": "2026-01-12"}),
        "cronicas": ({"enfermedad": "Asma", "degenerativa": False, "fecha_diagnostico": "2010-02-01"}, {"enfermedad": "Diabetes", "degenerativa": True}),
    }
    for col, (a, b) in muestras.items():
        r = cl.post(f"/expediente/{col}", json=a, headers=ana)
        assert r.status_code == 201, (col, r.text)
        id_a = r.json()["id"]
        id_b = cl.post(f"/expediente/{col}", json=b, headers=ana).json()["id"]
        assert len(cl.get("/expediente", headers=ana).json()[col]) == 2
        campo = next(k for k in a if isinstance(a[k], str) and a[k] and not k.startswith("fecha") and k != "tipo")
        r = cl.put(f"/expediente/{col}/{id_a}", json={**a, campo: "Editado"}, headers=ana)
        assert r.status_code == 200 and r.json()[campo] == "Editado", (col, r.text)
        assert cl.delete(f"/expediente/{col}/{id_b}", headers=ana).status_code == 204
        assert len(cl.get("/expediente", headers=ana).json()[col]) == 1
        assert cl.delete(f"/expediente/{col}/{id_b}", headers=ana).status_code == 404  # ya no existe

    # La base y la API rechazan datos inválidos
    assert cl.post("/expediente/antecedentes", json={"tipo": "otro", "descripcion": "X"}, headers=ana).status_code == 422
    assert cl.post("/expediente/tratamientos", json={"medicamento": "X", "fecha_inicio": "2024-03-01", "fecha_fin": "2024-01-01"}, headers=ana).status_code == 422
    assert cl.post("/expediente/vacunas", json={"vacuna": "X", "fecha_aplicacion": "2999-01-01"}, headers=ana).status_code == 422
    assert cl.post("/expediente/vacunas", json={"vacuna": "X"}, headers=ana).status_code == 422

    # ---- Consultas guardadas ----
    c = {"texto": "tengo fiebre", "sintomas": ["Fiebre"], "emergencia": False, "posibles": [{"nombre": "Influenza", "probabilidad": 0.4}]}
    r = cl.post("/expediente/consultas", json=c, headers=ana)
    assert r.status_code == 201 and r.json()["posibles"][0]["nombre"] == "Influenza" and r.json()["creada_en"], r.text
    assert cl.post("/expediente/consultas", json={**c, "posibles": [{"nombre": "X", "probabilidad": 5}]}, headers=ana).status_code == 422
    assert len(cl.get("/expediente", headers=ana).json()["consultas"]) == 1

    # ---- Aislamiento entre usuarios ----
    luis = registrar("luis@correo.com", "Luis Pérez")
    assert cl.get("/expediente", headers=luis).json()["vacunas"] == []
    mia = cl.get("/expediente", headers=ana).json()["vacunas"][0]["id"]
    assert cl.put(f"/expediente/vacunas/{mia}", json={"vacuna": "Hackeada", "fecha_aplicacion": "2025-01-01"}, headers=luis).status_code == 404
    assert cl.delete(f"/expediente/vacunas/{mia}", headers=luis).status_code == 404
    assert cl.get("/expediente", headers=ana).json()["vacunas"][0]["vacuna"] != "Hackeada"
    # CURP duplicado entre pacientes
    assert cl.put("/expediente/paciente", json={**pac, "nombre": "Luis Pérez", "email": "luis@correo.com"}, headers=luis).status_code == 409

    # ---- Contraseña ----
    assert cl.post("/auth/password", json={"actual": "incorrecta", "nueva": "otraclave99"}, headers=ana).status_code == 400
    assert cl.post("/auth/password", json={"actual": "clave12345", "nueva": "otraclave99"}, headers=ana).status_code == 204
    assert cl.post("/auth/login", json={"email": "ana@correo.com", "password": "clave12345"}).status_code == 401
    assert cl.post("/auth/login", json={"email": "ana@correo.com", "password": "otraclave99"}).status_code == 200

    # ---- Recuperación (enlace de un solo uso) ----
    import logging
    visto = []
    logging.getLogger("baymax").addHandler(type("H", (logging.Handler,), {"emit": lambda s, r: visto.append(r.getMessage())})())
    assert cl.post("/auth/recuperar", json={"email": "nadie@correo.com"}).status_code == 202 and not visto
    assert cl.post("/auth/recuperar", json={"email": "ana@correo.com"}).status_code == 202
    token = visto[0].split("token=")[1]
    assert cl.post("/auth/restablecer", json={"token": "basura", "password": "nuevaclave1"}).status_code == 401
    assert cl.post("/auth/restablecer", json={"token": token, "password": "nuevaclave1"}).status_code == 204
    assert cl.post("/auth/restablecer", json={"token": token, "password": "nuevaclave2"}).status_code == 401  # ya se usó
    assert cl.post("/auth/login", json={"email": "ana@correo.com", "password": "nuevaclave1"}).status_code == 200
    # Un token de sesión no sirve como token de recuperación
    sesion = ana["Authorization"].split()[1]
    assert cl.post("/auth/restablecer", json={"token": sesion, "password": "nuevaclave3"}).status_code == 401

    # ---- Renombrar y eliminar cuenta ----
    assert cl.patch("/auth/yo", json={"nombre": "Ana María"}, headers=ana).json()["nombre"] == "Ana María"
    assert cl.post("/auth/eliminar", json={"password": "incorrecta"}, headers=ana).status_code == 400
    assert cl.post("/auth/eliminar", json={"password": "nuevaclave1"}, headers=ana).status_code == 204
    assert cl.get("/expediente", headers=ana).status_code == 401  # la cuenta ya no existe
    with psycopg.connect(os.environ["DATABASE_URL"]) as c:  # el borrado en cascada limpió todo su expediente
        for t in ["pacientes", "antecedentes", "vacunas", "tratamientos", "enfermedades_cronicas", "consultas"]:
            n = c.execute(f"SELECT count(*) FROM {t}").fetchone()[0]
            assert n == (1 if t == "pacientes" else 0), (t, n)  # solo queda el paciente de Luis

    print("OK: backend")
finally:
    with psycopg.connect(BASE, autocommit=True) as admin:
        admin.execute(f"DROP SCHEMA IF EXISTS {SCHEMA} CASCADE")
