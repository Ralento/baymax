const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

// "2024-03-09" -> "9 mar 2024". Se parte el texto a mano para evitar el desfase de zona horaria de new Date('YYYY-MM-DD').
export function fechaCorta(iso) {
  if (!iso) return ''
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number)
  return `${d} ${MESES[m - 1]} ${a}`
}

export function fechaHora(ms) {
  const f = new Date(ms)
  return `${f.getDate()} ${MESES[f.getMonth()]} ${f.getFullYear()}, ${String(f.getHours()).padStart(2, '0')}:${String(f.getMinutes()).padStart(2, '0')}`
}

export const hoyISO = () => {
  const f = new Date()
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`
}

export function edad(iso) {
  if (!iso) return null
  const [a, m, d] = iso.split('-').map(Number)
  const h = new Date()
  let e = h.getFullYear() - a
  if (h.getMonth() + 1 < m || (h.getMonth() + 1 === m && h.getDate() < d)) e--
  return e
}

export function saludo(nombre) {
  const h = new Date().getHours()
  const franja = h < 12 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches'
  return `${franja}, ${nombre.trim().split(' ')[0]}`
}

export const iniciales = (nombre) =>
  nombre.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?'

// Un tratamiento está vigente si no tiene fecha de fin o esta todavía no llega (misma regla que db/esquema.sql).
export const vigente = (t) => !t.fecha_fin || t.fecha_fin >= hoyISO()

export const SEXOS = { F: 'Femenino', M: 'Masculino', X: 'Otro' }
export const SANGRES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
