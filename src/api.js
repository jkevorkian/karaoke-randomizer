import { ID_PLANILLA, URL_SCRIPT } from './config.js'
import { nuevoId } from './dominio.js'

/* ---------- JSONP: la única forma sin fricción de leer Google desde el navegador ---------- */

let contador = 0

function porScript(construirUrl, msTope = 15000) {
  return new Promise((resolver, rechazar) => {
    const nombre = '__tk' + Date.now().toString(36) + (contador++)
    const etiqueta = document.createElement('script')
    let terminado = false

    function limpiar() {
      terminado = true
      delete window[nombre]
      clearTimeout(reloj)
      if (etiqueta.parentNode) etiqueta.parentNode.removeChild(etiqueta)
    }
    const reloj = setTimeout(() => {
      if (!terminado) { limpiar(); rechazar(new Error('Google no contestó a tiempo.')) }
    }, msTope)

    window[nombre] = (datos) => { if (!terminado) { limpiar(); resolver(datos) } }
    etiqueta.onerror = () => { if (!terminado) { limpiar(); rechazar(new Error('No se pudo contactar a Google.')) } }
    etiqueta.src = construirUrl(nombre)
    document.head.appendChild(etiqueta)
  })
}

/* ---------- lectura: gviz, el endpoint público de la planilla ---------- */

// Si estas columnas no están, lo que sea que contestó gviz no es nuestra
// pestaña. Sin este chequeo, una pestaña inexistente o renombrada devuelve
// una tabla vacía con status ok y la app la muestra como "no se anotó nadie".
const REQUERIDAS = {
  anotaciones: ['id', 'ts', 'persona', 'tema'],
  eventos: ['id', 'ts', 'tipo']
}

function comoTexto(celda) {
  if (celda == null) return ''
  const v = celda.v
  if (v == null) return ''
  // gviz devuelve las fechas como el literal "Date(2026,8,4,21,30,0)"
  if (typeof v === 'string' && /^Date\(/.test(v)) {
    const n = v.slice(5, -1).split(',').map(Number)
    return new Date(n[0], n[1] || 0, n[2] || 1, n[3] || 0, n[4] || 0, n[5] || 0).toISOString()
  }
  // Un número grande no puede salir en notación exponencial: los ts en
  // milisegundos tienen 13 dígitos y toFixed(0) los escribe enteros.
  if (typeof v === 'number') return Number.isInteger(v) ? v.toFixed(0) : String(v)
  return String(v)
}

export async function leerHoja(nombre) {
  const respuesta = await porScript((cb) =>
    `https://docs.google.com/spreadsheets/d/${ID_PLANILLA}/gviz/tq` +
    `?tqx=out:json;responseHandler:${cb}` +
    `&sheet=${encodeURIComponent(nombre)}&headers=1`
  )

  if (!respuesta) throw new Error(`La planilla no contestó al pedir la pestaña "${nombre}".`)
  if (respuesta.status === 'error') {
    const d = (respuesta.errors && respuesta.errors[0]) || {}
    throw new Error(`Google rechazó la lectura de "${nombre}": ${d.detailed_message || d.message || 'error desconocido'}`)
  }

  const tabla = respuesta.table || {}
  const columnas = (tabla.cols || []).map((c, i) => (c.label || c.id || 'c' + i).trim())

  const faltan = (REQUERIDAS[nombre] || []).filter((c) => !columnas.includes(c))
  if (faltan.length) {
    throw new Error(
      `La pestaña "${nombre}" de la planilla no tiene las columnas ${faltan.join(', ')}. ` +
      'Ejecutá la función preparar en el Apps Script, y revisá que VITE_ID_PLANILLA apunte a la planilla correcta.'
    )
  }

  const filas = (tabla.rows || []).map((fila) => {
    const objeto = {}
    columnas.forEach((clave, i) => { objeto[clave] = comoTexto(fila.c && fila.c[i]) })
    return objeto
  })

  const buenas = filas.filter((f) => f.id)
  if (buenas.length !== filas.length) {
    console.warn(
      `[tragakaraoke] ${filas.length - buenas.length} fila(s) de "${nombre}" vinieron sin id y se ignoraron. ` +
      'Miralas a mano en la planilla.'
    )
  }
  return buenas
}

/* ---------- escritura: Apps Script ---------- */

// Un error que devolvió el backend a propósito (falta el nombre, falta el
// tema). No hay que reintentarlo por otro camino: la respuesta ya llegó.
class ErrorDeNegocio extends Error {}

async function llamarScript(cuerpo) {
  if (!URL_SCRIPT) throw new Error('Falta configurar VITE_URL_SCRIPT.')

  // La clave se genera UNA sola vez y se repite en el reintento. Si el POST
  // llegó a Google y lo que se perdió fue la respuesta, el backend reconoce
  // la clave y devuelve la fila que ya escribió en vez de escribir otra.
  const conClave = { ...cuerpo, clienteId: cuerpo.clienteId || nuevoId() }

  try {
    const corte = new AbortController()
    const reloj = setTimeout(() => corte.abort(), 20000)
    try {
      // text/plain evita el preflight de CORS, que Apps Script no contesta.
      const r = await fetch(URL_SCRIPT, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(conClave),
        signal: corte.signal,
        redirect: 'follow'
      })
      const datos = await r.json()
      if (datos && datos.ok === false) throw new ErrorDeNegocio(datos.error || 'La planilla rechazó el pedido.')
      return datos
    } finally {
      clearTimeout(reloj)
    }
  } catch (err) {
    if (err instanceof ErrorDeNegocio) throw err
    // Solo llegamos acá por un problema de transporte. Reintentamos por
    // GET+JSONP con la MISMA clave, así el backend no duplica.
    const datos = await porScript((cb) => {
      const p = new URLSearchParams()
      Object.entries(conClave).forEach(([k, v]) =>
        p.set(k, typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v)))
      p.set('callback', cb)
      return URL_SCRIPT + '?' + p.toString()
    })
    if (datos && datos.ok === false) throw new Error(datos.error || 'La planilla rechazó el pedido.')
    return datos
  }
}

export const prepararPlanilla = () => llamarScript({ accion: 'preparar' })

export const anotar = (a) => llamarScript({
  accion: 'anotar',
  persona: a.persona, tema: a.tema, artista: a.artista || '',
  youtubeId: a.youtubeId || '', youtubeTitulo: a.youtubeTitulo || '',
  duracion: a.duracion || '',
  // Cadena en los dos caminos: por GET todo llega como texto y "0" es
  // truthy, así que mandar el número 0 marcaba a todos como "canta solo".
  cantaSolo: a.cantaSolo ? '1' : ''
})

export const registrarEvento = (tipo, sesionId, datos, clienteId) =>
  llamarScript({ accion: 'evento', tipo, sesionId: sesionId || '', datos: datos || {}, clienteId })

export async function buscarVideos(consulta) {
  if (!URL_SCRIPT) return { ok: false, error: 'Sin backend configurado.', videos: [] }
  const datos = await porScript((cb) =>
    `${URL_SCRIPT}?accion=buscar&q=${encodeURIComponent(consulta)}&callback=${cb}`, 12000)
  return datos && datos.videos ? datos : { ok: false, error: (datos && datos.error) || 'Sin resultados.', videos: [] }
}
