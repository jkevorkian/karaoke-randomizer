import { useState } from 'react'

/**
 * Una foto de Braian pegada sobre el gabinete.
 *
 * Las fotos son JPG con fondo, no PNG recortados, así que en vez de fingir
 * un recorte las montamos como lo que son: una foto con marco negro y un
 * poco torcida, como si estuviera pegada con cinta sobre la máquina.
 *
 * `enfoque` es el object-position: mueve el encuadre para que la cara caiga
 * dentro del marco cuando la foto se recorta.
 */
export default function Foto({ archivo, clase = '', alt = '', pista = '', enfoque = '50% 35%' }) {
  const [falta, setFalta] = useState(false)

  if (falta) {
    if (!import.meta.env.DEV) return null
    return (
      <div className={'foto hueco ' + clase} aria-hidden="true">
        <span>{archivo}</span>
        {pista ? <span style={{ opacity: .75 }}>{pista}</span> : null}
      </div>
    )
  }

  return (
    <div className={'foto ' + clase} aria-hidden={alt ? undefined : 'true'}>
      <img
        src={import.meta.env.BASE_URL + 'fotos/' + archivo}
        alt={alt}
        style={{ objectPosition: enfoque }}
        onError={() => setFalta(true)}
        loading="lazy"
      />
    </div>
  )
}
