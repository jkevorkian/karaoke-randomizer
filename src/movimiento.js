/**
 * Cuánto se mueve la máquina.
 *
 * Por defecto: COMPLETAS, decisión del dueño del proyecto. Lo habitual sería
 * seguir la preferencia del sistema, pero Windows enciende "reducir
 * movimiento" solo con apagar los efectos de animación en Accesibilidad, y
 * mucha gente lo tiene así sin saberlo: una tragamonedas que no se mueve no
 * es la app que se quiso hacer.
 *
 * La contra: quien tenga esa preferencia puesta por una necesidad real va a
 * ver igual las lámparas parpadeando. Para eso está la opción "Como el
 * sistema" en el Panel, que vuelve al comportamiento respetuoso.
 *
 * La elección queda guardada en este navegador.
 */

const CLAVE = 'karaoke.movimiento'

export function pideElSistema() {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches }
  catch (e) { return false }
}

/** 'completo' | 'reducido' | 'sistema'. Sin nada guardado: 'completo'. */
export function elegido() {
  try {
    const v = localStorage.getItem(CLAVE)
    if (v === 'reducido' || v === 'sistema') return v
  } catch (e) { /* navegador en modo privado */ }
  return 'completo'
}

/** Lo que efectivamente se aplica: 'completo' o 'reducido'. */
export function resuelto() {
  const v = elegido()
  if (v === 'sistema') return pideElSistema() ? 'reducido' : 'completo'
  return v
}

/** Estampa la decisión en <html> para que la use el CSS. */
export function aplicar() {
  const v = resuelto()
  document.documentElement.dataset.movimiento = v
  return v
}

export function guardar(v) {
  try {
    // 'completo' es el valor por defecto: no hace falta guardarlo.
    if (v === 'completo') localStorage.removeItem(CLAVE)
    else localStorage.setItem(CLAVE, v)
  } catch (e) { /* sin lugar */ }
  return aplicar()
}

export const reducido = () => document.documentElement.dataset.movimiento === 'reducido'
