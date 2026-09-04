// Ruido de máquina: clic seco de rodillo y golpe de palanca.
// El navegador no deja sonar nada hasta que el usuario toca algo,
// así que el contexto se crea recién en el primer clic.

let ctx = null

export function despertar() {
  if (ctx) return
  const AC = window.AudioContext || window.webkitAudioContext
  if (AC) ctx = new AC()
}

function pulso({ frecuencia, tipo = 'square', volumen = 0.045, largo = 0.04 }) {
  if (!ctx || ctx.state === 'suspended') return
  const osc = ctx.createOscillator()
  const gan = ctx.createGain()
  osc.type = tipo
  osc.frequency.value = frecuencia
  gan.gain.setValueAtTime(volumen, ctx.currentTime)
  gan.gain.exponentialRampToValueAtTime(0.0004, ctx.currentTime + largo)
  osc.connect(gan); gan.connect(ctx.destination)
  osc.start(); osc.stop(ctx.currentTime + largo + 0.01)
}

export const clac = () => pulso({ frecuencia: 1250 + Math.random() * 620 })
export const golpe = () => pulso({ frecuencia: 150, tipo: 'sawtooth', volumen: 0.09, largo: 0.14 })
export const premio = () => {
  [0, 90, 180, 300].forEach((ms, i) =>
    setTimeout(() => pulso({ frecuencia: 620 + i * 190, volumen: 0.06, largo: 0.1 }), ms))
}
