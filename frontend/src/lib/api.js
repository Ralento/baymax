// El modelo se consulta a través de servidor.js; aquí se traduce el fallo de red a un mensaje sobre el modelo.
import { predecir as llamar } from './servidor'

export async function predecir(texto, top = 5) {
  try {
    return await llamar(texto, top)
  } catch (e) {
    if (e.estado === 0) throw new Error('No pude conectar con Baymax. Verifica que la API esté encendida (uvicorn api:app --reload dentro de modelo/).')
    throw new Error('Baymax no pudo analizar el texto. Intenta de nuevo con otras palabras.')
  }
}
