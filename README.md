# Baymax

Asistente médico digital (prototipo escolar). Recibe síntomas en texto y sugiere enfermedades probables con una red neuronal en PyTorch, y guarda el expediente médico del paciente en PostgreSQL.

> **Baymax orienta, no diagnostica.** Siempre consulta a un médico.

## Estructura
- `modelo/` — extracción de síntomas, red neuronal (`baymax.pt` ya entrenado), API FastAPI
- `frontend/` — interfaz web en React + Vite (oscura, en español)
- `db/` — esquema PostgreSQL del expediente
- `datos/` — dataset de entrenamiento (no se incluye en el repo)

## Instalación
```bash
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
```

## Uso
```bash
cd modelo
..\.venv\Scripts\python.exe -m uvicorn api:app --reload
```
Documentación interactiva en http://127.0.0.1:8000/docs

## Pruebas
```bash
cd modelo && ..\.venv\Scripts\python.exe test_baymax.py && ..\.venv\Scripts\python.exe test_api.py && ..\.venv\Scripts\python.exe test_backend.py
cd db && ..\.venv\Scripts\python.exe test_esquema.py
```
`test_esquema.py` y `test_backend.py` necesitan PostgreSQL corriendo (`DATABASE_URL`, por defecto `postgresql://postgres@localhost/baymax`).

## Dataset
Para reentrenar (`python modelo/entrenar.py`), descarga `disease_symptoms_2023.csv` (182 MB) a `datos/`:

Disease and symptoms dataset 2023, Mendeley Data, DOI [10.17632/2cxccsxydc.1](https://doi.org/10.17632/2cxccsxydc.1), licencia CC BY 4.0. Datos sintéticos: la precisión del modelo no vale como dato clínico.

## Base de datos y backend
Todo se guarda en PostgreSQL: cuentas, expediente y consultas guardadas.
```bash
psql -d baymax -f db/esquema.sql        # una sola vez: crea las tablas (usuarios, pacientes, vacunas, ...)
```
Variables de entorno (opcionales en desarrollo):
- `DATABASE_URL` — por defecto `postgresql://postgres@localhost/baymax`
- `JWT_SECRET` — firma las sesiones. Si falta, se genera uno aleatorio en `modelo/.jwt_secret` (ignorado por git). **Defínelo en producción.**
- `FRONTEND_URL` — base de los enlaces de recuperación (por defecto `http://localhost:5173`)

Rutas principales (documentación completa en `/docs`): `POST /auth/registro`, `POST /auth/login`, `GET /expediente`, `PUT /expediente/paciente`, `POST|PUT|DELETE /expediente/{antecedentes|vacunas|tratamientos|cronicas|consultas}`, `POST /predict`.

**Recuperar contraseña:** aún no hay servidor de correo; el enlace de recuperación se imprime en la consola de la API (`uvicorn`). Para producción, sustituir ese `log.warning` en `modelo/auth.py` por el envío del correo.

## Frontend
```bash
cd frontend && npm install && npm run dev      # http://localhost:5173
```
Vite reenvía todo lo que empieza con `/api` a la API (puerto 8000), así que enciende también `uvicorn api:app` y PostgreSQL. El cliente HTTP está en `frontend/src/lib/servidor.js`.
