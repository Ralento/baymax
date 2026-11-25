# Frontend de Baymax

Interfaz web en React + Vite, en español y con modo oscuro único. Habla con la API de `modelo/` (FastAPI + PostgreSQL).

## Correr
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # versión de producción en dist/
npm run lint
```
Necesita la API encendida (`uvicorn api:app` en `modelo/`, puerto 8000) y PostgreSQL. Vite reenvía todo lo que empieza con `/api` a la API quitando el prefijo (`/api/auth/login` → `http://127.0.0.1:8000/auth/login`), así que no hay que configurar CORS y las rutas de la interfaz (`/expediente`) no chocan con las de la API. Ver `vite.config.js`.

## Pantallas
| Ruta | Pantalla |
|---|---|
| `/ingresar`, `/registro` | Autenticación |
| `/recuperar`, `/restablecer?token=` | Recuperar contraseña (enlace de un solo uso) |
| `/` | Inicio: consulta rápida, tratamientos en curso, última consulta, pendientes del expediente |
| `/consulta` | Síntomas → posibles causas (modelo real), alerta de emergencia, historial guardado |
| `/expediente/:seccion?` | Datos personales, antecedentes, vacunas, tratamientos, crónicas |
| `/perfil` | Nombre, contraseña, cerrar sesión, eliminar cuenta |

Las rutas privadas pasan por `Protegida` (`components/Layout.jsx`): sin sesión redirigen a `/ingresar`.

## Estructura de `src/`
- `lib/servidor.js` — **único** lugar con `fetch`. Maneja el token JWT (`localStorage`), traduce errores de FastAPI a frases legibles y cierra la sesión si el token vence. Convierte `null` en texto vacío para los formularios.
- `lib/api.js` — `predecir()` con mensajes de error propios del modelo.
- `lib/util.js` — fechas, edad, saludo, constantes (sexos, tipos de sangre).
- `context/AuthContext.jsx` — estado global (`user`, `datos`). Cada operación llama primero al servidor y solo actualiza la pantalla si este confirma, así que lo que se ve es lo que está guardado.
- `components/` — `ui.jsx` (botones, campos con errores accesibles, avisos, iconos), `Layout.jsx` (barra lateral, barra inferior móvil, rutas protegidas), `Logo.jsx` (la cara de Baymax en SVG).
- `pages/` — una por pantalla. `Expediente.jsx` describe cada sección como datos (`SECCIONES`: campos, validación, cómo se ve cada fila) y un solo componente genera lista y formulario; los nombres de campos coinciden con las columnas de `db/esquema.sql`.
- `index.css` — tokens de color (`:root`), tipografía y estilos de todos los componentes.

## Diseño
Oscuro único (sin modo claro), teal clínico sobre tinta azul-verdosa; ámbar para avisos y coral solo para emergencias. Tipografía Hanken Grotesk autoalojada. Los iconos (lucide-react) van en recuadros tintados que se iluminan al interactuar. En móvil la navegación pasa a una barra inferior. Respeta `prefers-reduced-motion`.

El contexto de producto está en `../PRODUCT.md`.
