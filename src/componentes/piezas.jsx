export function Boton({ tono = '', chico = false, children, ...resto }) {
  return (
    <button className={['boton', tono, chico ? 'chico' : ''].filter(Boolean).join(' ')} {...resto}>
      <span>{children}</span>
    </button>
  )
}

export function Aviso({ color, children, clase = '' }) {
  return (
    <div className={'chapa aviso ' + clase} style={color ? { '--c': color } : undefined}>
      {children}
    </div>
  )
}

export function Pastilla({ color, children }) {
  return <span className="pastilla" style={color ? { '--c': color } : undefined}>{children}</span>
}

export function Cargando({ texto = 'Leyendo la planilla' }) {
  return <p className="cargando"><i /> {texto}</p>
}

/** Encendedor de tributo, al estilo de las manos de Brutal Legend. */
export function Encendedor({ prendido, ...resto }) {
  return (
    <button className="enc" aria-label="tributo" {...resto}>
      <svg viewBox="0 0 34 50" role="presentation">
        <path d="M11 20h12v26H11z" fill={prendido ? '#B9AF9F' : '#8E8477'} stroke="#0B0A09" strokeWidth="3" />
        <path d="M13 15h8v6h-8z" fill="#7C7263" stroke="#0B0A09" strokeWidth="3" />
        {prendido ? (
          <>
            <path d="M17 1c4 5 6 7 6 10a6 6 0 0 1-12 0c0-3 2-5 6-10z" fill="#FFC01E" stroke="#0B0A09" strokeWidth="3" />
            <path d="M17 7c1.6 2.4 2.6 3.4 2.6 4.8a2.6 2.6 0 0 1-5.2 0c0-1.4 1-2.4 2.6-4.8z" fill="#B0201A" />
          </>
        ) : (
          <path d="M17 4c3 4 5 6 5 8" fill="none" stroke="#8E8477" strokeWidth="3" strokeLinecap="round" />
        )}
      </svg>
    </button>
  )
}
