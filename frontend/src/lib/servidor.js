/*
 * Cliente de la API de Baymax (FastAPI + PostgreSQL). Es la única capa que habla con el servidor:
 * el resto de la app llama a estas funciones y nunca usa fetch directamente.
 * La sesión es un token JWT que se guarda en localStorage y se manda en cada petición.
 */

const CLAVE_TOKEN = 'baymax.token'
export const token = {
  leer: () => localStorage.getItem(CLAVE_TOKEN),
  guardar: (t) => localStorage.setItem(CLAVE_TOKEN, t),
  borrar: () => localStorage.removeItem(CLAVE_TOKEN),
}

// AuthContext se suscribe aquí para cerrar la sesión en pantalla cuando el servidor dice que expiró.
let alExpirar = () => {}
export const cuandoExpire = (fn) => { alExpirar = fn }

const CAMPOS = {
  nombre: 'el nombre', email: 'el correo', password: 'la contraseña', nueva: 'la contraseña nueva', curp: 'la CURP',
  fecha_nacimiento: 'la fecha de nacimiento', sexo: 'el sexo', tipo_sangre: 'el tipo de sangre', fecha: 'la fecha',
  fecha_aplicacion: 'la fecha de aplicación', fecha_inicio: 'la fecha de inicio', fecha_fin: 'la fecha de fin',
  fecha_diagnostico: 'la fecha de diagnóstico', descripcion: 'la descripción', vacuna: 'la vacuna',
  medicamento: 'el medicamento', enfermedad: 'la enfermedad', tipo: 'el tipo', telefono: 'el teléfono',
}

// Convierte la respuesta de error de FastAPI (texto, o lista de errores de validación) en una frase legible.
function mensajeDe(detalle) {
  if (typeof detalle === 'string') return detalle
  if (Array.isArray(detalle) && detalle.length) {
    const campo = detalle[0].loc?.[detalle[0].loc.length - 1]
    return `Revisa ${CAMPOS[campo] || 'los datos'}: no es un valor válido.`
  }
  return 'No se pudo completar la acción.'
}

export class ErrorApi extends Error {
  constructor(mensaje, estado) {
    super(mensaje)
    this.estado = estado
  }
}

async function pedir(ruta, { metodo = 'GET', cuerpo, conSesion = true } = {}) {
  const cabeceras = {}
  if (cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json'
  if (conSesion && token.leer()) cabeceras.Authorization = `Bearer ${token.leer()}`

  let r
  try {
    r = await fetch(`/api${ruta}`, { method: metodo, headers: cabeceras, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) })
  } catch {
    throw new ErrorApi('No pude conectar con el servidor. Verifica que la API esté encendida e intenta de nuevo.', 0)
  }
  if (r.status === 204) return null
  const datos = await r.json().catch(() => null)
  if (!r.ok) {
    // 401 con sesión = el token venció o la cuenta ya no existe. En /auth/login un 401 es solo "contraseña incorrecta".
    if (r.status === 401 && conSesion && token.leer()) {
      token.borrar()
      alExpirar()
    }
    throw new ErrorApi(mensajeDe(datos?.detail), r.status)
  }
  return datos
}

// La API devuelve null en los campos vacíos; los formularios trabajan con texto vacío.
const aTexto = (obj) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, v === null ? '' : v]))
// La fecha de una consulta llega como ISO (creada_en); la interfaz la usa en milisegundos.
const conFecha = (c) => ({ ...aTexto(c), fecha: Date.parse(c.creada_en) })
const COLECCIONES = ['antecedentes', 'vacunas', 'tratamientos', 'cronicas']

// ---------- cuenta ----------
async function abrirSesion(ruta, cuerpo) {
  const r = await pedir(ruta, { metodo: 'POST', cuerpo, conSesion: false })
  token.guardar(r.token)
  return r.usuario
}
export const registrar = (f) => abrirSesion('/auth/registro', { nombre: f.nombre, email: f.email, password: f.password })
export const ingresar = (f) => abrirSesion('/auth/login', { email: f.email, password: f.password })
export const usuarioActual = () => pedir('/auth/yo')
export const renombrar = (nombre) => pedir('/auth/yo', { metodo: 'PATCH', cuerpo: { nombre } })
export const cambiarPassword = (actual, nueva) => pedir('/auth/password', { metodo: 'POST', cuerpo: { actual, nueva } })
export const eliminarCuenta = async (password) => {
  await pedir('/auth/eliminar', { metodo: 'POST', cuerpo: { password } })
  token.borrar()
}
export const pedirRecuperacion = (email) => pedir('/auth/recuperar', { metodo: 'POST', cuerpo: { email }, conSesion: false })
export const restablecer = (tk, password) => pedir('/auth/restablecer', { metodo: 'POST', cuerpo: { token: tk, password }, conSesion: false })

// ---------- expediente ----------
export async function cargarExpediente() {
  const d = await pedir('/expediente')
  const sal = { paciente: aTexto(d.paciente), consultas: d.consultas.map(conFecha) }
  COLECCIONES.forEach((c) => { sal[c] = d[c].map(aTexto) })
  return sal
}

export async function guardarPaciente(p) {
  return aTexto(await pedir('/expediente/paciente', { metodo: 'PUT', cuerpo: p }))
}

// Crea (sin id) o edita (con id) un elemento de una colección y devuelve la versión guardada.
export async function guardarItem(coleccion, item) {
  const { id, ...cuerpo } = item
  const r = id
    ? await pedir(`/expediente/${coleccion}/${id}`, { metodo: 'PUT', cuerpo })
    : await pedir(`/expediente/${coleccion}`, { metodo: 'POST', cuerpo })
  return coleccion === 'consultas' ? conFecha(r) : aTexto(r)
}

export const quitarItem = (coleccion, id) => pedir(`/expediente/${coleccion}/${id}`, { metodo: 'DELETE' })

// ---------- modelo ----------
export const predecir = (texto, top = 5) => pedir('/predict', { metodo: 'POST', cuerpo: { texto, top }, conSesion: false })
