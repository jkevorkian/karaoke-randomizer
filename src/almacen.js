/**
 * Una sola puerta para leer y escribir. Con Apps Script configurado habla
 * con la planilla; sin configurar guarda en el navegador, así la app se
 * puede probar y mostrar antes de conectar nada.
 */
import { HAY_BACKEND } from './config.js'
import * as api from './api.js'
import { nuevoId } from './dominio.js'

const CLAVE = 'tragakaraoke.demo.v2'

const SEMILLA = [
  ['Braian', 'Mi enfermedad', 'Andrés Calamaro', 'kFVEEP2Zpqk', '4:41', 'NO'],
  ['Braian', 'Persiana americana', 'Soda Stereo', 'Q9F0Y1Vh0Hg', '5:12', 'NO'],
  ['Braian', 'Rezo por vos', 'Charly García', 'hJ8pQoJ8pQo', '4:28', 'NO'],
  ['Sofi', 'Bohemian Rhapsody', 'Queen', 'tgbNymZ7vqY', '5:59', 'NO'],
  ['Nacho', 'Bohemian Rhapsody', 'Queen', 'tgbNymZ7vqY', '5:59', 'NO'],
  ['Meli', 'De música ligera', 'Soda Stereo', 'Bs4v-oQZ0kA', '3:32', 'SI'],
  ['Tincho', 'De música ligera', 'Soda Stereo', 'Bs4v-oQZ0kA', '3:32', 'NO'],
  ['Lucho', 'Loco (tu forma de ser)', 'Bersuit Vergarabat', 'yCB8tqAmZ9k', '4:03', 'NO'],
  ['Vicky', 'Total Eclipse of the Heart', 'Bonnie Tyler', 'lcOxhH8N3Bo', '7:00', 'NO'],
  ['Fran', 'Wonderwall', 'Oasis', 'bx1Bh8ZvH84', '4:19', 'NO'],
  ['Juli', 'Flaca', 'Andrés Calamaro', 'ELDMKRUAUnA', '3:47', 'NO'],
  ['Dai', 'Fuiste', 'Gilda', 'yv0FNjXaJKA', '4:05', 'NO']
]

function semilla() {
  const base = Date.now() - SEMILLA.length * 60000
  return {
    anotaciones: SEMILLA.map((f, i) => ({
      id: 'demo' + i, ts: base + i * 60000, fecha: '',
      persona: f[0], tema: f[1], artista: f[2],
      youtube_id: f[3], youtube_titulo: f[1] + ' — karaoke', duracion: f[4], canta_solo: f[5]
    })),
    eventos: []
  }
}

function leerDemo() {
  try {
    const crudo = localStorage.getItem(CLAVE)
    if (crudo) return JSON.parse(crudo)
  } catch (e) { /* navegador en modo privado */ }
  const inicial = semilla()
  guardarDemo(inicial)
  return inicial
}

function guardarDemo(datos) {
  try { localStorage.setItem(CLAVE, JSON.stringify(datos)) } catch (e) { /* sin lugar */ }
}

/* ---------- api pública ---------- */

export async function leerTodo() {
  if (!HAY_BACKEND) return leerDemo()
  const [anotaciones, eventos] = await Promise.all([
    api.leerHoja('anotaciones'),
    api.leerHoja('eventos')
  ])
  return { anotaciones, eventos }
}

export async function anotar(datos) {
  if (!HAY_BACKEND) {
    const d = leerDemo()
    d.anotaciones.push({
      id: nuevoId(), ts: Date.now(), fecha: '',
      persona: datos.persona, tema: datos.tema, artista: datos.artista || '',
      youtube_id: datos.youtubeId || '', youtube_titulo: datos.youtubeTitulo || '',
      duracion: datos.duracion || '', canta_solo: datos.cantaSolo ? 'SI' : 'NO'
    })
    guardarDemo(d)
    return { ok: true }
  }
  return api.anotar(datos)
}

export async function registrarEvento(tipo, sesionId, datos, clienteId) {
  if (!HAY_BACKEND) {
    const d = leerDemo()
    d.eventos.push({
      id: nuevoId(), ts: Date.now(), fecha: '',
      tipo, sesion_id: sesionId || '', datos: JSON.stringify(datos || {})
    })
    guardarDemo(d)
    return { ok: true }
  }
  return api.registrarEvento(tipo, sesionId, datos, clienteId)
}

export async function buscarVideos(consulta) {
  if (!HAY_BACKEND) {
    return {
      ok: false,
      demo: true,
      error: 'La búsqueda de YouTube necesita el Apps Script conectado. Mientras tanto, pegá el link del video.',
      videos: []
    }
  }
  return api.buscarVideos(consulta)
}

export function reiniciarDemo() {
  try { localStorage.removeItem(CLAVE) } catch (e) { /* nada */ }
}

export { HAY_BACKEND }
