/**
 * Todo el estado de la fiesta sale de reducir dos logs de solo-append.
 * Nada se borra nunca: una anotación se da de baja con un evento, una
 * actuación se aborta con otro evento, y acá se calcula cómo quedó la cosa.
 */

export function normalizar(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

const bool = (v) => /^(s|si|sí|1|true|x)$/i.test(String(v || '').trim())

export function construirEstado(filasAnotaciones, filasEventos) {
  const anotaciones = filasAnotaciones.map((f) => ({
    id: String(f.id),
    ts: Number(f.ts) || 0,
    persona: String(f.persona || '').trim(),
    tema: String(f.tema || '').trim(),
    artista: String(f.artista || '').trim(),
    youtubeId: String(f.youtube_id || '').trim(),
    youtubeTitulo: String(f.youtube_titulo || '').trim(),
    duracion: String(f.duracion || '').trim(),
    cantaSolo: bool(f.canta_solo)
  })).sort((a, b) => a.ts - b.ts)

  const eventos = filasEventos.map((f) => {
    let datos = {}
    try { datos = JSON.parse(f.datos || '{}') } catch (e) { datos = {} }
    return {
      id: String(f.id), ts: Number(f.ts) || 0,
      tipo: String(f.tipo || ''), sesionId: String(f.sesion_id || ''), datos
    }
  }).sort((a, b) => a.ts - b.ts)

  const bajas = new Set()
  const actuaciones = new Map()
  const sesiones = []

  for (const e of eventos) {
    const d = e.datos
    switch (e.tipo) {
      case 'anotacion_baja':
        if (d.anotacionId) bajas.add(String(d.anotacionId))
        break
      case 'sesion_abierta':
        sesiones.push({ id: e.id, nombre: d.nombre || 'Sesión', abiertaEn: e.ts, cerradaEn: null })
        break
      case 'sesion_cerrada': {
        const s = sesiones.find((x) => x.id === e.sesionId) || sesiones[sesiones.length - 1]
        if (s && !s.cerradaEn) s.cerradaEn = e.ts
        break
      }
      case 'actuacion_iniciada':
        if (d.actuacionId) actuaciones.set(String(d.actuacionId), {
          id: String(d.actuacionId),
          sesionId: e.sesionId,
          ts: e.ts,
          anotacionIds: (d.anotacionIds || []).map(String),
          personas: d.personas || [],
          tema: d.tema || '',
          artista: d.artista || '',
          youtubeId: d.youtubeId || '',
          duracion: d.duracion || '',
          estado: 'en_curso',
          tributos: 0
        })
        break
      case 'actuacion_terminada': {
        const a = actuaciones.get(String(d.actuacionId))
        if (a && a.estado === 'en_curso') a.estado = 'terminada'
        break
      }
      case 'actuacion_abortada': {
        // Misma guarda que en 'terminada': una actuación ya cerrada no se
        // reabre. Sin esto, un "Abortar" tardío desde otro teléfono le
        // borraba los tributos a una actuación que ya se había terminado.
        const a = actuaciones.get(String(d.actuacionId))
        if (a && a.estado === 'en_curso') a.estado = 'abortada'
        break
      }
      case 'tributos': {
        const a = actuaciones.get(String(d.actuacionId))
        if (a) a.tributos = Math.max(0, Number(d.cantidad) || 0)
        break
      }
    }
  }

  const todasLasActuaciones = [...actuaciones.values()].sort((a, b) => a.ts - b.ts)
  const sesion = sesiones.length ? sesiones[sesiones.length - 1] : null
  const sesionAbierta = sesion && !sesion.cerradaEn ? sesion : null
  const idSesion = sesionAbierta ? sesionAbierta.id : ''

  const deLaSesion = todasLasActuaciones.filter((a) => a.sesionId === idSesion)
  const cuentan = deLaSesion.filter((a) => a.estado !== 'abortada')

  const consumidas = new Set()
  cuentan.forEach((a) => a.anotacionIds.forEach((id) => consumidas.add(id)))

  // La última en curso, y buscada entre TODAS las actuaciones, no solo las
  // de la vuelta abierta. Lo primero hace que el reproductor muestre la que
  // se acaba de lanzar; lo segundo evita que abrir o cerrar una vuelta con
  // alguien cantando deje esa actuación colgada para siempre, sin forma de
  // terminarla ni de cargarle tributos.
  const enCurso = [...todasLasActuaciones].reverse().find((a) => a.estado === 'en_curso') || null
  const disponibles = anotaciones.filter((a) => !bajas.has(a.id) && !consumidas.has(a.id))

  // Reparto parejo: cuántas veces cantó cada persona en ESTA sesión.
  const vecesCanto = {}
  cuentan.forEach((a) => a.personas.forEach((p) => {
    const k = normalizar(p)
    vecesCanto[k] = (vecesCanto[k] || 0) + 1
  }))

  // Ranking: tributos acumulados de todas las sesiones.
  const tabla = new Map()
  todasLasActuaciones.filter((a) => a.estado === 'terminada').forEach((a) => {
    a.personas.forEach((p) => {
      const k = normalizar(p)
      const fila = tabla.get(k) || { persona: p, temas: 0, tributos: 0 }
      fila.temas += 1
      fila.tributos += a.tributos
      tabla.set(k, fila)
    })
  })
  const ranking = [...tabla.values()].sort((a, b) => b.tributos - a.tributos || b.temas - a.temas)

  const personas = [...new Set(anotaciones.filter((a) => !bajas.has(a.id)).map((a) => a.persona))]

  return {
    anotaciones, eventos, bajas,
    sesion: sesionAbierta, sesiones,
    actuaciones: todasLasActuaciones, actuacionesSesion: deLaSesion,
    enCurso, disponibles, consumidas, vecesCanto, ranking, personas
  }
}

/* ---------- el sorteo ---------- */

const alAzar = (lista) => lista[Math.floor(Math.random() * lista.length)]

export function sortear(estado) {
  const bolsa = estado.disponibles
  if (!bolsa.length) return null

  const porPersona = new Map()
  bolsa.forEach((a) => {
    const k = normalizar(a.persona)
    if (!porPersona.has(k)) porPersona.set(k, [])
    porPersona.get(k).push(a)
  })

  // Nadie canta dos veces mientras quede alguien esperando.
  const claves = [...porPersona.keys()]
  const minimo = Math.min(...claves.map((k) => estado.vecesCanto[k] || 0))
  const candidatas = claves.filter((k) => (estado.vecesCanto[k] || 0) === minimo)
  const clave = alAzar(candidatas)

  const misTemas = porPersona.get(clave)
  const principal = alAzar(misTemas)

  // Dueto: mismo tema, nadie marcó "canto solo".
  let acompanan = []
  if (!principal.cantaSolo) {
    const tema = normalizar(principal.tema)
    const vistas = new Set([clave])
    acompanan = bolsa.filter((o) => {
      if (o.id === principal.id || o.cantaSolo) return false
      if (normalizar(o.tema) !== tema) return false
      const k = normalizar(o.persona)
      if (vistas.has(k)) return false
      vistas.add(k)
      return true
    })
  }

  return {
    principal,
    acompanan,
    personas: [principal.persona, ...acompanan.map((a) => a.persona)],
    anotacionIds: [principal.id, ...acompanan.map((a) => a.id)],
    esDueto: acompanan.length > 0,
    // La ruleta de temas solo tiene sentido si a esa persona le quedan varios.
    temasDeLaPersona: misTemas
  }
}

export function nuevoId() {
  return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4)
}
