import { useState } from 'react'
import { Boton, Aviso, Pastilla } from '../componentes/piezas.jsx'
import { registrarEvento, reiniciarDemo, HAY_BACKEND } from '../almacen.js'
import { CLAVE_PANEL, ID_PLANILLA } from '../config.js'
import { elegido, guardar, pideElSistema, resuelto } from '../movimiento.js'

const reloj = (ms) => ms ? new Date(ms).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '—'

export default function Panel({ estado, ir, refrescar, ultima, setContexto }) {
  const [clave, setClave] = useState('')
  const [adentro, setAdentro] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')
  const [nota, setNota] = useState('')
  const [mov, setMov] = useState(elegido)
  const cambiarMovimiento = (v) => { guardar(v); setMov(v) }

  if (!adentro) {
    return (
      <>
        <div className="cabecera">
          <button className="volver" onClick={() => ir('ruleta')}>◀ Volver</button>
          <h2 className="bl">Panel de la fiesta</h2>
        </div>
        <form className="chapa bloque" style={{ maxWidth: 420 }}
          onSubmit={(e) => {
            e.preventDefault()
            if (clave.trim() === CLAVE_PANEL) { setAdentro(true); setError('') }
            else setError('Esa no es la clave.')
          }}>
          <div className="campo">
            <label htmlFor="c-clave">Clave</label>
            <input id="c-clave" className="entrada" type="password" value={clave}
              onChange={(e) => setClave(e.target.value)} placeholder="La que puso el anfitrión" />
          </div>
          {error ? <Aviso color="var(--sangre)">{error}</Aviso> : null}
          <div className="acciones" style={{ marginTop: 12 }}>
            <Boton type="submit">Entrar</Boton>
          </div>
        </form>
      </>
    )
  }

  async function accion(fn, aviso) {
    setOcupado(true); setError(''); setNota('')
    try { await fn(); await refrescar(); if (aviso) setNota(aviso) }
    catch (e) { setError(e.message) }
    finally { setOcupado(false) }
  }

  const abrirVuelta = () => accion(async () => {
    if (estado.sesion) await registrarEvento('sesion_cerrada', estado.sesion.id, {})
    const n = estado.sesiones.length + 1
    await registrarEvento('sesion_abierta', '', { nombre: n === 1 ? 'Primera vuelta' : 'Vuelta ' + n })
  }, 'Vuelta nueva abierta. Todos los temas volvieron a la bolsa.')

  const cerrarVuelta = () => accion(
    () => registrarEvento('sesion_cerrada', estado.sesion.id, {}),
    'Vuelta cerrada.')

  const darDeBaja = (a) => accion(
    () => registrarEvento('anotacion_baja', estado.sesion ? estado.sesion.id : '', { anotacionId: a.id }),
    `Se dio de baja "${a.tema}" de ${a.persona}. La fila sigue en la planilla, pero salió de la bolsa.`)

  return (
    <>
      <div className="cabecera">
        <button className="volver" onClick={() => ir('ruleta')}>◀ Volver</button>
        <h2 className="bl">Panel de la fiesta</h2>
      </div>

      <div className="panel">
        <div>
          <div className="chapa bloque">
            <h3>La vuelta</h3>
            <p style={{ fontWeight: 700, marginBottom: 8 }}>
              {estado.sesion
                ? <>Abierta: <b>{estado.sesion.nombre}</b> desde las {reloj(estado.sesion.abiertaEn)}.</>
                : 'No hay ninguna vuelta abierta. La máquina abre una sola al primer giro.'}
            </p>
            <p style={{ fontSize: 13.5, fontWeight: 600, color: '#4A4136', marginBottom: 10 }}>
              Abrir una vuelta nueva devuelve todos los temas a la bolsa y deja que la gente vuelva a cantar.
              Lo ya cantado queda registrado y sigue sumando en la tabla.
            </p>
            {estado.enCurso ? (
              <p style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--sangre)', marginBottom: 8 }}>
                Hay alguien cantando ({estado.enCurso.personas.join(' + ')}). Cerrá esa actuación
                antes de tocar la vuelta, o los tributos de esa canción quedan sin cargar.
              </p>
            ) : null}
            <div className="acciones">
              <Boton chico onClick={abrirVuelta} disabled={ocupado || Boolean(estado.enCurso)}>Abrir vuelta nueva</Boton>
              {estado.sesion
                ? <Boton chico tono="gris" onClick={cerrarVuelta} disabled={ocupado || Boolean(estado.enCurso)}>Cerrar la vuelta</Boton>
                : null}
            </div>
          </div>

          <div className="chapa bloque">
            <h3>Anotaciones ({estado.anotaciones.length})</h3>
            {estado.anotaciones.length === 0
              ? <p className="vacio-msg">Nadie se anotó todavía.</p>
              : (
                <ul className="lista">
                  {estado.anotaciones.slice().reverse().map((a) => {
                    const usada = estado.consumidas.has(a.id)
                    return (
                      <li key={a.id} style={{ '--c': usada ? 'var(--acero-lo)' : (a.cantaSolo ? 'var(--cian)' : 'var(--oro)') }}>
                        <span className="nom">{a.persona}</span>
                        <span className="tema">{a.tema}</span>
                        {usada ? <Pastilla color="var(--acero-lo)">cantó</Pastilla> : null}
                        {a.cantaSolo ? <Pastilla color="var(--cian)">solo</Pastilla> : null}
                        <Boton chico tono="roja" onClick={() => darDeBaja(a)} disabled={ocupado}>Baja</Boton>
                      </li>
                    )
                  })}
                </ul>
              )}
            <p style={{ fontSize: 13, fontWeight: 600, color: '#4A4136', marginTop: 8 }}>
              La baja no borra nada de la planilla: escribe un evento que la saca de la bolsa.
            </p>
          </div>

          <div className="chapa bloque">
            <h3>Lo que se cantó ({estado.actuaciones.length})</h3>
            {estado.actuaciones.length === 0
              ? <p className="vacio-msg">Nada todavía.</p>
              : (
                <ul className="lista">
                  {estado.actuaciones.slice().reverse().map((a) => (
                    <li key={a.id} style={{
                      '--c': a.estado === 'abortada' ? 'var(--sangre)'
                        : a.estado === 'en_curso' ? 'var(--violeta)' : 'var(--musgo)'
                    }}>
                      <span className="nom">{a.personas.join(' + ')}</span>
                      <span className="tema">
                        {a.tema}<br />
                        <b>{reloj(a.ts)} · {a.estado.replace('_', ' ')} · {a.tributos} tributos</b>
                      </span>
                      {a.estado === 'terminada' ? (
                        <Boton chico tono="gris" onClick={() => {
                          setContexto({ actuacionId: a.id, personas: a.personas, tema: a.tema })
                          ir('tributos')
                        }}>Tributos</Boton>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
          </div>
        </div>

        <div>
          <div className="chapa bloque">
            <h3>Movimiento</h3>
            <p className="sync" style={{ marginBottom: 8 }}>
              <span className={'punto' + (resuelto() === 'completo' ? '' : ' rojo')} />
              Ahora: {resuelto() === 'completo' ? 'animaciones completas' : 'animaciones reducidas'}
            </p>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#4A4136', marginBottom: 10, lineHeight: 1.35 }}>
              Tu sistema pide <b>{pideElSistema() ? 'reducir el movimiento' : 'movimiento normal'}</b>.
              En Windows eso se enciende solo al apagar Accesibilidad → Efectos visuales →
              Efectos de animación. Podés ignorarlo desde acá: la elección queda guardada
              en este navegador.
            </p>
            <div className="acciones">
              <Boton chico tono={mov === 'completo' ? '' : 'gris'}
                onClick={() => cambiarMovimiento('completo')}>Completas</Boton>
              <Boton chico tono={mov === 'reducido' ? 'roja' : 'gris'}
                onClick={() => cambiarMovimiento('reducido')}>Reducidas</Boton>
              <Boton chico tono={mov === 'auto' ? 'violeta' : 'gris'}
                onClick={() => cambiarMovimiento('auto')}>Como el sistema</Boton>
            </div>
          </div>

          <div className="chapa bloque">
            <h3>Conexión</h3>
            <p className="sync">
              <span className={'punto' + (HAY_BACKEND ? '' : ' rojo')} />
              {HAY_BACKEND ? 'Planilla conectada' : 'Modo demo, guarda en este navegador'}
            </p>
            <p className="sync" style={{ marginTop: 6 }}>
              <span className="punto" /> Última lectura: {reloj(ultima)}
            </p>
            <div className="acciones" style={{ marginTop: 10 }}>
              <Boton chico tono="gris" onClick={() => refrescar()} disabled={ocupado}>Releer ahora</Boton>
            </div>
            <p style={{ fontSize: 13, fontWeight: 600, marginTop: 10 }}>
              <a href={'https://docs.google.com/spreadsheets/d/' + ID_PLANILLA + '/edit'} target="_blank" rel="noreferrer">
                Abrir la planilla
              </a>
            </p>
          </div>

          {!HAY_BACKEND ? (
            <div className="chapa bloque">
              <h3>Modo demo</h3>
              <p style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 10 }}>
                Sin Apps Script conectado la app guarda todo en este navegador y trae doce anotados de ejemplo.
                Seguí los pasos de INSTALAR.md para enchufarla a la planilla.
              </p>
              <Boton chico tono="roja" onClick={() => { reiniciarDemo(); refrescar() }}>Reiniciar el ejemplo</Boton>
            </div>
          ) : null}

          {nota ? <Aviso color="var(--musgo)">{nota}</Aviso> : null}
          {error ? <Aviso color="var(--sangre)">{error}</Aviso> : null}
        </div>
      </div>
    </>
  )
}
