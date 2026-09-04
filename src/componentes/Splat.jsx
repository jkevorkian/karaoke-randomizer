import { useEffect, useRef } from 'react'

/** Azar con semilla: el manchón tiene que ser el mismo en cada recarga. */
function conSemilla(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0
    let t = Math.imul(a ^ a >>> 15, 1 | a)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

function manchon(ctx, cx, cy, R, color, semilla) {
  const r = conSemilla(semilla)
  ctx.fillStyle = color

  for (let i = 0; i < 48; i++) {
    const a = r() * 6.283, d = Math.pow(r(), .6) * R * .72
    const rx = R * (.19 + r() * .34), ry = rx * (.5 + r() * .6)
    ctx.beginPath()
    ctx.ellipse(cx + Math.cos(a) * d, cy + Math.sin(a) * d * .72, rx, ry, r() * 3.14, 0, 6.283)
    ctx.fill()
  }
  for (let i = 0; i < 18; i++) {
    const a = r() * 6.283, largo = R * (.72 + r() * 1.05), r0 = R * (.13 + r() * .13)
    for (let s = 0; s < 16; s++) {
      const t = s / 15, rr = r0 * (1 - t * .94)
      if (rr < .7) break
      ctx.beginPath()
      ctx.arc(cx + Math.cos(a) * largo * t + (r() - .5) * R * .09,
              cy + Math.sin(a) * largo * t * .78 + (r() - .5) * R * .07, rr, 0, 6.283)
      ctx.fill()
    }
  }
  for (let i = 0; i < 46; i++) {
    const a = r() * 6.283, d = R * (.86 + r() * .92), rr = R * (.005 + Math.pow(r(), 2.4) * .05)
    ctx.beginPath()
    ctx.ellipse(cx + Math.cos(a) * d, cy + Math.sin(a) * d * .8, rr * (1 + r()), rr, r() * 3.14, 0, 6.283)
    ctx.fill()
  }
  for (let i = 0; i < 8; i++) {
    const x = cx + (r() - .5) * R * 1.15, y = cy + R * (.42 + r() * .3)
    const w = R * (.010 + r() * .028), h = R * (.12 + r() * .55)
    ctx.fillRect(x - w / 2, y, w, h)
    ctx.beginPath(); ctx.arc(x, y + h, w * .95, 0, 6.283); ctx.fill()
  }
}

export default function Splat({ semilla = 1312, tenue = false }) {
  const lienzo = useRef(null)

  useEffect(() => {
    const nodo = lienzo.current
    if (!nodo) return
    const padre = nodo.parentElement

    function pintar() {
      const caja = padre.getBoundingClientRect()
      const W = caja.width, H = caja.height
      if (!W || !H) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      nodo.width = W * dpr; nodo.height = H * dpr
      const ctx = nodo.getContext('2d')
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)
      const U = Math.min(W, H)
      manchon(ctx, W * .58, H * .40, U * .27, '#B0201A', semilla + 77)
      manchon(ctx, W * .33, H * .47, U * .30, '#0B0A09', semilla)
      manchon(ctx, W * .61, H * .49, U * .18, '#0B0A09', semilla + 909)
      manchon(ctx, W * .84, H * .74, U * .065, '#B0201A', semilla + 404)
    }

    pintar()
    const observador = new ResizeObserver(pintar)
    observador.observe(padre)
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(pintar)
    return () => observador.disconnect()
  }, [semilla])

  return <canvas ref={lienzo} aria-hidden="true" style={{ opacity: tenue ? 0.18 : 1 }} />
}
