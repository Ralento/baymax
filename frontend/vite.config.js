import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// En desarrollo, todo lo que empieza con /api se reenvía a la API FastAPI (uvicorn api:app, puerto 8000),
// quitando el prefijo: /api/auth/login -> http://127.0.0.1:8000/auth/login.
// Así el navegador cree que todo es el mismo origen (sin CORS) y las rutas de la interfaz
// (/expediente) no chocan con las de la API.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': { target: 'http://127.0.0.1:8000', rewrite: (ruta) => ruta.replace(/^\/api/, '') },
    },
  },
})
