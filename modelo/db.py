"""Conexión a PostgreSQL. La URL sale de DATABASE_URL (por defecto, la base local de desarrollo)."""
import os

import psycopg
from psycopg.rows import dict_row


def url():
    return os.environ.get("DATABASE_URL", "postgresql://postgres@localhost/baymax")


def conexion():
    """Dependencia de FastAPI: una conexión por petición.

    Las rutas que escriben llaman a conn.commit() ellas mismas antes de responder. Si algo falla
    antes, al salir del `with` se hace rollback y no queda nada a medias.
    """
    with psycopg.connect(url(), row_factory=dict_row) as conn:
        yield conn
