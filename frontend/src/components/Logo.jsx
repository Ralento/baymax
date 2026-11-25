// Marca de Baymax: un círculo con dos ojos unidos por una línea (la cara del personaje), dibujada como SVG propio.
export function Face({ size = 36, blink = false, className = '', strokeWidth = 3 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <circle cx="32" cy="32" r="26" stroke="currentColor" strokeWidth={strokeWidth} />
      <g fill="currentColor">
        <circle className={blink ? 'eye' : undefined} cx="21" cy="32" r="4.2" />
        <circle className={blink ? 'eye' : undefined} cx="43" cy="32" r="4.2" />
      </g>
      <path d="M21 32h22" stroke="currentColor" strokeWidth={strokeWidth * 0.8} strokeLinecap="round" />
    </svg>
  )
}

export function Brand({ blink = false }) {
  return (
    <div className="brand">
      <span style={{ color: 'var(--accent)', display: 'inline-flex' }}>
        <Face size={34} blink={blink} />
      </span>
      Baymax
    </div>
  )
}
