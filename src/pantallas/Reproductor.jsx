import { useState } from 'react'
import { Boton, Aviso } from '../componentes/piezas.jsx'
import { registrarEvento } from '../almacen.js'

export default function Reproductor({ estado, ir, refrescar, setContexto }) {
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')
  const act = estado.enCurso

  if (!act) {
    return (
      <>
        <div className="cabecera">
          <button className="volver" onClick={() => ir('ruleta')}>◀ Volver</button>
          <h2 className="bl">Sin nadie cantando</h2>
        </div>
        <Aviso color="var(--oro)">
          No hay ninguna actuación en curso. Volvé a la máquina y tirá de la palanca.
        </Aviso>
      </>
    )
  }

  async function cerrar(tipo) {
    setOcupado(true)
    setError('')
    try {
      await registrarEvento(tipo, act.sesionId, { actuacionId: act.id })
      await refrescar()
      if (tipo === 'actuacion_terminada') {
        setContexto({ actuacionId: act.id, personas: act.personas, tema: act.tema })
        ir('tributos')
      } else {
        ir('ruleta')
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setOcupado(false)
    }
  }

  const enlace = act.youtubeId
    ? 'https://www.youtube.com/watch?v=' + act.youtubeId
    : 'https://www.youtube.com/results?search_query=' + encodeURIComponent(act.tema + ' karaoke')

  return (
    <>
      <div className="cabecera">
        <button className="volver" onClick={() => ir('ruleta')}>◀ Máquina</button>
        <h2 className="bl">{act.personas.join(' + ')}</h2>
      </div>

      <div className="marco-video">
        <div className="caja">
          {act.youtubeId ? (
            <iframe
              key={act.youtubeId}
              src={`https://www.youtube.com/embed/${act.youtubeId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
              title={act.tema}
              allow="autoplay; encrypted-media; fullscreen"
              allowFullScreen
            />
          ) : (
            <div className="sin-video">
              <p className="bl" style={{ fontSize: 26 }}>Sin video guardado</p>
              <p style={{ maxWidth: '42ch', fontWeight: 600 }}>
                Esta anotación se guardó sin elegir video. Buscalo en YouTube y ponelo a mano.
              </p>
              <a className="boton" href={enlace} target="_blank" rel="noreferrer"><span>Buscar en YouTube</span></a>
            </div>
          )}
        </div>
      </div>

      <div className="controles">
        <div className="quien">
          <strong>{act.tema}</strong>
          <em>{act.artista}{act.personas.length > 1 ? ' · dueto' : ''}</em>
        </div>
        <a className="boton gris chico" href={enlace} target="_blank" rel="noreferrer"><span>Abrir en YouTube</span></a>
        <Boton tono="roja" onClick={() => cerrar('actuacion_abortada')} disabled={ocupado}>Abortar</Boton>
        <Boton onClick={() => cerrar('actuacion_terminada')} disabled={ocupado}>Terminó</Boton>
      </div>

      {error ? <div className="bloque"><Aviso color="var(--sangre)">{error}</Aviso></div> : null}
    </>
  )
}
