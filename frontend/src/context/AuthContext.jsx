import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as api from '../lib/servidor'

const Ctx = createContext(null)
export const useApp = () => useContext(Ctx)

/*
 * Estado global: quién inició sesión (`user`) y su expediente (`datos`), que viven en PostgreSQL.
 * Cada operación llama primero al servidor y, solo si este confirma, actualiza la pantalla:
 * lo que ves siempre es lo que está guardado.
 */
export function AppProvider({ children }) {
  const [user, setUser] = useState(null)
  const [datos, setDatos] = useState(null)
  // Si hay un token guardado, hay que verificarlo con el servidor antes de decidir si se muestra la app o el login.
  const [cargando, setCargando] = useState(() => !!api.token.leer())

  const vaciar = useCallback(() => {
    setUser(null)
    setDatos(null)
  }, [])

  useEffect(() => {
    api.cuandoExpire(vaciar)
    if (!api.token.leer()) return
    Promise.all([api.usuarioActual(), api.cargarExpediente()])
      .then(([u, d]) => {
        setUser(u)
        setDatos(d)
      })
      .catch(() => {}) // un 401 ya limpia el token y la sesión; si el servidor no responde, queda en el login
      .finally(() => setCargando(false))
  }, [vaciar])

  const abrir = useCallback(async (usuario) => {
    setDatos(await api.cargarExpediente())
    setUser(usuario)
  }, [])

  const valor = useMemo(
    () => ({
      user,
      datos,
      cargando,
      registrar: async (f) => abrir(await api.registrar(f)),
      ingresar: async (f) => abrir(await api.ingresar(f)),
      salir: () => {
        api.token.borrar()
        vaciar()
      },

      guardarPaciente: async (p) => {
        const paciente = await api.guardarPaciente(p)
        setDatos((d) => ({ ...d, paciente }))
      },
      // Sirve para cualquier lista del expediente (antecedentes, vacunas, ..., consultas): crea o edita según tenga id.
      guardarItem: async (coleccion, item) => {
        const guardado = await api.guardarItem(coleccion, item)
        setDatos((d) => {
          const lista = d[coleccion]
          const existe = lista.some((x) => x.id === guardado.id)
          return { ...d, [coleccion]: existe ? lista.map((x) => (x.id === guardado.id ? guardado : x)) : [guardado, ...lista] }
        })
        return guardado
      },
      quitarItem: async (coleccion, id) => {
        await api.quitarItem(coleccion, id)
        setDatos((d) => ({ ...d, [coleccion]: d[coleccion].filter((x) => x.id !== id) }))
      },

      renombrar: async (nombre) => setUser(await api.renombrar(nombre)),
      cambiarPassword: api.cambiarPassword,
      eliminarCuenta: async (password) => {
        await api.eliminarCuenta(password)
        vaciar()
      },
    }),
    [user, datos, cargando, abrir, vaciar],
  )

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}
