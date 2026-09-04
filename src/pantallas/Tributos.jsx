import { useState } from 'react'
import { Boton, Aviso, Encendedor } from '../componentes/piezas.jsx'
import Foto from '../componentes/Foto.jsx'
import { registrarEvento } from '../almacen.js'

const ENCENDEDORES = 20

export default function Tributos({ estado, ir, refrescar, contexto }) {
  const candidata = contexto && contexto.actuacionId
    ? estado.actuaciones.find((a) => a.id === contexto.actuacionId)
    : [...estado.actuaciones].reverse().find((a) => a.estado === 'terminada')

  const [cantidad, setCantidad] = useState(candidata ? candidata.tributos : 0)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')

  if (!candidata) {
    return (
      <>
        <div className="cabecera">
          <button className="volver" onClick={() => ir('ruleta')}>◀ Volver</button>
          <h2 className="bl">Tributos</h2>
        </div>
        <Aviso color="var(--oro)">Todavía no terminó ninguna actuación en esta fiesta.</Aviso>
      </>
    )
  }

  async function confirmar() {
    setOcupado(true)
    setError('')
    try {
      await registrarEvento('tributos', candidata.sesionId, {
        actuacionId: candidata.id,
        cantidad: Math.max(0, Math.round(Number(cantidad) || 0))
      })
      await refrescar()
      ir('ruleta')
    } catch (e) {
      setError(e.message)
    } finally {
      setOcupado(false)
    }
  }

  const prendidos = Math.min(ENCENDEDORES, Math.max(0, Math.round(Number(cantidad) || 0)))

  return (
    <>
      <div className="cabecera">
        <button className="volver" onClick={() => ir('ruleta')}>◀ Máquina</button>
        <h2 className="bl">¿Cuántos tributos?</h2>
      </div>

      <div className="tributos">
        <div>
          <div className="chapa bloque">
            <h3>{candidata.personas.join(' + ')}</h3>
            <p style={{ fontWeight: 700 }}>
              {candidata.tema}{candidata.artista ? ' — ' + candidata.artista : ''}
            </p>
          </div>

          <p style={{ fontWeight: 600, color: '#4A4136' }}>
            Un tributo es un encendedor levantado. Contá los que se levantaron y cargalos acá.
          </p>

          <div className="encendedores">
            {Array.from({ length: ENCENDEDORES }, (_, i) => (
              <Encendedor key={i} prendido={i < prendidos}
                onClick={() => setCantidad(i + 1 === prendidos ? i : i + 1)} />
            ))}
          </div>

          <div className="contador">
            <span className="num mono">{Math.max(0, Math.round(Number(cantidad) || 0))}</span>
            <div className="rapidos">
              <Boton chico tono="gris" onClick={() => setCantidad((n) => Math.max(0, Number(n) - 1))}>−1</Boton>
              <Boton chico onClick={() => setCantidad((n) => Number(n) + 1)}>+1</Boton>
              <Boton chico onClick={() => setCantidad((n) => Number(n) + 5)}>+5</Boton>
              <Boton chico onClick={() => setCantidad((n) => Number(n) + 10)}>+10</Boton>
              <Boton chico tono="gris" onClick={() => setCantidad(0)}>Cero</Boton>
            </div>
          </div>

          <div className="campo" style={{ marginTop: 14, maxWidth: 220 }}>
            <label htmlFor="c-trib">O escribilo</label>
            <input id="c-trib" className="entrada mono" type="number" min="0" inputMode="numeric"
              value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
          </div>

          {error ? <div className="bloque"><Aviso color="var(--sangre)">{error}</Aviso></div> : null}

          <div className="acciones" style={{ marginTop: 16 }}>
            <Boton onClick={confirmar} disabled={ocupado}>{ocupado ? 'Guardando' : 'Confirmar'}</Boton>
            <Boton tono="gris" onClick={() => ir('ruleta')}>Después</Boton>
          </div>
        </div>

        <div>
          <Foto archivo="foto-04.jpg" clase="der" alt="" pista="tributos" enfoque="55% 28%" />
          <div className="chapa bloque" style={{ marginTop: 12 }}>
            <h3>Cómo suma</h3>
            <p style={{ fontWeight: 600, fontSize: 14 }}>
              Los tributos van a la actuación entera. Si fue dueto, los dos se llevan el mismo número.
              Podés volver a cargarlos: se queda con el último valor.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
