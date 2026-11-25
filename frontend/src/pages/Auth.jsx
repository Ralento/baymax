import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, FolderLock, ShieldPlus, Stethoscope } from 'lucide-react'
import { useApp } from '../context/AuthContext'
import { pedirRecuperacion, restablecer } from '../lib/servidor'
import { Cargando } from '../components/Layout'
import { Brand, Face } from '../components/Logo'
import { Button, IconChip, Input, Notice, PasswordInput } from '../components/ui'

const reEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// Estructura común: panel de marca a la izquierda (solo escritorio) y formulario a la derecha.
function AuthLayout({ title, subtitle, children, footer }) {
  const { user, cargando } = useApp()
  if (cargando) return <Cargando />
  if (user) return <Navigate to="/" replace />
  return (
    <div className="auth">
      <section className="auth-brand" aria-label="Acerca de Baymax">
        <Face className="bigface" size={640} strokeWidth={1.2} />
        <Brand blink />
        <div style={{ display: 'grid', gap: '1.5rem', position: 'relative' }}>
          <h1>Tu salud, con calma y claridad.</h1>
          <p className="lead">Cuéntale a Baymax cómo te sientes y lleva tu expediente médico siempre contigo.</p>
        </div>
        <ul className="assure">
          <li><IconChip icon={Stethoscope} size="sm" /> Orienta por síntomas, no diagnostica</li>
          <li><IconChip icon={ShieldPlus} size="sm" tone="danger" /> Avisa cuando algo puede ser urgente</li>
          <li><IconChip icon={FolderLock} size="sm" tone="info" /> Tu expediente es privado y es tuyo</li>
        </ul>
      </section>
      <section className="auth-form-wrap">
        <div className="auth-card">
          <div className="auth-mobile-brand"><Brand blink /></div>
          <header style={{ display: 'grid', gap: '0.5rem' }}>
            <h2 className="h-page" style={{ fontSize: '2rem' }}>{title}</h2>
            <p className="muted">{subtitle}</p>
          </header>
          {children}
          {footer && <p className="auth-alt">{footer}</p>}
        </div>
      </section>
    </div>
  )
}

export function Login() {
  const { ingresar } = useApp()
  const nav = useNavigate()
  const { state } = useLocation()
  const [f, setF] = useState({ email: '', password: '' })
  const [err, setErr] = useState({})
  const [fallo, setFallo] = useState('')
  const [cargando, setCargando] = useState(false)

  const cambiar = (k) => (e) => setF({ ...f, [k]: e.target.value })

  async function enviar(e) {
    e.preventDefault()
    const v = {}
    if (!reEmail.test(f.email)) v.email = 'Escribe un correo válido, por ejemplo nombre@correo.com.'
    if (!f.password) v.password = 'Escribe tu contraseña.'
    setErr(v)
    setFallo('')
    if (Object.keys(v).length) return
    setCargando(true)
    try {
      await ingresar(f)
      nav(state?.desde || '/', { replace: true })
    } catch (x) {
      setFallo(x.message)
      setCargando(false)
    }
  }

  return (
    <AuthLayout
      title="Bienvenido de nuevo"
      subtitle="Ingresa para consultar tus síntomas y tu expediente."
      footer={<>¿Aún no tienes cuenta? <Link to="/registro">Crear cuenta</Link></>}
    >
      <form onSubmit={enviar} noValidate>
        {fallo && <Notice tone="danger">{fallo}</Notice>}
        <Input label="Correo electrónico" type="email" autoComplete="email" inputMode="email" value={f.email} onChange={cambiar('email')} error={err.email} placeholder="nombre@correo.com" autoFocus />
        <PasswordInput label="Contraseña" autoComplete="current-password" value={f.password} onChange={cambiar('password')} error={err.password} />
        <div style={{ textAlign: 'right', marginTop: '-0.4rem' }}>
          <Link className="link" to="/recuperar">¿Olvidaste tu contraseña?</Link>
        </div>
        <Button variant="primary" loading={cargando} type="submit" className="btn-block">
          Ingresar <ArrowRight size={18} aria-hidden="true" />
        </Button>
      </form>
    </AuthLayout>
  )
}

export function Registro() {
  const { registrar } = useApp()
  const nav = useNavigate()
  const [f, setF] = useState({ nombre: '', email: '', password: '', repetir: '' })
  const [err, setErr] = useState({})
  const [fallo, setFallo] = useState('')
  const [cargando, setCargando] = useState(false)
  const cambiar = (k) => (e) => setF({ ...f, [k]: e.target.value })

  async function enviar(e) {
    e.preventDefault()
    const v = {}
    if (f.nombre.trim().length < 2) v.nombre = 'Escribe tu nombre.'
    if (!reEmail.test(f.email)) v.email = 'Escribe un correo válido, por ejemplo nombre@correo.com.'
    if (f.password.length < 8) v.password = 'Usa al menos 8 caracteres.'
    if (f.repetir !== f.password) v.repetir = 'Las contraseñas no coinciden.'
    setErr(v)
    setFallo('')
    if (Object.keys(v).length) return
    setCargando(true)
    try {
      await registrar(f)
      nav('/', { replace: true })
    } catch (x) {
      setFallo(x.message)
      setCargando(false)
    }
  }

  return (
    <AuthLayout
      title="Crea tu cuenta"
      subtitle="Un minuto para empezar a cuidar tu salud con Baymax."
      footer={<>¿Ya tienes cuenta? <Link to="/ingresar">Ingresar</Link></>}
    >
      <form onSubmit={enviar} noValidate>
        {fallo && <Notice tone="danger">{fallo}</Notice>}
        <Input label="Nombre completo" autoComplete="name" value={f.nombre} onChange={cambiar('nombre')} error={err.nombre} autoFocus />
        <Input label="Correo electrónico" type="email" autoComplete="email" inputMode="email" value={f.email} onChange={cambiar('email')} error={err.email} placeholder="nombre@correo.com" />
        <PasswordInput label="Contraseña" autoComplete="new-password" value={f.password} onChange={cambiar('password')} error={err.password} hint="Mínimo 8 caracteres." />
        <PasswordInput label="Repite la contraseña" autoComplete="new-password" value={f.repetir} onChange={cambiar('repetir')} error={err.repetir} />
        <Button variant="primary" loading={cargando} type="submit" className="btn-block">
          Crear cuenta <ArrowRight size={18} aria-hidden="true" />
        </Button>
        <p className="faint" style={{ textAlign: 'center' }}>Baymax orienta, no diagnostica. Siempre consulta a un médico.</p>
      </form>
    </AuthLayout>
  )
}

export function Recuperar() {
  const [email, setEmail] = useState('')
  const [err, setErr] = useState('')
  const [fallo, setFallo] = useState('')
  const [listo, setListo] = useState(false)
  const [cargando, setCargando] = useState(false)

  async function enviar(e) {
    e.preventDefault()
    setFallo('')
    if (!reEmail.test(email)) return setErr('Escribe un correo válido.')
    setErr('')
    setCargando(true)
    try {
      await pedirRecuperacion(email)
      setListo(true)
    } catch (x) {
      setFallo(x.message)
    }
    setCargando(false)
  }

  return (
    <AuthLayout
      title="Recupera tu acceso"
      subtitle="Te daremos un enlace para elegir una contraseña nueva."
      footer={<Link to="/ingresar">Volver a ingresar</Link>}
    >
      {listo ? (
        <Notice tone="ok" title="Revisa tu correo">
          Si existe una cuenta con ese correo, se generó un enlace para restablecer la contraseña. Vence en 30 minutos y solo se puede usar una vez.
        </Notice>
      ) : (
        <form onSubmit={enviar} noValidate>
          {fallo && <Notice tone="danger">{fallo}</Notice>}
          <Input label="Correo electrónico" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} error={err} autoFocus />
          <Button variant="primary" loading={cargando} type="submit" className="btn-block">Enviar enlace</Button>
        </form>
      )}
    </AuthLayout>
  )
}

// Destino del enlace de recuperación: /restablecer?token=...
export function Restablecer() {
  const [params] = useSearchParams()
  const tk = params.get('token')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [fallo, setFallo] = useState('')
  const [listo, setListo] = useState(false)
  const [cargando, setCargando] = useState(false)

  async function enviar(e) {
    e.preventDefault()
    setFallo('')
    if (password.length < 8) return setErr('Usa al menos 8 caracteres.')
    setErr('')
    setCargando(true)
    try {
      await restablecer(tk, password)
      setListo(true)
    } catch (x) {
      setFallo(x.message)
    }
    setCargando(false)
  }

  return (
    <AuthLayout title="Nueva contraseña" subtitle="Elige una contraseña nueva para tu cuenta." footer={<Link to="/ingresar">Volver a ingresar</Link>}>
      {!tk ? (
        <Notice tone="danger" title="Enlace incompleto">Pide un enlace nuevo desde “¿Olvidaste tu contraseña?”.</Notice>
      ) : listo ? (
        <div style={{ display: 'grid', gap: '1.2rem' }}>
          <Notice tone="ok" title="Contraseña actualizada">Ya puedes ingresar con tu contraseña nueva.</Notice>
          <Link to="/ingresar" className="btn btn-primary btn-block">Ir a ingresar</Link>
        </div>
      ) : (
        <form onSubmit={enviar} noValidate>
          {fallo && <Notice tone="danger">{fallo}</Notice>}
          <PasswordInput label="Contraseña nueva" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} error={err} hint="Mínimo 8 caracteres." autoFocus />
          <Button variant="primary" loading={cargando} type="submit" className="btn-block">Guardar contraseña</Button>
        </form>
      )}
    </AuthLayout>
  )
}
