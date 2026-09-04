import { useRef, useState } from 'react'
import Maquina from '../componentes/Maquina.jsx'
import Foto from '../componentes/Foto.jsx'
import { Boton, Aviso } from '../componentes/piezas.jsx'
import { sortear, nuevoId } from '../dominio.js'
import { registrarEvento } from '../almacen.js'
import { despertar, golpe } from '../audio.js'

export default function Ruleta({ estado, ir, refrescar }) {
  const maquina = useRef(null)
  // Cerrojo de reentrada: el estado de React tarda un tick en pintarse, y en
  // ese tick la palanca sigue aceptando toques. Sin esto, tres tirones
  // seguidos en el primer giro abrían tres vueltas.
  const enVuelo = useRef(false)
  const [girando, setGirando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [mensaje, setMensaje] = useState(null)
  const [ocupado, setOcupado] = useState(false)

  async function asegurarSesion() {
    if (estado.sesion) return estado.sesion.id
    const numero = estado.sesiones.length + 1
    const nombre = numero === 1 ? 'Primera vuelta' : 'Vuelta ' + numero
    const r = await registrarEvento('sesion_abierta', '', { nombre })
    const nuevo = await refrescar()
    return (nuevo && nuevo.sesion && nuevo.sesion.id) || (r && r.id) || ''
  }

  async function tirar() {
    if (enVuelo.current) return
    enVuelo.current = true
    despertar(); golpe()
    setMensaje(null)

    try {
      if (estado.enCurso) {
        setMensaje(`Hay una actuación en curso (${estado.enCurso.personas.join(' + ')}). Terminala o abortala antes de girar de nuevo.`)
        enVuelo.current = false
        return
      }
      const sorteo = sortear(estado)
      if (!sorteo) {
        setMensaje('No queda ningún tema en la bolsa. Abrí una vuelta nueva desde el Panel.')
        enVuelo.current = false
        return
      }
      if (!estado.sesion) {
        setOcupado(true)
        await asegurarSesion()
        setOcupado(false)
      }
      setGirando(true)
      setResultado(null)
      maquina.current.girar(sorteo, () => {
        setGirando(false)
        setResultado(sorteo)
        enVuelo.current = false
      })
    } catch (e) {
      // Si la escritura de la vuelta falla, antes la palanca no hacía nada y
      // no aparecía ningún mensaje.
      setOcupado(false)
      setGirando(false)
      setMensaje('No se pudo abrir la vuelta: ' + (e.message || e))
      enVuelo.current = false
    }
  }

  async function arrancar() {
    if (!resultado || enVuelo.current) return
    enVuelo.current = true
    setOcupado(true)
    setMensaje(null)
    try {
      // Releemos justo antes de escribir: si otro dispositivo lanzó una
      // actuación en estos segundos, no la pisamos.
      const fresco = await refrescar()
      if (fresco && fresco.enCurso) {
        setMensaje(`Alguien ya está cantando (${fresco.enCurso.personas.join(' + ')}). Cerrá esa actuación antes de lanzar otra.`)
        return
      }
      const sesionId = await asegurarSesion()
      await registrarEvento('actuacion_iniciada', sesionId, {
        actuacionId: nuevoId(),
        anotacionIds: resultado.anotacionIds,
        personas: resultado.personas,
        tema: resultado.principal.tema,
        artista: resultado.principal.artista,
        youtubeId: resultado.principal.youtubeId,
        duracion: resultado.principal.duracion
      })
      await refrescar()
      ir('reproductor')
    } catch (e) {
      setMensaje(e.message || String(e))
    } finally {
      setOcupado(false)
      enVuelo.current = false
    }
  }

  const bolsa = estado.disponibles.length
  const trabado = Boolean(estado.enCurso)

  return (
    <>
      <Foto archivo="foto-02.jpg" clase="izq" pista="asoma arriba" enfoque="50% 22%" />
      <div className="tapa">
        <Maquina
          ref={maquina}
          estado={estado}
          resultado={resultado}
          girando={girando}
          ocupado={ocupado}
          trabado={trabado}
          onGirar={tirar}
          onAbortar={() => { setResultado(null); setMensaje(null) }}
          puedeAbortar={Boolean(resultado)}
        />

        <div className="menu">
          {resultado ? (
            <>
              <div className="titulin bl blanco fino">
                {resultado.esDueto ? 'Salió dueto' : 'Le tocó a'}
              </div>
              <div className="bl" style={{ fontSize: 'clamp(28px,4.4vw,54px)' }}>
                {resultado.personas.join(' + ')}
              </div>
              <p className="nota">
                {resultado.principal.tema}
                {resultado.principal.artista ? ' — ' + resultado.principal.artista : ''}
                {resultado.esDueto
                  ? '. Los dos eligieron el mismo tema y ninguno pidió cantar solo.'
                  : resultado.principal.cantaSolo ? '. Pidió cantarlo sin compañía.' : ''}
              </p>
              <div className="acciones" style={{ marginTop: 12 }}>
                <Boton onClick={arrancar} disabled={ocupado}>{ocupado ? 'Yendo' : 'Al escenario'}</Boton>
                <Boton tono="gris" chico onClick={tirar} disabled={girando || ocupado}>Otra vuelta</Boton>
              </div>
            </>
          ) : (
            <>
              <div className="titulin bl blanco fino">Cumple de Braian</div>
              <button className="op" aria-current="true" onClick={tirar}
                disabled={girando || ocupado || trabado || !bolsa}>Girar</button>
              <button className="op" onClick={() => ir('anotarse')}>Anotarse</button>
              <button className="op" onClick={() => ir('ranking')}>Ranking</button>
              <button className="op" onClick={() => ir('panel')}>Panel</button>
              <p className="nota">
                {trabado
                  ? 'Primero hay que cerrar la actuación que está sonando.'
                  : bolsa
                    ? 'Tirá de la palanca. La máquina elige a quién le toca y con qué tema, y escupe el ticket en la bandeja.'
                    : 'La bolsa está vacía. Anotate o abrí una vuelta nueva desde el Panel.'}
              </p>
            </>
          )}
        </div>

        <Foto archivo="foto-03.jpg" clase="der" pista="la grande" enfoque="50% 30%" />
      </div>

      {mensaje ? <Aviso clase="error" color="var(--sangre)">{mensaje}</Aviso> : null}

      {trabado ? (
        <Aviso color="var(--violeta)">
          Hay alguien cantando ahora: <b>{estado.enCurso.personas.join(' + ')}</b>.{' '}
          <button className="volver" onClick={() => ir('reproductor')}>Volver al video</button>
        </Aviso>
      ) : null}
    </>
  )
}
