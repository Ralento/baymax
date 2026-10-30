# Baymax

Asistente médico digital (prototipo escolar). Recibe síntomas en texto y sugiere enfermedades probables con una red neuronal en PyTorch, y guarda el expediente médico del paciente en PostgreSQL.

> **Baymax orienta, no diagnostica.** Siempre consulta a un médico.

## Estructura
- `modelo/` — extracción de síntomas, red neuronal (`baymax.pt` ya entrenado), API FastAPI
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
cd modelo && ..\.venv\Scripts\python.exe test_baymax.py && ..\.venv\Scripts\python.exe test_api.py
cd db && ..\.venv\Scripts\python.exe test_esquema.py
```
`test_esquema.py` necesita PostgreSQL corriendo (`DATABASE_URL`, por defecto `postgresql://postgres@localhost/baymax`).

## Dataset
Para reentrenar (`python modelo/entrenar.py`), descarga `disease_symptoms_2023.csv` (182 MB) a `datos/`:

Disease and symptoms dataset 2023, Mendeley Data, DOI [10.17632/2cxccsxydc.1](https://doi.org/10.17632/2cxccsxydc.1), licencia CC BY 4.0. Datos sintéticos: la precisión del modelo no vale como dato clínico.
