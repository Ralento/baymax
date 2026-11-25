# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack
React + Vite (elegido por el usuario) en `frontend/`; API FastAPI existente en `modelo/`. Herramientas añadidas: react-router-dom (rutas), lucide-react (iconos).

## Users
[Asumido; el usuario no respondió a la pregunta] Pacientes y público general que describen sus síntomas en texto y llevan su propio expediente médico. Lenguaje claro, no técnico. Contexto de uso: móvil o laptop, a menudo con preocupación o malestar.

## Product Purpose
Asistente médico digital (prototipo escolar). Recibe síntomas en texto y sugiere enfermedades probables con una red neuronal en PyTorch; guarda el expediente médico del paciente (PostgreSQL). Éxito: el usuario entiende qué le orientan y dónde registrar y consultar su historial sin ayuda.

## Positioning
Orienta, no diagnostica: toda predicción lleva el aviso de consultar a un médico y detecta señales de emergencia sobre cualquier predicción.

## Capabilities and Constraints
- API real: `POST /predict` {texto, top} -> {sintomas, emergencia, aviso, posibles[{id, nombre, probabilidad}]}.
- Expediente (esquema `db/esquema.sql`): pacientes, antecedentes (enfermedad, cirugía, alergia, hospitalización, familiar), vacunas, tratamientos, enfermedades crónicas.
- Backend completo en `modelo/` (FastAPI + PostgreSQL): cuentas con contraseña bcrypt y sesión JWT; expediente, consultas guardadas y borrado de cuenta (en cascada) por usuario. Cada usuario solo accede a lo suyo.
- Recuperación de contraseña con enlace de un solo uso que vence en 30 minutos. [Pendiente] No hay servidor de correo: el enlace se imprime en el log de la API.
- [Pendiente] Sin límite de intentos de login.
- Idioma: español (México). Modo oscuro único, sin modo claro (decisión del usuario).

## Brand Commitments
Nombre Baymax. Minimalista, formal, con presencia y seriedad; paleta que comunique salud; iconos resaltables; interfaz fluida y cómoda.

## Evidence on Hand
Sin testimonios, usuarios ni métricas reales. Los datos de precisión del modelo son sintéticos y no valen como dato clínico: no mostrarlos como claim.

## Product Principles
1. Orientar sin diagnosticar: el aviso y la emergencia nunca se esconden.
2. Un paso claro por pantalla; lenguaje de persona, no de historia clínica.
3. Los datos médicos del usuario son suyos: privacidad visible, nada inventado.
4. Calma ante la preocupación: sin alarmismo salvo emergencia real.

## Accessibility & Inclusion
Contraste AA mínimo, foco de teclado visible, objetivos táctiles ≥44px, `prefers-reduced-motion` respetado.
