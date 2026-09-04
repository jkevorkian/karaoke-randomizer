import { useEffect, useRef, useState } from 'react'
import { Boton, Aviso, Pastilla } from '../componentes/piezas.jsx'
import { anotar, buscarVideos } from '../almacen.js'
import { normalizar } from '../dominio.js'

const ESPERA_MS = 650

function idDeYoutube(texto) {
  const t = String(texto || '').trim()
  const m = t.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{11})/)
  if (m) return m[1]
  return /^[A-Za-z0-9_-]{11}$/.test(t) ? t : ''
}

export default function Anotarse({ estado, ir, refrescar }) {
  const [persona, setPersona] = useState('')
  const [tema, setTema] = useState('')
  const [artista, setArtista] = useState('')
  const [cantaSolo, setCantaSolo] = useState(false)
  const [elegido, setElegido] = useState(null)
  const [pegado, setPegado] = useState('')

  const [videos, setVideos] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [avisoBusqueda, setAvisoBusqueda] = useState('')
  const [error, setError] = useState('')
  const [listo, setListo] = useState(false)
  const [enviando, setEnviando] = useState(false)

  const pedido = useRef(0)
  // El estado de React tarda un tick en pintarse: sin este cerrojo, dos toques
  // rápidos en Anotarme pasan los dos y dejan la fila duplicada, que después
  // no se puede borrar de la planilla.
  const enVuelo = useRef(false)

  useEffect(() => {
    const consulta = tema.trim()
    if (consulta.length < 3) { setVideos([]); setAvisoBusqueda(''); return }
    const mio = ++pedido.current
    setBuscando(true)
    const reloj = setTimeout(async () => {
      try {
        const r = await buscarVideos(consulta)
        if (mio !== pedido.current) return
        setVideos(r.videos || [])
        setAvisoBusqueda(r.ok ? '' : (r.error || 'No se pudo buscar en YouTube.'))
      } catch (e) {
        if (mio === pedido.current) { setVideos([]); setAvisoBusqueda(e.message) }
      } finally {
        if (mio === pedido.current) setBuscando(false)
      }
    }, ESPERA_MS)
    return () => clearTimeout(reloj)
  }, [tema])

  const idPegado = idDeYoutube(pegado)
  const videoFinal = elegido || (idPegado
    ? { id: idPegado, titulo: tema.trim() || 'Video pegado a mano', canal: '' }
    : null)

  const yaAnotado = estado.anotaciones.some(
    (a) => normalizar(a.persona) === normalizar(persona) && normalizar(a.tema) === normalizar(tema)
  )

  const mismoTema = tema.trim().length > 2
    ? estado.anotaciones.filter((a) => normalizar(a.tema) === normalizar(tema))
    : []

  async function guardar(e) {
    e.preventDefault()
    if (enVuelo.current) return
    setError('')
    if (!persona.trim()) return setError('Falta tu nombre.')
    if (!tema.trim()) return setError('Falta el tema que vas a cantar.')
    if (yaAnotado) return setError('Ya estás anotado con ese tema.')

    enVuelo.current = true
    setEnviando(true)
    try {
      await anotar({
        persona: persona.trim(),
        tema: tema.trim(),
        artista: artista.trim(),
        youtubeId: videoFinal ? videoFinal.id : '',
        youtubeTitulo: videoFinal ? videoFinal.titulo : '',
        duracion: '',
        cantaSolo
      })
      await refrescar()
      setListo(true)
      setTema(''); setArtista(''); setElegido(null); setPegado(''); setCantaSolo(false); setVideos([])
      setTimeout(() => setListo(false), 4000)
    } catch (err) {
      setError(err.message)
    } finally {
      setEnviando(false)
      enVuelo.current = false
    }
  }

  return (
    <>
      <div className="cabecera">
        <button className="volver" onClick={() => ir('ruleta')}>◀ Volver</button>
        <h2 className="bl">Anotate</h2>
      </div>

      <form className="formulario" onSubmit={guardar}>
        <div>
          <div className="campo">
            <label htmlFor="c-nombre">¿Cómo te llamás?</label>
            <input id="c-nombre" className="entrada" value={persona} autoComplete="name"
              onChange={(e) => setPersona(e.target.value)}
              placeholder="Tu nombre, como te dicen todos" />
          </div>

          <div className="campo">
            <label htmlFor="c-tema">¿Qué vas a cantar?</label>
            <input id="c-tema" className="entrada" value={tema}
              onChange={(e) => { setTema(e.target.value); setElegido(null) }}
              placeholder="Escribí el nombre del tema" />
            <p className="pista">
              {buscando ? 'Buscando el karaoke en YouTube…' : 'Mientras escribís buscamos el karaoke en YouTube.'}
            </p>
          </div>

          {avisoBusqueda ? (
            <Aviso color="var(--sangre)">
              {avisoBusqueda}
              <div className="campo" style={{ marginTop: 10, marginBottom: 0 }}>
                <label htmlFor="c-link" style={{ fontSize: 16 }}>Pegá el link del video</label>
                <input id="c-link" className="entrada" value={pegado}
                  onChange={(e) => setPegado(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..." />
              </div>
            </Aviso>
          ) : null}

          {videos.length ? (
            <div className="resultados">
              {videos.map((v) => (
                <button type="button" key={v.id} className="vid"
                  aria-pressed={Boolean(elegido && elegido.id === v.id)}
                  onClick={() => { setElegido(v); setPegado('') }}>
                  <span className="thumb">
                    {v.miniatura ? <img src={v.miniatura} alt="" loading="lazy" /> : null}
                  </span>
                  <span className="meta">
                    <strong>{v.titulo}</strong>
                    <em>{v.canal}</em>
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          <div className="campo" style={{ marginTop: 15 }}>
            <label htmlFor="c-artista">Artista (opcional)</label>
            <input id="c-artista" className="entrada" value={artista}
              onChange={(e) => setArtista(e.target.value)} placeholder="Quién la canta" />
          </div>

          <button type="button" className="check" onClick={() => setCantaSolo(!cantaSolo)} aria-pressed={cantaSolo}>
            <span className={'caja' + (cantaSolo ? ' si' : '')}>✕</span>
            <span className="t">
              <strong>Esta la canto solo. No me pongan en dueto.</strong>
              <em>Si otra persona eligió el mismo tema, cada uno la canta por su cuenta y nadie pierde el turno.</em>
            </span>
          </button>

          {mismoTema.length ? (
            <div className="bloque">
              <Aviso color="var(--violeta)">
                Ya lo eligió {mismoTema.map((a) => a.persona).join(', ')}.
                {cantaSolo
                  ? ' Como pediste cantarla solo, van a ir por separado.'
                  : ' Si a los dos les toca, salen a dúo.'}
              </Aviso>
            </div>
          ) : null}

          {error ? <div className="bloque"><Aviso color="var(--sangre)">{error}</Aviso></div> : null}
          {listo ? <div className="bloque"><Aviso color="var(--musgo)">Quedaste anotado. Ya estás en la bolsa.</Aviso></div> : null}

          <div className="acciones" style={{ marginTop: 14 }}>
            <Boton type="submit" disabled={enviando}>{enviando ? 'Guardando' : 'Anotarme'}</Boton>
            {videoFinal
              ? <Pastilla color="var(--musgo)">Video elegido</Pastilla>
              : <Pastilla>Sin video todavía</Pastilla>}
          </div>
        </div>

        <div>
          <h3 className="bl fino" style={{ fontSize: 22, marginBottom: 8 }}>Ya se anotaron</h3>
          {estado.anotaciones.length === 0
            ? <p className="vacio-msg">Todavía no se anotó nadie. Sé el primero.</p>
            : (
              <ul className="lista">
                {estado.anotaciones.slice().reverse().map((a) => (
                  <li key={a.id} style={{
                    '--c': estado.consumidas.has(a.id)
                      ? 'var(--acero-lo)'
                      : (a.cantaSolo ? 'var(--cian)' : 'var(--oro)')
                  }}>
                    <span className="nom">{a.persona}</span>
                    <span className="tema">
                      {a.tema}
                      {a.cantaSolo ? <><br /><b>canta solo</b></> : null}
                      {estado.consumidas.has(a.id) ? <><br /><b>ya cantó</b></> : null}
                    </span>
                  </li>
                ))}
              </ul>
            )}
        </div>
      </form>
    </>
  )
}
