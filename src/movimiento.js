/**
 * Cuánto se mueve la máquina.
 *
 * Por defecto sigue la preferencia del sistema, que es lo correcto. El
 * problema es que Windows enciende "reducir movimiento" solo con apagar los
 * efectos de animación en Accesibilidad, y mucha gente lo tiene así sin
 * saberlo: la máquina quedaba completamente quieta, sin lámparas, sin
 * sacudida y sin ticket cayendo.
 *
 * Por eso se puede forzar desde el Panel, y la elección queda guardada en
 * este navegador.
 */

const CLAVE = 'karaoke.movimiento'

export function pideElSistema() {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches }
  catch (e) { return false }
}

export function elegido() {
  try {
    const v = localStorage.getItem(CLAVE)
    if (v === 'completo' || v === 'reducido') return v
  } catch (e) { /* navegador en modo privado */ }
  return 'auto'
}

/** Lo que efectivamente se aplica: 'completo' o 'reducido'. */
export function resuelto() {
  const v = elegido()
  if (v !== 'auto') return v
  return pideElSistema() ? 'reducido' : 'completo'
}

/** Estampa la decisión en <html> para que la use el CSS. */
export function aplicar() {
  const v = resuelto()
  document.documentElement.dataset.movimiento = v
  return v
}

export function guardar(v) {
  try {
    if (v === 'auto') localStorage.removeItem(CLAVE)
    else localStorage.setItem(CLAVE, v)
  } catch (e) { /* sin lugar */ }
  return aplicar()
}

export const reducido = () => document.documentElement.dataset.movimiento === 'reducido'
