import { useState } from 'react'
import { KeyRound, LogOut, Trash2, UserRound } from 'lucide-react'
import { useApp } from '../context/AuthContext'
import { Button, IconChip, Input, Notice, PasswordInput } from '../components/ui'

export default function Perfil() {
  const { user, renombrar: guardarNombre, cambiarPassword, salir, eliminarCuenta } = useApp()
  const [nombre, setNombre] = useState(user.nombre)
  const [okNombre, setOkNombre] = useState(false)
  const [pw, setPw] = useState({ actual: '', nueva: '' })
  const [errPw, setErrPw] = useState({})
  const [msgPw, setMsgPw] = useState(null)
  const [confirmar, setConfirmar] = useState(false)
  const [pwBorrar, setPwBorrar] = useState('')
  const [errBorrar, setErrBorrar] = useState('')
  const [errNombre, setErrNombre] = useState('')

  async function enviarNombre(e) {
    e.preventDefault()
    if (nombre.trim().length < 2) return
    setErrNombre('')
    try {
      await guardarNombre(nombre)
      setOkNombre(true)
    } catch (x) {
      setErrNombre(x.message)
    }
  }

  async function borrarCuenta(e) {
    e.preventDefault()
    setErrBorrar('')
    try {
      await eliminarCuenta(pwBorrar)
    } catch (x) {
      setErrBorrar(x.message)
    }
  }

  async function enviarPw(e) {
    e.preventDefault()
    const v = {}
    if (!pw.actual) v.actual = 'Escribe tu contraseña actual.'
    if (pw.nueva.length < 8) v.nueva = 'Usa al menos 8 caracteres.'
    setErrPw(v)
    setMsgPw(null)
    if (Object.keys(v).length) return
    try {
      await cambiarPassword(user.id, pw.actual, pw.nueva)
      setPw({ actual: '', nueva: '' })
      setMsgPw({ tone: 'ok', texto: 'Contraseña actualizada.' })
    } catch (x) {
      setMsgPw({ tone: 'danger', texto: x.message })
    }
  }

  return (
    <>
      <header className="page-head">
        <h1 className="h-page">Mi cuenta</h1>
        <p className="lead">Administra tus datos de acceso y tu privacidad.</p>
      </header>

      <div className="cols" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))' }}>
        <section className="panel" style={{ display: 'grid', gap: '1.2rem' }}>
          <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}><IconChip icon={UserRound} /><h2 className="h-section">Perfil</h2></div>
          <form onSubmit={enviarNombre} style={{ display: 'grid', gap: '1.1rem' }} noValidate>
            <Input label="Nombre" value={nombre} onChange={(e) => { setNombre(e.target.value); setOkNombre(false) }} autoComplete="name" />
            <Input label="Correo" value={user.email} readOnly disabled hint="Tu correo es tu identificador y no se puede cambiar." />
            {okNombre && <Notice tone="ok">Nombre actualizado.</Notice>}
            {errNombre && <Notice tone="danger">{errNombre}</Notice>}
            <div><Button type="submit" variant="primary" disabled={nombre.trim() === user.nombre}>Guardar cambios</Button></div>
          </form>
        </section>

        <section className="panel" style={{ display: 'grid', gap: '1.2rem' }}>
          <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}><IconChip icon={KeyRound} tone="info" /><h2 className="h-section">Contraseña</h2></div>
          <form onSubmit={enviarPw} style={{ display: 'grid', gap: '1.1rem' }} noValidate>
            <PasswordInput label="Contraseña actual" autoComplete="current-password" value={pw.actual} onChange={(e) => setPw({ ...pw, actual: e.target.value })} error={errPw.actual} />
            <PasswordInput label="Contraseña nueva" autoComplete="new-password" value={pw.nueva} onChange={(e) => setPw({ ...pw, nueva: e.target.value })} error={errPw.nueva} hint="Mínimo 8 caracteres." />
            {msgPw && <Notice tone={msgPw.tone}>{msgPw.texto}</Notice>}
            <div><Button type="submit">Cambiar contraseña</Button></div>
          </form>
        </section>
      </div>

      <section className="panel" style={{ display: 'grid', gap: '1rem' }}>
        <h2 className="h-section">Sesión y privacidad</h2>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Button icon={LogOut} onClick={salir}>Cerrar sesión</Button>
          {!confirmar && <Button variant="danger" icon={Trash2} onClick={() => setConfirmar(true)}>Eliminar mi cuenta</Button>}
        </div>
        {confirmar && (
          <Notice tone="danger" title="Esto borra tu cuenta y todo tu expediente">
            No se puede deshacer. Escribe tu contraseña para confirmar.
            <form onSubmit={borrarCuenta} style={{ display: 'grid', gap: '0.8rem', marginTop: '0.8rem', maxWidth: 360 }} noValidate>
              <PasswordInput label="Contraseña" autoComplete="current-password" value={pwBorrar} onChange={(e) => setPwBorrar(e.target.value)} error={errBorrar} />
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <Button type="submit" variant="danger" size="sm" disabled={!pwBorrar}>Sí, eliminar todo</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => { setConfirmar(false); setPwBorrar(''); setErrBorrar('') }}>Cancelar</Button>
              </div>
            </form>
          </Notice>
        )}
      </section>
    </>
  )
}
