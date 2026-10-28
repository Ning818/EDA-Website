import { useEffect, useRef } from 'react'
import { clamp01, startFlatParticles } from './flatParticles'

// The Teaching page header's picture: a learning curve of flat particles. An S-shaped curve of teal dots climbs the band on a
// diagonal - flat and low along the bottom under the text, steep through the free space on the right, levelling off near the top
// right corner - with a cloud of data points scattered about it (the noise of real learning), five amber milestones standing on
// it (each with a dotted line down to the axis along the bottom and a ring that spreads and fades). The curve grows from left to
// right: the head runs along it and everything it passes appears. Afterwards the data points drift a little, a bright pulse runs
// up the curve from time to time and the milestones' rings keep spreading. With reduced motion it is the finished picture.
// Where the Research / Projects pages put a picture in one corner and the Collaborations page a globe off the right edge, this one
// runs diagonally through the whole band. It is drawn entirely in drawExtras, in css pixels, so it follows the band's size.

const TEAL = '#3fb0b8' // the VLSI-CAD teal, the site's accent
const AMBER = '#e0a94a'
// on a light ground the dots are a little deeper so they hold up against it
const TEAL_LIGHT = '#2b9fb3'
const AMBER_LIGHT = '#dc9a2e'
const SPACING = 6.5 // between the particles of the curve, px
const UEND = 0.93 // the curve ends at this fraction of the band's width
const K = 10 // steepness of the S
const MID = 0.68 // where the S is steepest, as a fraction of the width: clear of the text column on the left
const MILESTONES = [0.16, 0.36, 0.55, 0.73, 0.87] // where the amber milestones stand, as a fraction of the width

const logistic = (u) => 1 / (1 + Math.exp(-K * (u - MID)))
const L0 = logistic(0)
const L1 = logistic(UEND)
/** The curve's height, 0 at the left end and 1 at the end of the curve. */
const rise = (u) => (logistic(u) - L0) / (L1 - L0)

const rand = (i, n) => {
  const s = Math.sin(i * 127.1 + n * 311.7) * 43758.5453
  return s - Math.floor(s)
}
const smooth = (x) => x * x * (3 - 2 * x)

export default function CurveParticles({ light = false }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    // the scattered data points: (u, offset in units of the spread, size, phase), fixed
    const data = Array.from({ length: 800 }, (_, i) => ({
      u: rand(i, 1) * UEND,
      off: (rand(i, 2) + rand(i, 3) + rand(i, 4) - 1.5) * 1.5, // roughly normal, about -1.5 .. 1.5
      r: 1.4 + rand(i, 5) * 0.9,
      a: (light ? 0.38 : 0.3) + rand(i, 6) * 0.4,
      ph: rand(i, 7) * 6.28,
    }))
    let cache = { key: '', curve: [] }

    return startFlatParticles(canvasRef.current, {
      particles: [],
      traces: [],
      colors: light ? [TEAL_LIGHT, AMBER_LIGHT] : [TEAL, AMBER],
      glowColor: light ? AMBER_LIGHT : AMBER,
      introSeconds: 6,
      layout: () => ({ sc: 1, tx: 0, ty: 0 }),
      drawExtras: (ctx, now, { sprite, dots, glow, reduceMotion }) => {
        const t = reduceMotion ? 60 : now
        const w = ctx.canvas.clientWidth
        const h = ctx.canvas.clientHeight
        const yb = h - 34 // the axis along the bottom
        const yt = Math.max(64, h * 0.16) // the height the curve levels off at
        const X = (u) => u * w
        const Y = (u) => yb - (yb - yt) * rise(u)

        // the curve's dots, evenly spaced along its length (recomputed when the band changes size)
        const key = `${w}x${h}`
        if (cache.key !== key) {
          const curve = []
          let acc = SPACING
          let px = X(0)
          let py = Y(0)
          for (let u = 0; u <= UEND; u += 0.0007) {
            const x = X(u)
            const y = Y(u)
            acc += Math.hypot(x - px, y - py)
            px = x
            py = y
            if (acc >= SPACING) {
              curve.push(u)
              acc = 0
            }
          }
          curve.push(UEND)
          cache = { key, curve }
        }

        // the head that grows the curve from left to right
        const grown = reduceMotion ? 1 : smooth(clamp01((t - 0.35) / 3.4))
        const headU = grown * UEND
        const appear = (u) => clamp01((headU - u) / 0.05)
        const settled = clamp01((t - 3.8) / 1.2) // the pulses start once the curve is grown

        // the axis: a faint dotted line along the bottom
        const axisA = (light ? 0.22 : 0.14) * clamp01(t / 1.2)
        for (let x = 0; x < w; x += 12) sprite(dots[0], x, yb + 8, 1.2, axisA)

        // the data points: a cloud about the curve, a spread that narrows as the curve levels off
        for (const d of data) {
          const ap = appear(d.u)
          if (ap <= 0) continue
          const spread = 34 - 18 * d.u
          const drift = reduceMotion ? 0 : 1
          const x = X(d.u) + drift * 1.4 * Math.sin(t * 0.6 + d.ph) + (rand(d.ph * 100, 14) - 0.5) * 10
          const y = Y(d.u) - d.off * spread + drift * 1.4 * Math.cos(t * 0.5 + d.ph)
          if (y > yb + 2) continue
          sprite(dots[0], x, y, d.r * ap, d.a * ap)
        }

        // the curve itself
        for (const u of cache.curve) {
          const ap = appear(u)
          if (ap <= 0) continue
          sprite(dots[0], X(u), Y(u), 2.1 * (0.5 + 0.5 * ap), 0.92 * ap)
        }

        // the milestones: a dotted line down to the axis, the amber dot, and a ring that spreads and fades
        MILESTONES.forEach((m, i) => {
          const ap = appear(m)
          if (ap <= 0) return
          const x = X(m)
          const y = Y(m)
          for (let yy = y + 10; yy < yb + 4; yy += 8) sprite(dots[1], x, yy, 1.1, 0.26 * ap)
          sprite(dots[1], x, yb + 8, 2.4 * ap, 0.7 * ap)
          sprite(glow, x, y, 15 * ap, 0.5 * ap)
          sprite(dots[1], x, y, 4.6 * ap, ap)
          if (!reduceMotion && ap >= 1) {
            const p = (((t - i * 0.9) / 3.2) % 1 + 1) % 1
            const rr = 7 + 16 * p
            for (let k = 0; k < 14; k++) {
              const ang = (k * 2 * Math.PI) / 14
              sprite(dots[1], x + rr * Math.cos(ang), y + rr * Math.sin(ang), 1.5, 0.7 * (1 - p))
            }
          }
        })

        // a pulse runs up the curve from time to time: a bright head with a tail
        if (!reduceMotion && settled > 0) {
          const p = ((t - 4.8) / 6.5) % 1
          if (p >= 0) {
            const hu = p * (UEND * 1.12)
            for (let j = 8; j >= 0; j--) {
              const u = hu - j * 0.012
              if (u < 0 || u > UEND) continue
              if (j === 0) sprite(glow, X(u), Y(u), 15, 0.6)
              sprite(dots[1], X(u), Y(u), 2.8 - j * 0.22, 0.95 * (1 - j / 9))
            }
          }
        }
      },
    })
  }, [light])

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full max-lg:opacity-40" />
    </div>
  )
}
