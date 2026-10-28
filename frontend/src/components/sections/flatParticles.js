// A small engine for flat (2D) particle pictures on a canvas, in the look of the home page's clouds: round dots, two colours.
// A picture is a list of particles plus the polylines some of them travel along.
//   - mode 0 "stream": the particle leaves the start of its trace and flies along it to its place `s` (a distance along the
//     trace), so the line grows outwards from where it starts;
//   - mode 1 "gather": the particle flies in from a scattered position to its place.
// Once assembled, the particles twinkle very slightly; `drawExtras` draws anything else (moving highlights, labels, glows).
// With reduced motion the picture is drawn once, finished. The loop only runs while the canvas is on screen, full rate during
// the intro and 30 fps afterwards.

export const DENSE = 1.5 // spacing of the lookup points a stream particle slides along

const SVG_NS = 'http://www.w3.org/2000/svg'

/** Points along an SVG path every DENSE units (a flat [x, y, x, y, ...] array), plus its length and point count. */
export function densePath(d) {
  const svg = document.createElementNS(SVG_NS, 'svg')
  const path = document.createElementNS(SVG_NS, 'path')
  path.setAttribute('d', d)
  svg.appendChild(path)
  svg.style.cssText = 'position:absolute;width:0;height:0;visibility:hidden'
  document.body.appendChild(svg)
  const length = path.getTotalLength()
  const n = Math.max(1, Math.ceil(length / DENSE))
  const pts = new Float32Array((n + 1) * 2)
  for (let i = 0; i <= n; i++) {
    const p = path.getPointAtLength(Math.min(length, i * DENSE))
    pts[2 * i] = p.x
    pts[2 * i + 1] = p.y
  }
  svg.remove()
  return { length, n, pts }
}

/** Points along a path every `step` units, as [[x, y], ...]. */
export function pathPoints(d, step) {
  const { length, n, pts } = densePath(d)
  const out = []
  for (let s = 0; s <= length; s += step) {
    const k = Math.min(n, Math.round(s / DENSE))
    out.push([pts[2 * k], pts[2 * k + 1]])
  }
  return out
}

/** A small seeded random, so a picture is the same on every load. */
export function rng(seed) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const linePts = (x1, y1, x2, y2, step) => {
  const n = Math.max(1, Math.round(Math.hypot(x2 - x1, y2 - y1) / step))
  return Array.from({ length: n + 1 }, (_, i) => [x1 + ((x2 - x1) * i) / n, y1 + ((y2 - y1) * i) / n])
}
export const rectPts = (x, y, w, h, step) => {
  const pts = []
  for (const [a, b, c, d] of [[x, y, x + w, y], [x + w, y, x + w, y + h], [x + w, y + h, x, y + h], [x, y + h, x, y]]) {
    pts.push(...linePts(a, b, c, d, step).slice(0, -1))
  }
  return pts
}
export const circlePts = (cx, cy, r, step) => {
  const n = Math.max(5, Math.round((2 * Math.PI * r) / step))
  return Array.from({ length: n }, (_, i) => [cx + r * Math.cos((2 * Math.PI * i) / n), cy + r * Math.sin((2 * Math.PI * i) / n)])
}

/** Is the point inside the polygon (a densePath result)? */
export function insidePoly(poly, x, y) {
  let inside = false
  const { pts, n } = poly
  for (let i = 0, j = n; i <= n; j = i++) {
    const xi = pts[2 * i]
    const yi = pts[2 * i + 1]
    const xj = pts[2 * j]
    const yj = pts[2 * j + 1]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

function dotSprite(color) {
  const c = document.createElement('canvas')
  c.width = c.height = 32
  const x = c.getContext('2d')
  x.fillStyle = color
  x.beginPath()
  x.arc(16, 16, 14.5, 0, Math.PI * 2)
  x.fill()
  return c
}
function glowSprite(color) {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const x = c.getContext('2d')
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, color + 'aa')
  g.addColorStop(1, color + '00')
  x.fillStyle = g
  x.fillRect(0, 0, 64, 64)
  return c
}

// Motions: a particle may name one (`mi`, an index into the `motions` option). A motion is a function of the time that returns
// [a, b, c, d, e, f, alpha] - an SVG-style affine matrix (x' = a x + c y + e, y' = b x + d y + f) applied to the particle's
// settled position, and a factor for its alpha - so a whole object (a gear, an arm segment, a floating cloud, a crate on a belt)
// moves as one by sharing a motion; the particles' own twinkle and `bob` carry on. Before an object's motion starts the function
// should return IDENTITY, which is also what reduced motion gets.
export const IDENTITY = [1, 0, 0, 1, 0, 0, 1]
export const translate = (dx, dy) => [1, 0, 0, 1, dx, dy, 1]
/** Turning by `ang` radians (positive: clockwise on screen) about (cx, cy). */
export function rotateAbout(cx, cy, ang) {
  const c = Math.cos(ang)
  const s = Math.sin(ang)
  return [c, s, -s, c, cx - c * cx + s * cy, cy - s * cx - c * cy, 1]
}
/** The motion that does `b` first and then `a`. */
export const compose = (a, b) => [
  a[0] * b[0] + a[2] * b[1],
  a[1] * b[0] + a[3] * b[1],
  a[0] * b[2] + a[2] * b[3],
  a[1] * b[2] + a[3] * b[3],
  a[0] * b[4] + a[2] * b[5] + a[4],
  a[1] * b[4] + a[3] * b[5] + a[5],
  a[6] * b[6],
]

export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
const easeOut = (u) => 1 - (1 - u) ** 3

/**
 * Starts a picture on a canvas; returns the function that stops it.
 *   particles: [{ mode, trace?, s?, rx, ry, c (0 | 1: which colour), r, a, T (start s), D (duration s), ph, ox?, oy?, bob?, wave? }]
 *              `bob`: a gentle up-and-down float (units) that starts at `bobT` seconds, with phase `bobPh` - give every particle of
 *              one object the same `bobT` / `bobPh` and it floats as a whole; `steady`: no twinkle; `wave`: a ripple that runs
 *              through the particle's alpha; `mi`: the index of its motion (see above).
 *   motions:   [(t) => [a, b, c, d, e, f, alpha]] (optional)
 *   traces:    the densePath results the stream particles slide along
 *   colors:    [first colour, second colour]
 *   layout:    (width, height) => { sc, tx, ty } - how the picture's own units map onto the canvas (css px)
 *   drawExtras:(ctx, t, api) => void, called every frame after the particles; api = { sprite, dots, glow, pointOn, reduceMotion }
 */
export function startFlatParticles(canvas, { particles, traces, colors, glowColor, layout, drawExtras, motions, introSeconds = 6 }) {
  const ctx = canvas.getContext('2d')
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const dots = colors.map(dotSprite)
  const glow = glowSprite(glowColor ?? colors[1])

  let view = { sc: 1, tx: 0, ty: 0, dpr: 1 }
  const resize = () => {
    const r = canvas.getBoundingClientRect()
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = Math.max(1, Math.round(r.width * dpr))
    canvas.height = Math.max(1, Math.round(r.height * dpr))
    view = { ...layout(r.width, r.height), dpr }
  }

  const sprite = (img, x, y, r, a) => {
    ctx.globalAlpha = a
    ctx.drawImage(img, x - r, y - r, 2 * r, 2 * r)
  }
  const pointOn = (tr, s) => {
    const k = Math.max(0, Math.min(tr.n, Math.round(s / DENSE)))
    return [tr.pts[2 * k], tr.pts[2 * k + 1]]
  }
  const api = { sprite, dots, glow, pointOn, reduceMotion }

  const draw = (t) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const { sc, tx, ty, dpr } = view
    ctx.setTransform(dpr * sc, 0, 0, dpr * sc, dpr * tx, dpr * ty)

    const mats = motions && !reduceMotion ? motions.map((m) => m(t)) : null
    for (const p of particles) {
      const u = clamp01((t - p.T) / p.D)
      if (u <= 0) continue
      const e = easeOut(u)
      let x
      let y
      if (p.mode === 0) {
        ;[x, y] = pointOn(traces[p.trace], p.s * e)
      } else {
        x = p.rx + p.ox * (1 - e)
        y = p.ry + p.oy * (1 - e)
      }
      if (p.bob && !reduceMotion && t > p.bobT) y += Math.sin((t - p.bobT) * 1.3 + p.bobPh) * p.bob * clamp01((t - p.bobT) / 1.2)
      let alphaMul = 1
      if (mats && p.mi !== undefined) {
        const m = mats[p.mi]
        const mx = m[0] * x + m[2] * y + m[4]
        y = m[1] * x + m[3] * y + m[5]
        x = mx
        alphaMul = m[6]
      }
      let twinkle = u >= 1 && !reduceMotion && !p.steady ? 0.86 + 0.14 * Math.sin(t * 1.3 + p.ph) : 1
      if (p.wave !== undefined && !reduceMotion) twinkle *= 0.5 + 0.5 * Math.max(0, Math.sin(t * 2.2 - p.wave * 0.9))
      sprite(dots[p.c], x, y, p.r * (0.5 + 0.5 * clamp01(u * 4)), p.a * clamp01(u * 4) * twinkle * alphaMul)
    }
    drawExtras?.(ctx, t, api)
    ctx.globalAlpha = 1
  }

  resize()
  let raf = 0
  let visible = true
  let t0 = null
  let last = 0
  const frame = (now) => {
    t0 ??= now
    const t = (now - t0) / 1000
    if (t < introSeconds || now - last >= 32) {
      draw(t)
      last = now
    }
    raf = visible ? requestAnimationFrame(frame) : 0
  }
  if (reduceMotion) draw(60)
  else raf = requestAnimationFrame(frame)

  const ro = new ResizeObserver(() => {
    resize()
    if (reduceMotion) draw(60)
  })
  ro.observe(canvas)
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting
    if (visible && !raf && !reduceMotion) raf = requestAnimationFrame(frame)
  })
  io.observe(canvas)

  return () => {
    cancelAnimationFrame(raf)
    ro.disconnect()
    io.disconnect()
  }
}
