import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { clac, premio } from '../audio.js'
import { normalizar } from '../dominio.js'
import { CUMPLEANERO } from '../config.js'
import { reducido } from '../movimiento.js'
import Foto from './Foto.jsx'

export const SELLOS = {
  solo:   { clave: 'solo',   txt: 'Solo',   fondo: '#33BFDC', tinta: '#0B0A09' },
  duo:    { clave: 'duo',    txt: 'Dúo',    fondo: '#8B45D0', tinta: '#FFF6E6' },
  cumple: { clave: 'cumple', txt: 'Cumple', fondo: '#E8409B', tinta: '#FFF6E6' }
}

// Mira la decisión ya resuelta (sistema, o lo que se haya forzado desde el
// Panel), no la preferencia del sistema a secas.
const seco = () => reducido()
const mezclar = (a) => { const l = a.slice(); for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [l[i], l[j]] = [l[j], l[i]] } return l }
const esCumpleanero = (n) => normalizar(n) === normalizar(CUMPLEANERO)

export function selloDe(resultado) {
  if (!resultado) return SELLOS.solo
  if (resultado.esDueto) return SELLOS.duo
  return esCumpleanero(resultado.principal.persona) ? SELLOS.cumple : SELLOS.solo
}

/* ---------- armado de las tiras ---------- */

function relleno(pool, minimo = 3) {
  if (!pool.length) return []
  let l = pool
  while (l.length < minimo) l = l.concat(pool)
  return l.slice(0, minimo)
}

function armar(pool, ganador, animar) {
  if (!pool.length) pool = [ganador]
  if (!animar) {
    const l = relleno(mezclar(pool))
    l[1] = ganador
    return { lista: l, idx: 1 }
  }
  // Cinco vueltas alcanzan de sobra para 1,5 s de giro y son la mitad de
  // nodos que el navegador tiene que montar y volver a recorrer.
  let lista = []
  for (let i = 0; i < 5; i++) lista = lista.concat(mezclar(pool))
  const idx = lista.length
  lista = lista.concat([ganador], relleno(mezclar(pool)))
  return { lista, idx }
}

function pools(estado) {
  const personas = [...new Set(estado.anotaciones.map((a) => a.persona))].map((n) => ({ n }))
  const vistos = new Set()
  const temas = []
  estado.anotaciones.forEach((a) => {
    const k = normalizar(a.tema)
    if (vistos.has(k)) return
    vistos.add(k)
    temas.push({ t: a.tema, a: a.artista })
  })
  return {
    personas: personas.length ? personas : [{ n: '—' }],
    temas: temas.length ? temas : [{ t: '—', a: '' }]
  }
}

function construir(estado, resultado, animar) {
  const { personas, temas } = pools(estado)
  const sellos = [SELLOS.solo, SELLOS.duo, SELLOS.cumple]

  const ganadorP = resultado
    ? { n: resultado.principal.persona, mas: resultado.acompanan.map((a) => a.persona).join(' + ') || null }
    : { n: '—' }
  const ganadorT = resultado
    ? { t: resultado.principal.tema, a: resultado.principal.artista }
    : { t: 'Tirá la palanca', a: '' }
  const ganadorS = resultado ? selloDe(resultado) : SELLOS.solo

  const p = armar(personas, ganadorP, animar)
  const t = armar(temas, ganadorT, animar)
  const s = armar(sellos, ganadorS, animar)

  return { p: p.lista, t: t.lista, s: s.lista, ip: p.idx, it: t.idx, is: s.idx, animar, token: Date.now() + Math.random() }
}

/* ---------- celdas ---------- */

const CeldaPersona = ({ n, mas }) => (
  <div className="celda">
    <div className="n1">{n}</div>
    {mas ? <div className="n3">+ {mas}</div> : null}
  </div>
)
const CeldaTema = ({ t, a }) => (
  <div className="celda">
    <div className="n2">{t}</div>
    {a ? <div className="n3">{a}</div> : null}
  </div>
)
const CeldaSello = ({ txt, fondo, tinta }) => (
  <div className="celda" style={{ background: fondo }}>
    <div className="n1" style={{ color: tinta }}>{txt}</div>
  </div>
)

/* ---------- la máquina ---------- */

const LAMPARAS = 13

const Maquina = forwardRef(function Maquina(
  { estado, resultado, girando, ocupado = false, trabado = false,
    onGirar, onAbortar, puedeAbortar, textoBoton = 'Girar' }, ref
) {
  const r1 = useRef(null), r2 = useRef(null), r3 = useRef(null)
  const cuerpo = useRef(null), palanca = useRef(null)
  const alTerminar = useRef(null)
  const limpiezas = useRef([])
  const [tiras, setTiras] = useState(() => construir(estado, resultado, false))

  const limpiar = () => { limpiezas.current.forEach((f) => f()); limpiezas.current = [] }
  useEffect(() => limpiar, [])

  useImperativeHandle(ref, () => ({
    girar(res, hecho) {
      alTerminar.current = hecho
      const nodo = palanca.current
      if (nodo) { nodo.classList.remove('tirada'); void nodo.offsetWidth; nodo.classList.add('tirada') }
      setTiras(construir(estado, res, true))
    },
    mostrar(res) { setTiras(construir(estado, res, false)) }
  }))

  useEffect(() => {
    limpiar()
    const nodos = [r1.current, r2.current, r3.current]
    const metas = [tiras.ip, tiras.it, tiras.is]

    // getBoundingClientRect da el alto fraccionario: offsetHeight redondea a
    // entero y ese error, multiplicado por las cien filas de la tira, corre
    // el rodillo casi media casilla contra la línea de pago.
    const altoCasilla = (nodo) => {
      const celda = nodo && nodo.querySelector('.celda')
      return celda ? celda.getBoundingClientRect().height : 0
    }

    const colocar = (nodo, idx, alto) => {
      const h = alto || altoCasilla(nodo)
      if (!h) return
      nodo.style.transform = `translateY(${-(idx - 1) * h}px)`
    }

    if (!tiras.animar) {
      nodos.forEach((n, k) => colocar(n, metas[k]))
      return
    }

    const aterrizaje = () => {
      const c = cuerpo.current
      if (c && !seco()) { c.classList.remove('sacude'); void c.offsetWidth; c.classList.add('sacude') }
      premio()
      if (alTerminar.current) { alTerminar.current(); alTerminar.current = null }
    }

    const correr = (nodo, idx, fin) => {
      const alto = altoCasilla(nodo)
      if (!alto) { fin && fin(); return }

      if (seco()) {
        // Con "reducir movimiento" activado el giro NO desaparece: es la
        // respuesta a lo que la persona acaba de hacer, no un adorno. Lo que
        // se saca son los tirones, la sacudida y el parpadeo. Queda un
        // deslizamiento corto y suave de seis casillas.
        const desde = Math.max(1, idx - 6)
        nodo.style.transition = 'none'
        nodo.style.transform = `translateY(${-(desde - 1) * alto}px)`
        void nodo.offsetWidth
        nodo.style.transition = 'transform .55s cubic-bezier(.2,.85,.25,1)'
        colocar(nodo, idx, alto)
        const suave = setTimeout(() => { nodo.style.transition = ''; clac(); fin && fin() }, 580)
        limpiezas.current.push(() => { clearTimeout(suave); nodo.style.transition = '' })
        return
      }

      // El camino normal escribe el transform a mano en cada tick, así que
      // no puede quedar una transition puesta por el camino de arriba.
      nodo.style.transition = ''
      const t0 = performance.now()
      let ultima = -1
      const reloj = setInterval(() => {
        const p = Math.min(1, (performance.now() - t0) / 1500)
        const suave = 1 - Math.pow(1 - p, 2.7)
        const fila = p >= 1 ? idx : Math.round(suave * idx)
        if (fila !== ultima) {
          nodo.style.transform = `translateY(${-(fila - 1) * alto}px)`
          ultima = fila
          clac()
        }
        if (p >= 1) {
          clearInterval(reloj)
          // se pasa un tercio de casilla y vuelve de un golpe
          nodo.style.transform = `translateY(${-(idx - 1 + 0.34) * alto}px)`
          const rebote = setTimeout(() => { colocar(nodo, idx, alto); clac(); fin && fin() }, 95)
          limpiezas.current.push(() => clearTimeout(rebote))
        }
      }, 55)
      limpiezas.current.push(() => clearInterval(reloj))
    }

    ;[0, 380, 760].forEach((espera, k) => {
      const t = setTimeout(() => correr(nodos[k], metas[k], k === 2 ? aterrizaje : null), espera)
      limpiezas.current.push(() => clearTimeout(t))
    })
  }, [tiras.token])

  const bolsa = estado.disponibles.length
  const faltan = new Set(
    estado.disponibles.map((a) => normalizar(a.persona))
      .filter((k) => !(estado.vecesCanto[k] > 0))
  ).size

  return (
    <div className="maquina">
      <div className="marquesina">
        <div className="lamparas" aria-hidden="true">
          {Array.from({ length: LAMPARAS }, (_, i) => (
            <span key={i} className={'bulbo' + (i === 4 ? ' quemada' : '')}
              style={{ '--del': (i * 0.11 % 1.4).toFixed(2) + 's', '--dur': (0.72 + (i % 5) * 0.18).toFixed(2) + 's' }} />
          ))}
        </div>
        <div className="placa">
          <span className="bl n">Karaoke</span>
          <span className="s">Modelo Braian · serie 26</span>
        </div>
        <div className="lamparas abajo" aria-hidden="true">
          {Array.from({ length: LAMPARAS }, (_, i) => (
            <span key={i} className={'bulbo' + (i === 9 ? ' quemada' : '')}
              style={{ '--del': (0.4 + i * 0.13 % 1.4).toFixed(2) + 's', '--dur': (0.8 + (i % 4) * 0.2).toFixed(2) + 's' }} />
          ))}
        </div>
      </div>

      <Foto archivo="foto-01.jpg" clase="marq" pista="marquesina" enfoque="50% 42%" />

      <div className="cuerpo" ref={cuerpo}>
        <div className="visor">
          <div className="rodillo"><div className="tira" ref={r1}>{tiras.p.map((c, i) => <CeldaPersona key={i} {...c} />)}</div></div>
          <div className="rodillo"><div className="tira" ref={r2}>{tiras.t.map((c, i) => <CeldaTema key={i} {...c} />)}</div></div>
          <div className="rodillo"><div className="tira" ref={r3}>{tiras.s.map((c, i) => <CeldaSello key={i} {...c} />)}</div></div>
          <div className="payline" aria-hidden="true" />
          <div className="vidrio" aria-hidden="true">
            <i style={{ left: '6%', top: '18%', width: '26%' }} />
            <i style={{ left: '52%', top: '64%', width: '34%' }} />
            <i style={{ left: '22%', top: '83%', width: '17%' }} />
          </div>
        </div>

        <div className="opciones">
          <FilaOp k="Sesión" v={estado.sesion ? estado.sesion.nombre : 'Sin abrir'} />
          <FilaOp k="Temas en la bolsa" v={bolsa} />
          <FilaOp k="Todavía no cantaron" v={faltan} />
        </div>

        <div className="botonera">
          <button className="boton" onClick={onGirar} disabled={girando || ocupado || trabado || !bolsa}>
            <span>{ocupado ? 'Abriendo' : girando ? 'Girando' : textoBoton}</span>
          </button>
          <button className="boton roja" onClick={onAbortar} disabled={!puedeAbortar || girando}>
            <span>Abortar</span>
          </button>
        </div>
      </div>

      <div className="bandeja">
        <div className="sombra" />
        {resultado ? (
          <div className="ticket" key={resultado.anotacionIds.join('-')}>
            <div className="l1">{resultado.personas.join(' + ')}</div>
            <div className="l2">
              {resultado.principal.tema}
              {resultado.principal.artista ? '  ·  ' + resultado.principal.artista : ''}
              {resultado.esDueto ? '  ·  DUETO' : ''}
            </div>
          </div>
        ) : (
          <div className="vacio">Bandeja vacía</div>
        )}
      </div>

      <button className="palanca" ref={palanca} onClick={onGirar}
        disabled={girando || ocupado || trabado || !bolsa} aria-label="Tirar la palanca">
        <span className="eje" /><span className="brazo" /><span className="bola" />
      </button>
    </div>
  )
})

function FilaOp({ k, v }) {
  return (
    <div className="fila-op">
      <div className="k">{k}</div>
      <div className="v">
        <span className="fl izq" /><b>{v}</b><span className="fl der" />
      </div>
    </div>
  )
}

export default Maquina
