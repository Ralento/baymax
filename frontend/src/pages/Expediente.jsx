import { useState } from 'react'
import { Navigate, NavLink, useParams } from 'react-router-dom'
import { Activity, ClipboardList, HeartPulse, IdCard, Pencil, Pill, Plus, Syringe, Trash2 } from 'lucide-react'
import { useApp } from '../context/AuthContext'
import { SANGRES, SEXOS, edad, fechaCorta, hoyISO, vigente } from '../lib/util'
import { Button, Empty, IconChip, Input, Notice, Select, TextArea } from '../components/ui'

const TIPOS = { enfermedad: 'Enfermedad', cirugia: 'Cirugía', alergia: 'Alergia', hospitalizacion: 'Hospitalización', familiar: 'Antecedente familiar' }

/*
 * Cada sección del expediente se describe con datos, no con código repetido:
 * campos del formulario, cómo se muestra una fila y cómo se valida. El componente
 * <Seccion> lee esta configuración y construye lista + formulario. Los nombres de campos
 * coinciden con las columnas de db/esquema.sql, así que conectar una API real es directo.
 */
const SECCIONES = {
  antecedentes: {
    titulo: 'Antecedentes', icono: ClipboardList, singular: 'antecedente',
    vacio: 'Registra enfermedades pasadas, cirugías, alergias, hospitalizaciones o antecedentes familiares.',
    campos: [
      { name: 'tipo', label: 'Tipo', type: 'select', options: Object.entries(TIPOS), required: true },
      { name: 'fecha', label: 'Fecha', type: 'date', optional: true },
      { name: 'descripcion', label: 'Descripción', required: true, full: true, placeholder: 'Ej.: alergia a la penicilina' },
      { name: 'notas', label: 'Notas', type: 'textarea', optional: true, full: true },
    ],
    nuevo: () => ({ tipo: '', descripcion: '', fecha: '', notas: '' }),
    titulo_fila: (x) => x.descripcion,
    meta: (x) => [TIPOS[x.tipo], x.fecha && fechaCorta(x.fecha), x.notas].filter(Boolean).join(' · '),
    etiqueta: (x) => (x.tipo === 'alergia' ? { texto: 'Alergia', tono: 'warn' } : null),
    orden: (a, b) => (b.fecha || '').localeCompare(a.fecha || ''),
  },
  vacunas: {
    titulo: 'Vacunas', icono: Syringe, singular: 'vacuna',
    vacio: 'Lleva tu cartilla de vacunación: una entrada por cada dosis aplicada.',
    campos: [
      { name: 'vacuna', label: 'Vacuna', required: true, full: true, placeholder: 'Ej.: Influenza' },
      { name: 'dosis', label: 'Dosis', optional: true, placeholder: 'Ej.: Refuerzo' },
      { name: 'fecha_aplicacion', label: 'Fecha de aplicación', type: 'date', required: true },
      { name: 'lote', label: 'Lote', optional: true, full: true },
    ],
    nuevo: () => ({ vacuna: '', dosis: '', fecha_aplicacion: '', lote: '' }),
    titulo_fila: (x) => x.vacuna,
    meta: (x) => [x.dosis, fechaCorta(x.fecha_aplicacion), x.lote && `Lote ${x.lote}`].filter(Boolean).join(' · '),
    orden: (a, b) => b.fecha_aplicacion.localeCompare(a.fecha_aplicacion),
  },
  tratamientos: {
    titulo: 'Tratamientos', icono: Pill, singular: 'tratamiento',
    vacio: 'Anota los medicamentos que tomas o has tomado, con su dosis y frecuencia.',
    campos: [
      { name: 'medicamento', label: 'Medicamento', required: true, full: true, placeholder: 'Ej.: Paracetamol' },
      { name: 'dosis', label: 'Dosis', optional: true, placeholder: 'Ej.: 500 mg' },
      { name: 'frecuencia', label: 'Frecuencia', optional: true, placeholder: 'Ej.: cada 8 horas' },
      { name: 'fecha_inicio', label: 'Inicio', type: 'date', required: true },
      { name: 'fecha_fin', label: 'Fin', type: 'date', futuro: true, optional: true, hint: 'Déjalo vacío si sigue en curso.' },
    ],
    nuevo: () => ({ medicamento: '', dosis: '', frecuencia: '', fecha_inicio: '', fecha_fin: '' }),
    validar: (x) => (x.fecha_fin && x.fecha_fin < x.fecha_inicio ? { fecha_fin: 'El fin no puede ser antes del inicio.' } : {}),
    titulo_fila: (x) => x.medicamento,
    meta: (x) => [x.dosis, x.frecuencia, `Desde ${fechaCorta(x.fecha_inicio)}`, x.fecha_fin && `hasta ${fechaCorta(x.fecha_fin)}`].filter(Boolean).join(' · '),
    etiqueta: (x) => (vigente(x) ? { texto: 'Vigente', tono: 'accent' } : null),
    orden: (a, b) => Number(vigente(b)) - Number(vigente(a)) || b.fecha_inicio.localeCompare(a.fecha_inicio),
  },
  cronicas: {
    titulo: 'Crónicas', icono: HeartPulse, singular: 'enfermedad crónica',
    vacio: 'Registra condiciones de largo plazo, como diabetes o hipertensión.',
    campos: [
      { name: 'enfermedad', label: 'Enfermedad', required: true, full: true, placeholder: 'Ej.: Hipertensión' },
      { name: 'fecha_diagnostico', label: 'Fecha de diagnóstico', type: 'date', optional: true },
      { name: 'degenerativa', label: 'Es degenerativa', type: 'check' },
      { name: 'notas', label: 'Notas', type: 'textarea', optional: true, full: true },
    ],
    nuevo: () => ({ enfermedad: '', degenerativa: false, fecha_diagnostico: '', notas: '' }),
    titulo_fila: (x) => x.enfermedad,
    meta: (x) => [x.fecha_diagnostico && `Diagnóstico ${fechaCorta(x.fecha_diagnostico)}`, x.notas].filter(Boolean).join(' · '),
    etiqueta: (x) => (x.degenerativa ? { texto: 'Degenerativa', tono: 'info' } : null),
    orden: (a, b) => a.enfermedad.localeCompare(b.enfermedad),
  },
}

const PESTANAS = [{ clave: '', titulo: 'Datos personales', icono: IdCard }, ...Object.entries(SECCIONES).map(([clave, s]) => ({ clave, titulo: s.titulo, icono: s.icono }))]

// Un campo del formulario según su tipo.
function Campo({ c, valor, error, onChange }) {
  const comunes = { label: c.label, optional: c.optional, error, hint: c.hint, className: c.full ? 'full' : '' }
  if (c.type === 'select') return <Select {...comunes} options={c.options} value={valor} onChange={(e) => onChange(e.target.value)} />
  if (c.type === 'textarea') return <TextArea {...comunes} rows={3} value={valor} onChange={(e) => onChange(e.target.value)} />
  if (c.type === 'check')
    return (
      <label className="check full">
        <input type="checkbox" checked={valor} onChange={(e) => onChange(e.target.checked)} /> {c.label}
      </label>
    )
  return <Input {...comunes} type={c.type || 'text'} max={c.type === 'date' && !c.futuro ? hoyISO() : undefined} placeholder={c.placeholder} value={valor} onChange={(e) => onChange(e.target.value)} />
}

function Seccion({ clave }) {
  const cfg = SECCIONES[clave]
  const { datos, guardarItem, quitarItem } = useApp()
  const [edit, setEdit] = useState(null) // null = cerrado; objeto = formulario abierto
  const [err, setErr] = useState({})
  const [fallo, setFallo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const items = [...datos[clave]].sort(cfg.orden)

  async function guardar(e) {
    e.preventDefault()
    const v = {}
    cfg.campos.forEach((c) => {
      if (c.required && !String(edit[c.name]).trim()) v[c.name] = 'Este dato es necesario.'
    })
    Object.assign(v, cfg.validar?.(edit) ?? {})
    setErr(v)
    if (Object.keys(v).length) return
    setFallo('')
    setEnviando(true)
    try {
      await guardarItem(clave, edit)
      setEdit(null)
    } catch (x) {
      setFallo(x.message)
    }
    setEnviando(false)
  }

  async function borrar(id) {
    setFallo('')
    try {
      await quitarItem(clave, id)
    } catch (x) {
      setFallo(x.message)
    }
  }

  return (
    <section className="panel" aria-label={cfg.titulo}>
      <div className="panel-head">
        <h2 className="h-section">{cfg.titulo}</h2>
        {!edit && <Button variant="primary" size="sm" icon={Plus} onClick={() => { setErr({}); setFallo(''); setEdit(cfg.nuevo()) }}>Agregar</Button>}
      </div>

      {edit && (
        <form className="entry-form" onSubmit={guardar} noValidate>
          <h3 className="h-sub">{edit.id ? `Editar ${cfg.singular}` : `Nuevo ${cfg.singular}`}</h3>
          <div className="form-grid">
            {cfg.campos.map((c) => (
              <Campo key={c.name} c={c} valor={edit[c.name]} error={err[c.name]} onChange={(val) => setEdit({ ...edit, [c.name]: val })} />
            ))}
          </div>
          {fallo && <Notice tone="danger">{fallo}</Notice>}
          <div className="form-actions">
            <Button type="button" variant="ghost" onClick={() => setEdit(null)}>Cancelar</Button>
            <Button type="submit" variant="primary" loading={enviando}>Guardar</Button>
          </div>
        </form>
      )}

      {fallo && !edit && <div style={{ marginBottom: '1rem' }}><Notice tone="danger">{fallo}</Notice></div>}
      {items.length === 0 && !edit ? (
        <Empty icon={cfg.icono} title={`Sin ${cfg.titulo.toLowerCase()} registrados`} action={<Button icon={Plus} onClick={() => setEdit(cfg.nuevo())}>Agregar {cfg.singular}</Button>}>
          {cfg.vacio}
        </Empty>
      ) : (
        <ul className="rows" style={{ marginTop: edit ? '1rem' : 0 }}>
          {items.map((x) => {
            const et = cfg.etiqueta?.(x)
            return (
              <li key={x.id}>
                <IconChip icon={cfg.icono} size="sm" tone={x.tipo === 'alergia' ? 'warn' : ''} />
                <div className="grow">
                  <div className="title">{cfg.titulo_fila(x)} {et && <span className={`chip ${et.tono}`} style={{ minHeight: 24, marginLeft: 6 }}>{et.texto}</span>}</div>
                  <div className="meta">{cfg.meta(x)}</div>
                </div>
                <div className="row-actions">
                  <Button variant="ghost" size="sm" className="btn-icon" aria-label={`Editar ${cfg.titulo_fila(x)}`} onClick={() => { setErr({}); setEdit(x) }}><Pencil size={17} aria-hidden="true" /></Button>
                  <Button variant="ghost" size="sm" className="btn-icon" aria-label={`Eliminar ${cfg.titulo_fila(x)}`} onClick={() => borrar(x.id)}><Trash2 size={17} aria-hidden="true" /></Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

const reCurp = /^[A-Z0-9]{18}$/
const reEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function DatosPersonales() {
  const { datos, guardarPaciente } = useApp()
  const p = datos.paciente
  const completo = p.nombre && p.fecha_nacimiento && p.sexo
  const [editando, setEditando] = useState(!completo)
  const [f, setF] = useState(p)
  const [err, setErr] = useState({})
  const [fallo, setFallo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const poner = (k) => (e) => setF({ ...f, [k]: e.target.value })

  async function guardar(e) {
    e.preventDefault()
    const v = {}
    if (!f.nombre.trim()) v.nombre = 'Escribe tu nombre.'
    if (!f.fecha_nacimiento) v.fecha_nacimiento = 'Indica tu fecha de nacimiento.'
    else if (f.fecha_nacimiento > hoyISO()) v.fecha_nacimiento = 'La fecha no puede ser futura.'
    if (!f.sexo) v.sexo = 'Selecciona una opción.'
    if (f.curp && !reCurp.test(f.curp)) v.curp = 'La CURP tiene 18 letras y números, sin espacios.'
    if (f.email && !reEmail.test(f.email)) v.email = 'Escribe un correo válido.'
    setErr(v)
    if (Object.keys(v).length) return
    setFallo('')
    setEnviando(true)
    try {
      await guardarPaciente({ ...f, nombre: f.nombre.trim() })
      setEditando(false)
    } catch (x) {
      setFallo(x.message)
    }
    setEnviando(false)
  }

  if (!editando)
    return (
      <section className="panel" aria-label="Datos personales">
        <div className="panel-head">
          <h2 className="h-section">Datos personales</h2>
          <Button size="sm" icon={Pencil} onClick={() => { setF(p); setEditando(true) }}>Editar</Button>
        </div>
        <dl className="dl">
          {[
            ['Nombre', p.nombre], ['Fecha de nacimiento', `${fechaCorta(p.fecha_nacimiento)} · ${edad(p.fecha_nacimiento)} años`],
            ['Sexo', SEXOS[p.sexo]], ['Tipo de sangre', p.tipo_sangre || '—'],
            ['CURP', p.curp || '—'], ['Teléfono', p.telefono || '—'], ['Correo', p.email || '—'],
          ].map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
        </dl>
      </section>
    )

  return (
    <section className="panel" aria-label="Datos personales">
      <div className="panel-head"><h2 className="h-section">Datos personales</h2></div>
      {!completo && <div style={{ marginBottom: '1.1rem' }}><Notice tone="info">Completa lo básico para que tu expediente sea útil en una consulta médica.</Notice></div>}
      <form onSubmit={guardar} noValidate style={{ display: 'grid', gap: '1.25rem' }}>
        <div className="form-grid">
          <Input className="full" label="Nombre completo" value={f.nombre} onChange={poner('nombre')} error={err.nombre} autoComplete="name" />
          <Input label="Fecha de nacimiento" type="date" max={hoyISO()} value={f.fecha_nacimiento} onChange={poner('fecha_nacimiento')} error={err.fecha_nacimiento} />
          <Select label="Sexo" options={Object.entries(SEXOS)} value={f.sexo} onChange={poner('sexo')} error={err.sexo} />
          <Select label="Tipo de sangre" optional options={SANGRES.map((s) => [s, s])} value={f.tipo_sangre} onChange={poner('tipo_sangre')} />
          <Input label="Teléfono" optional type="tel" inputMode="tel" value={f.telefono} onChange={poner('telefono')} autoComplete="tel" />
          <Input label="CURP" optional value={f.curp} onChange={(e) => setF({ ...f, curp: e.target.value.toUpperCase().replace(/\s/g, '') })} error={err.curp} maxLength={18} />
          <Input label="Correo" optional type="email" value={f.email} onChange={poner('email')} error={err.email} />
        </div>
        {fallo && <Notice tone="danger">{fallo}</Notice>}
        <div className="form-actions">
          {completo && <Button type="button" variant="ghost" onClick={() => setEditando(false)}>Cancelar</Button>}
          <Button type="submit" variant="primary" loading={enviando}>Guardar datos</Button>
        </div>
      </form>
    </section>
  )
}

export default function Expediente() {
  const { seccion = '' } = useParams()
  const { datos } = useApp()
  if (seccion && !SECCIONES[seccion]) return <Navigate to="/expediente" replace />
  const p = datos.paciente
  const alergias = datos.antecedentes.filter((a) => a.tipo === 'alergia')

  return (
    <>
      <header className="page-head">
        <h1 className="h-page">Mi expediente</h1>
        <p className="lead">Tu historial médico en un solo lugar, listo para mostrarlo en cualquier consulta.</p>
      </header>

      <dl className="summary">
        <div><dt>Paciente</dt><dd>{p.nombre || '—'}</dd></div>
        <div><dt>Edad</dt><dd>{p.fecha_nacimiento ? `${edad(p.fecha_nacimiento)} años` : '—'}</dd></div>
        <div><dt>Tipo de sangre</dt><dd>{p.tipo_sangre || '—'}</dd></div>
        <div><dt>Alergias</dt><dd style={{ color: alergias.length ? 'var(--warn)' : undefined }}>{alergias.length ? alergias.map((a) => a.descripcion).join(', ') : 'Ninguna registrada'}</dd></div>
      </dl>

      <nav className="tabs" aria-label="Secciones del expediente">
        {PESTANAS.map(({ clave, titulo, icono: Icon }) => (
          <NavLink key={clave} to={clave ? `/expediente/${clave}` : '/expediente'} end>
            <Icon size={18} aria-hidden="true" /> {titulo}
            {clave && <span className="n">{datos[clave].length}</span>}
          </NavLink>
        ))}
      </nav>

      {seccion ? <Seccion key={seccion} clave={seccion} /> : <DatosPersonales />}
      <p className="faint" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}><Activity size={15} aria-hidden="true" /> Solo tú ves esta información.</p>
    </>
  )
}
