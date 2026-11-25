import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { BookmarkPlus, CheckCheck, History, ScanSearch, ShieldAlert, Sparkles, Trash2 } from 'lucide-react'
import { useApp } from '../context/AuthContext'
import { predecir } from '../lib/api'
import { fechaHora } from '../lib/util'
import { Button, Empty, IconChip, Notice } from '../components/ui'

const EJEMPLOS = [
  'Tengo fiebre, tos y me duele el cuerpo',
  'Dolor de cabeza fuerte y náuseas desde ayer',
  'Me duele la garganta y tengo mocos',
]
const MAX = 2000

export default function Consulta() {
  const { datos, guardarItem, quitarItem } = useApp()
  const { state } = useLocation()
  const [texto, setTexto] = useState(state?.texto || '')
  const [estado, setEstado] = useState('reposo') // reposo | cargando | listo | error
  const [res, setRes] = useState(null)
  const [error, setError] = useState('')
  const [guardada, setGuardada] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [errorLista, setErrorLista] = useState('')
  const entrada = useRef(null)

  async function analizar(t = texto) {
    const limpio = t.trim()
    if (!limpio) return
    setEstado('cargando')
    setGuardada(false)
    try {
      setRes({ ...(await predecir(limpio)), texto: limpio })
      setEstado('listo')
    } catch (e) {
      setError(e.message)
      setEstado('error')
    }
  }

  // Si llegamos desde el cuadro de Inicio, analiza de inmediato lo que el usuario ya escribió.
  const auto = useRef(false)
  useEffect(() => {
    if (state?.texto && !auto.current) {
      auto.current = true
      analizar(state.texto)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function guardar() {
    setGuardando(true)
    setErrorLista('')
    try {
      await guardarItem('consultas', {
        texto: res.texto,
        sintomas: res.sintomas,
        emergencia: res.emergencia,
        posibles: res.posibles.map(({ nombre, probabilidad }) => ({ nombre, probabilidad })),
      })
      setGuardada(true)
    } catch (e) {
      setErrorLista(e.message)
    }
    setGuardando(false)
  }

  async function eliminar(id) {
    setErrorLista('')
    try {
      await quitarItem('consultas', id)
    } catch (e) {
      setErrorLista(e.message)
    }
  }

  const verConsulta = (c) => {
    setTexto(c.texto)
    setRes({ ...c, aviso: 'Baymax orienta, no diagnostica. Consulta a un médico.' })
    setEstado('listo')
    setGuardada(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      <header className="page-head">
        <h1 className="h-page">Cuéntale a Baymax cómo te sientes</h1>
        <p className="lead">Describe tus síntomas con tus propias palabras. Baymax detecta lo importante y te orienta sobre qué podría ser.</p>
      </header>

      <div className="consulta">
        <section className="compose" aria-labelledby="t-sintomas">
          <label id="t-sintomas" htmlFor="sintomas" className="h-sub">Tus síntomas</label>
          <textarea
            id="sintomas" ref={entrada} className="control" rows={6} maxLength={MAX} value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') analizar() }}
            placeholder="Ej.: tengo fiebre desde ayer, me duele la garganta y me siento muy cansado."
          />
          <div className="chips" aria-label="Ejemplos">
            {EJEMPLOS.map((e) => (
              <button key={e} type="button" className="chip" onClick={() => { setTexto(e); entrada.current?.focus() }}>{e}</button>
            ))}
          </div>
          <div className="compose-actions">
            <span className="count">{texto.length}/{MAX}</span>
            <Button variant="primary" icon={ScanSearch} loading={estado === 'cargando'} disabled={!texto.trim()} onClick={() => analizar()}>
              {estado === 'cargando' ? 'Analizando…' : 'Analizar síntomas'}
            </Button>
          </div>
        </section>

        <section aria-live="polite" aria-label="Resultado">
          {estado === 'reposo' && (
            <div className="panel">
              <Empty icon={Sparkles} title="Aquí verás tu orientación">
                Escribe tus síntomas y presiona analizar. Mientras más detalles des, mejor será la orientación.
              </Empty>
            </div>
          )}

          {estado === 'cargando' && (
            <div className="panel" style={{ display: 'grid', gap: '1.1rem' }} aria-busy="true">
              <div className="skeleton" style={{ width: '40%' }} />
              <div className="skeleton" style={{ width: '90%' }} />
              <div className="skeleton" style={{ width: '75%' }} />
              <div className="skeleton" style={{ width: '82%' }} />
            </div>
          )}

          {estado === 'error' && (
            <Notice tone="danger" title="No se pudo analizar">
              {error}
              <div style={{ marginTop: '0.75rem' }}><Button size="sm" onClick={() => analizar()}>Reintentar</Button></div>
            </Notice>
          )}

          {estado === 'listo' && res && (
            <div className="results">
              {res.emergencia && (
                <Notice tone="danger" title="Posible emergencia: busca atención médica ya">
                  Acude a urgencias o llama al 911. No esperes a que los síntomas pasen.
                </Notice>
              )}

              <div className="panel">
                <div className="panel-head"><h2 className="h-section">Síntomas que entendí</h2></div>
                {res.sintomas.length ? (
                  <div className="chips">{res.sintomas.map((s) => <span key={s} className="chip accent"><CheckCheck size={15} aria-hidden="true" />{s}</span>)}</div>
                ) : (
                  <p className="muted">No reconocí síntomas en tu mensaje. Prueba con palabras como “fiebre”, “tos” o “dolor de cabeza”.</p>
                )}
              </div>

              {res.posibles.length > 0 && (
                <div className="panel">
                  <div className="panel-head"><h2 className="h-section">Posibles causas</h2></div>
                  {res.posibles.map((p) => {
                    const pct = Math.round(p.probabilidad * 100)
                    return (
                      <div className="prob" key={p.nombre}>
                        <div className="prob-top">
                          <span className="prob-name">{p.nombre}</span>
                          <span className="prob-pct">{pct < 1 ? '<1' : pct}%</span>
                        </div>
                        <div className="bar" role="img" aria-label={`${p.nombre}: ${pct}% de coincidencia`}><i style={{ width: `${Math.max(pct, 2)}%` }} /></div>
                      </div>
                    )
                  })}
                  <p className="faint" style={{ marginTop: '0.5rem' }}>Es una coincidencia estadística con tus síntomas, no una probabilidad de que la tengas.</p>
                </div>
              )}

              <div className="disclaimer">
                <ShieldAlert size={16} aria-hidden="true" /> {res.aviso}
              </div>

              {errorLista && <Notice tone="danger">{errorLista}</Notice>}
              <Button icon={BookmarkPlus} onClick={guardar} loading={guardando} disabled={guardada}>
                {guardada ? 'Guardada en tu historial' : 'Guardar en mi historial'}
              </Button>
            </div>
          )}
        </section>
      </div>

      <section className="panel" aria-labelledby="t-hist">
        <div className="panel-head"><h2 className="h-section" id="t-hist">Consultas guardadas</h2></div>
        {errorLista && estado !== 'listo' && <div style={{ marginBottom: '1rem' }}><Notice tone="danger">{errorLista}</Notice></div>}
        {datos.consultas.length === 0 ? (
          <Empty icon={History} title="Aún no hay consultas guardadas">Cuando guardes una, la verás aquí para compartirla con tu médico.</Empty>
        ) : (
          <ul className="rows">
            {datos.consultas.map((c) => (
              <li key={c.id}>
                <IconChip icon={c.emergencia ? ShieldAlert : History} tone={c.emergencia ? 'danger' : ''} size="sm" />
                <button className="grow" style={{ background: 'none', border: 0, padding: 0, textAlign: 'left' }} onClick={() => verConsulta(c)}>
                  <div className="title">{c.posibles[0]?.nombre || 'Sin coincidencias'}</div>
                  <div className="meta">{fechaHora(c.fecha)} · {c.sintomas.slice(0, 3).join(', ') || c.texto}</div>
                </button>
                <Button variant="ghost" size="sm" className="btn-icon" aria-label="Eliminar consulta" onClick={() => eliminar(c.id)}>
                  <Trash2 size={18} aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
