import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, CircleCheck, ChevronRight, FolderHeart, History, Pill, ShieldAlert, Stethoscope, TriangleAlert } from 'lucide-react'
import { useApp } from '../context/AuthContext'
import { fechaCorta, fechaHora, saludo, vigente } from '../lib/util'
import { Button, Empty, IconChip, Notice } from '../components/ui'

export default function Inicio() {
  const { user, datos } = useApp()
  const nav = useNavigate()
  const [texto, setTexto] = useState('')
  const p = datos.paciente

  const alergias = datos.antecedentes.filter((a) => a.tipo === 'alergia')
  const activos = datos.tratamientos.filter(vigente)
  const ultima = datos.consultas[0]

  // Lista de pendientes derivada del expediente: cada paso completo se marca solo.
  const pasos = [
    { ok: !!(p.nombre && p.fecha_nacimiento && p.sexo), texto: 'Completa tus datos personales', a: '/expediente' },
    { ok: !!p.tipo_sangre, texto: 'Registra tu tipo de sangre', a: '/expediente' },
    { ok: datos.antecedentes.length > 0, texto: 'Agrega tus antecedentes y alergias', a: '/expediente/antecedentes' },
    { ok: datos.vacunas.length > 0, texto: 'Anota tus vacunas', a: '/expediente/vacunas' },
  ]
  const pendientes = pasos.filter((s) => !s.ok)

  const enviar = (e) => {
    e.preventDefault()
    if (texto.trim()) nav('/consulta', { state: { texto: texto.trim() } })
  }

  return (
    <>
      <header className="page-head">
        <h1 className="h-page">{saludo(user.nombre)}</h1>
        <p className="lead">¿Cómo te sientes hoy? Cuéntale a Baymax y recibe una orientación al instante.</p>
      </header>

      <form className="ask" onSubmit={enviar}>
        <label htmlFor="rapido" className="h-sub">Describe tus síntomas</label>
        <div className="ask-row">
          <input id="rapido" className="control" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Ej.: fiebre y dolor de garganta" maxLength={2000} />
          <Button variant="primary" type="submit" disabled={!texto.trim()}>
            <Stethoscope size={18} aria-hidden="true" /> Consultar <ArrowRight size={18} aria-hidden="true" />
          </Button>
        </div>
        <span className="disclaimer"><ShieldAlert size={15} aria-hidden="true" /> Baymax orienta, no diagnostica. Ante una emergencia llama al 911.</span>
      </form>

      {alergias.length > 0 && (
        <Notice tone="warn" title="Alergias registradas">{alergias.map((a) => a.descripcion).join(', ')}</Notice>
      )}

      <div className="cols">
        <div className="stack">
          <section className="panel" aria-labelledby="t-trat">
            <div className="panel-head">
              <h2 className="h-section" id="t-trat">Tratamientos en curso</h2>
              <Link to="/expediente/tratamientos" className="link">Ver todos</Link>
            </div>
            {activos.length === 0 ? (
              <Empty icon={Pill} title="Sin tratamientos activos">Cuando registres un medicamento sin fecha de fin, aparecerá aquí.</Empty>
            ) : (
              <ul className="rows">
                {activos.slice(0, 4).map((t) => (
                  <li key={t.id}>
                    <IconChip icon={Pill} size="sm" />
                    <div className="grow">
                      <div className="title">{t.medicamento}</div>
                      <div className="meta">{[t.dosis, t.frecuencia, `desde ${fechaCorta(t.fecha_inicio)}`].filter(Boolean).join(' · ')}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel" aria-labelledby="t-ult">
            <div className="panel-head">
              <h2 className="h-section" id="t-ult">Última consulta</h2>
              <Link to="/consulta" className="link">Nueva consulta</Link>
            </div>
            {ultima ? (
              <ul className="rows">
                <li>
                  <IconChip icon={ultima.emergencia ? TriangleAlert : History} tone={ultima.emergencia ? 'danger' : ''} size="sm" />
                  <div className="grow">
                    <div className="title">{ultima.posibles[0]?.nombre || 'Sin coincidencias'}</div>
                    <div className="meta">{fechaHora(ultima.fecha)} · {ultima.sintomas.join(', ')}</div>
                  </div>
                </li>
              </ul>
            ) : (
              <Empty icon={Stethoscope} title="Aún no has consultado">Tus consultas guardadas aparecerán aquí.</Empty>
            )}
          </section>
        </div>

        <section className="panel" aria-labelledby="t-exp">
          <div className="panel-head"><h2 className="h-section" id="t-exp">Tu expediente</h2></div>
          {pendientes.length === 0 ? (
            <Notice tone="ok" title="Expediente al día">Tienes lo esencial registrado. Mantenlo actualizado después de cada consulta.</Notice>
          ) : (
            <p className="muted" style={{ marginBottom: '0.75rem' }}>Te faltan {pendientes.length} {pendientes.length === 1 ? 'paso' : 'pasos'} para tenerlo completo.</p>
          )}
          <ul className="todo">
            {pasos.map((s) => (
              <li key={s.texto}>
                <Link to={s.a} className="hoverable">
                  <IconChip icon={s.ok ? CircleCheck : FolderHeart} size="sm" tone={s.ok ? '' : 'info'} />
                  <span className="grow" style={{ color: s.ok ? 'var(--text-3)' : 'var(--text)', textDecoration: s.ok ? 'line-through' : 'none' }}>{s.texto}</span>
                  {!s.ok && <ChevronRight size={18} color="var(--text-3)" aria-hidden="true" />}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  )
}
