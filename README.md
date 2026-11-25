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
- Todas pueden ir en `modelo/.env` (ver `.env.example`)

Rutas principales (documentación completa en `/docs`): `POST /auth/registro`, `POST /auth/login`, `GET /expediente`, `PUT /expediente/paciente`, `POST|PUT|DELETE /expediente/{antecedentes|vacunas|tratamientos|cronicas|consultas}`, `POST /predict`.

## Correo de recuperación de contraseña (Gmail)
La API envía el enlace de recuperación por SMTP (`modelo/correo.py`, sin dependencias nuevas). Para activarlo:
1. En tu cuenta de Google activa la **verificación en 2 pasos**.
2. Crea una **contraseña de aplicación** en https://myaccount.google.com/apppasswords (16 letras; no es tu contraseña normal).
3. Copia `modelo/.env.example` como `modelo/.env` y llena `SMTP_USER` y `SMTP_PASSWORD`. El `.env` está ignorado por git.
4. Reinicia la API y prueba el envío: `cd modelo && ..\.venv\Scripts\python.exe probar_correo.py tucorreo@gmail.com`

Sin `SMTP_USER`/`SMTP_PASSWORD` (desarrollo), el enlace se imprime en la consola de la API. Si el envío falla, el error queda en el log y la API responde igual: nunca revela qué correos están registrados. Gmail limita los envíos diarios; para volumen real conviene un servicio transaccional (Resend, Brevo, SendGrid) cambiando `SMTP_HOST`/`SMTP_PORT`.

## Frontend
```bash
cd frontend && npm install && npm run dev      # http://localhost:5173
```
Vite reenvía todo lo que empieza con `/api` a la API (puerto 8000), así que enciende también `uvicorn api:app` y PostgreSQL. El cliente HTTP está en `frontend/src/lib/servidor.js`.
