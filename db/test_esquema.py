"""Prueba del esquema: python test_esquema.py (con PostgreSQL corriendo).

Todo corre en una transacción que se deshace al final, así que no deja datos en la base.
"""
import os
from pathlib import Path

import psycopg
from psycopg import errors

URL = os.environ.get("DATABASE_URL", "postgresql://postgres@localhost/baymax")
ESQUEMA = (Path(__file__).parent / "esquema.sql").read_text(encoding="utf-8")

with psycopg.connect(URL) as conn:
    cur = conn.cursor()
    cur.execute("CREATE SCHEMA prueba; SET LOCAL search_path TO prueba")  # aislado de las tablas reales
    cur.execute(ESQUEMA)

    cur.execute("INSERT INTO usuarios (email, nombre, password_hash) VALUES ('ana@correo.com', 'Ana Gómez', 'hash') RETURNING id")
    uid = cur.fetchone()[0]
    cur.execute(
        "INSERT INTO pacientes (usuario_id, curp, nombre, fecha_nacimiento, sexo, tipo_sangre)"
        " VALUES (%s, 'GOMA900101HDFRRN09', 'Ana Gómez', '1990-01-01', 'F', 'O+') RETURNING id",
        (uid,),
    )
    pid = cur.fetchone()[0]
    cur.execute("INSERT INTO antecedentes (paciente_id, tipo, descripcion) VALUES (%s, 'alergia', 'Penicilina')", (pid,))
    cur.execute("INSERT INTO vacunas (paciente_id, vacuna, dosis, fecha_aplicacion) VALUES (%s, 'Influenza', 'Anual', '2025-10-01')", (pid,))
    cur.execute("INSERT INTO tratamientos (paciente_id, medicamento, fecha_inicio) VALUES (%s, 'Metformina', '2024-03-01')", (pid,))
    cur.execute("INSERT INTO enfermedades_cronicas (paciente_id, enfermedad) VALUES (%s, 'Diabetes tipo 2')", (pid,))

    cur.execute("INSERT INTO consultas (paciente_id, texto) VALUES (%s, 'tos')", (pid,))

    TABLAS = ["antecedentes", "vacunas", "tratamientos", "enfermedades_cronicas", "consultas"]

    def filas_del_paciente():
        return [cur.execute(f"SELECT count(*) FROM {t} WHERE paciente_id = %s", (pid,)).fetchone()[0] for t in TABLAS]

    assert filas_del_paciente() == [1, 1, 1, 1, 1]

    cur.execute("INSERT INTO usuarios (email, nombre, password_hash) VALUES ('luis@correo.com', 'Luis', 'hash') RETURNING id")
    uid2 = cur.fetchone()[0]

    # La base debe rechazar datos inválidos.
    INVALIDOS = [
        (f"INSERT INTO pacientes (usuario_id, nombre, sexo) VALUES ({uid2}, 'X', 'Z')", errors.CheckViolation),
        (f"INSERT INTO pacientes (usuario_id, nombre, sexo, tipo_sangre) VALUES ({uid2}, 'X', 'F', 'C+')", errors.CheckViolation),
        (f"INSERT INTO pacientes (usuario_id, nombre, sexo, curp) VALUES ({uid2}, 'X', 'F', 'corto')", errors.CheckViolation),
        (f"INSERT INTO pacientes (usuario_id, nombre, sexo) VALUES ({uid2}, '', 'F')", errors.CheckViolation),
        (f"INSERT INTO pacientes (usuario_id, nombre, sexo, curp) VALUES ({uid2}, 'X', 'F', 'GOMA900101HDFRRN09')", errors.UniqueViolation),
        (f"INSERT INTO pacientes (usuario_id, nombre) VALUES ({uid}, 'otro expediente del mismo usuario')", errors.UniqueViolation),
        ("INSERT INTO usuarios (email, nombre, password_hash) VALUES ('Mayus@correo.com', 'X', 'h')", errors.CheckViolation),
        (f"INSERT INTO tratamientos (paciente_id, medicamento, fecha_inicio, fecha_fin) VALUES ({pid}, 'X', '2024-03-01', '2024-01-01')", errors.CheckViolation),
        (f"INSERT INTO antecedentes (paciente_id, tipo, descripcion) VALUES ({pid}, 'otro', 'X')", errors.CheckViolation),
        ("INSERT INTO vacunas (paciente_id, vacuna, fecha_aplicacion) VALUES (999999, 'X', '2025-01-01')", errors.ForeignKeyViolation),
    ]
    for sql, error in INVALIDOS:
        try:
            with conn.transaction():  # savepoint: el error no aborta la transacción de la prueba
                cur.execute(sql)
        except error:
            continue
        raise AssertionError(f"no rechazó: {sql}")

    # Borrar al paciente borra su expediente completo.
    cur.execute("DELETE FROM pacientes WHERE id = %s", (pid,))
    assert filas_del_paciente() == [0, 0, 0, 0, 0]

    conn.rollback()
print("OK: esquema")
