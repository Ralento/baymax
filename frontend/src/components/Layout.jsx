import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { FolderHeart, House, LogOut, Stethoscope, UserRound } from 'lucide-react'
import { useApp } from '../context/AuthContext'
import { iniciales } from '../lib/util'
import { Brand } from './Logo'

const NAV = [
  { to: '/', label: 'Inicio', icon: House, end: true },
  { to: '/consulta', label: 'Consulta', icon: Stethoscope },
  { to: '/expediente', label: 'Expediente', icon: FolderHeart },
  { to: '/perfil', label: 'Cuenta', icon: UserRound },
]

export function Cargando() {
  return (
    <div className="center-page" role="status" aria-label="Cargando">
      <div>
        <Brand blink />
        <span className="spinner" style={{ color: 'var(--accent)' }} aria-hidden="true" />
      </div>
    </div>
  )
}

// Envuelve las rutas privadas: sin sesión redirige a /ingresar y recuerda a dónde iba.
export function Protegida() {
  const { user, cargando } = useApp()
  const loc = useLocation()
  if (cargando) return <Cargando />
  if (!user) return <Navigate to="/ingresar" replace state={{ desde: loc.pathname }} />
  return <Layout />
}

function Layout() {
  const { user, salir } = useApp()
  const loc = useLocation()
  return (
    <div className="shell">
      <aside className="sidebar">
        <Brand />
        <nav className="nav" aria-label="Principal">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}>
              <Icon size={21} strokeWidth={1.9} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="user-pill">
            <span className="avatar">{iniciales(user.nombre)}</span>
            <div className="who">
              <b>{user.nombre}</b>
              <span>{user.email}</span>
            </div>
          </div>
          <button className="btn btn-ghost btn-block" onClick={salir}>
            <LogOut size={18} aria-hidden="true" /> Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="main">
        {/* key={pathname} reinicia la animación de entrada en cada cambio de pantalla */}
        <div className="page" key={loc.pathname.split('/')[1]}>
          <Outlet />
        </div>
      </main>

      <nav className="tabbar" aria-label="Principal">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}>
            <Icon size={22} strokeWidth={1.9} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
