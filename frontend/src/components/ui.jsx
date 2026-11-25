import { useId, useState } from 'react'
import { AlertCircle, Eye, EyeOff, Info, ShieldAlert, TriangleAlert, CircleCheck } from 'lucide-react'

// Icono dentro de un recuadro tintado: es lo que "resalta" los iconos en toda la app.
export function IconChip({ icon: Icon, tone = '', size = '' }) {
  return (
    <span className={`icon-chip ${tone} ${size}`}>
      <Icon size={size === 'lg' ? 26 : size === 'sm' ? 17 : 21} strokeWidth={1.9} aria-hidden="true" />
    </span>
  )
}

export function Button({ variant = '', size = '', loading = false, icon: Icon, children, className = '', ...rest }) {
  const cls = ['btn', variant && `btn-${variant}`, size && `btn-${size}`, className].filter(Boolean).join(' ')
  return (
    <button className={cls} disabled={loading || rest.disabled} {...rest}>
      {loading ? <span className="spinner" aria-hidden="true" /> : Icon && <Icon size={18} strokeWidth={2} aria-hidden="true" />}
      {children}
    </button>
  )
}

const ICONOS_AVISO = { info: Info, warn: TriangleAlert, danger: ShieldAlert, ok: CircleCheck }
export function Notice({ tone = 'info', title, children }) {
  const Icon = ICONOS_AVISO[tone]
  return (
    <div className={`notice ${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>
      <Icon className="icon" size={20} strokeWidth={1.9} aria-hidden="true" />
      <div>
        {title && <strong>{title}</strong>}
        {children}
      </div>
    </div>
  )
}

// Campo con etiqueta, ayuda y error enlazados por id para lectores de pantalla.
export function Field({ label, optional, error, hint, className = '', children }) {
  const id = useId()
  const describe = error ? `${id}-e` : hint ? `${id}-h` : undefined
  return (
    <div className={`field ${error ? 'invalid' : ''} ${className}`}>
      <label htmlFor={id}>
        {label} {optional && <span className="opt">(opcional)</span>}
      </label>
      {children({ id, 'aria-describedby': describe, 'aria-invalid': error ? true : undefined })}
      {error ? (
        <span id={`${id}-e`} className="field-error">
          <AlertCircle size={14} aria-hidden="true" /> {error}
        </span>
      ) : (
        hint && <span id={`${id}-h`} className="field-hint">{hint}</span>
      )}
    </div>
  )
}

export function Input({ label, optional, error, hint, className, ...rest }) {
  return (
    <Field label={label} optional={optional} error={error} hint={hint} className={className}>
      {(a11y) => <input className="control" {...a11y} {...rest} />}
    </Field>
  )
}

export function Select({ label, optional, error, hint, className, options, placeholder = 'Selecciona…', ...rest }) {
  return (
    <Field label={label} optional={optional} error={error} hint={hint} className={className}>
      {(a11y) => (
        <select className="control" {...a11y} {...rest}>
          <option value="">{placeholder}</option>
          {options.map(([v, t]) => (
            <option key={v} value={v}>{t}</option>
          ))}
        </select>
      )}
    </Field>
  )
}

export function TextArea({ label, optional, error, hint, className, ...rest }) {
  return (
    <Field label={label} optional={optional} error={error} hint={hint} className={className}>
      {(a11y) => <textarea className="control" {...a11y} {...rest} />}
    </Field>
  )
}

export function PasswordInput({ label, error, hint, ...rest }) {
  const [ver, setVer] = useState(false)
  return (
    <Field label={label} error={error} hint={hint}>
      {(a11y) => (
        <div className="pw">
          <input className="control" type={ver ? 'text' : 'password'} {...a11y} {...rest} />
          <button type="button" className="btn btn-ghost btn-icon" onClick={() => setVer(!ver)} aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
            {ver ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      )}
    </Field>
  )
}

export function Empty({ icon, title, children, action }) {
  return (
    <div className="empty">
      <IconChip icon={icon} size="lg" />
      <h3 className="h-sub">{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  )
}
