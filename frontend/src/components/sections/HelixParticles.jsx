import { useEffect, useRef } from 'react'
import { DENSE, clamp01, compose, densePath, pathPoints, rng, rotateAbout, startFlatParticles, translate } from './flatParticles'
import { W, H, FAR_HELICES, MAIN_HELICES, MOLECULES, CELLS } from './helixGeometry'

// The Bioinformatics page headers' DNA (the line-art picture in HelixDecor.jsx) made of flat particles, like the home page's
// DNA cloud: everything in the theme's green plus a little of the amber that cloud gives its "bright" strand (see the variants below). Each helix is a stream of particles that runs up its axis from the bottom, the strand in front whole and
// the one behind it lighter, the base pairs gathering in between them; the molecules and cells gather in from scattered
// positions - the picture building up from the right to the left. Afterwards every helix, molecule and cell drifts as a whole
// (up and down with a slight turn, each at its own pace; the particles keep their places on it) and the particles twinkle
// slightly. With reduced motion it is just the finished picture. The engine is flatParticles.js; the geometry helixGeometry.js.
//
// Two variants for the theme's two pages, told apart by where the amber goes: `projects` singles out one strand of the middle
// helix, as the home page's cloud does with one of its strands; `research` leaves every helix green and puts the amber on the
// small things floating among them - the molecules and the cells (membrane and nucleus).

const AMBER = '#e0a94a' // DNAParticles.jsx HIGHLIGHT_COLOR
const SPACING = 5.6 // between the particles of a strand
const RUN = 3.4 // seconds after which things start to drift (the picture is built by then)
const TAU = Math.PI * 2
const HIGHLIGHT = { helix: 1, strand: 1 } // the projects variant's amber strand: the middle main helix's second strand

/** When something centred at x starts to gather: the right-most first, the left-most last. */
const at = (cx, extra = 0) => 0.2 + ((W - cx) / W) * 2.2 + extra

/** A gentle drift of an object about its centre: up and down by `amp`, with a slight turn. */
const floating = (cx, cy, amp, turn, seconds, ph) => (t) => {
  const e = clamp01((t - RUN) / 1.5)
  const s = Math.sin((TAU * t) / seconds + ph)
  return compose(translate(0, amp * s * e), rotateAbout(cx, cy, ((turn * Math.PI) / 180) * s * e))
}

function build(variant) {
  const research = variant === 'research'
  const rand = rng(21)
  const particles = []
  const traces = []
  const motions = []
  const motion = (fn) => motions.push(fn) - 1

  /** A stream along a path: its particles leave the path's start and settle along it. */
  const stream = (d, { delay, c = 0, a = 0.92, r0 = 2.0, mi }) => {
    if (!d) return
    const tr = densePath(d)
    const idx = traces.push(tr) - 1
    const add = (s) => {
      const k = Math.min(tr.n, Math.round(s / DENSE))
      particles.push({ mode: 0, trace: idx, s, rx: tr.pts[2 * k], ry: tr.pts[2 * k + 1], c, r: r0 + rand() * 0.5, a, T: delay + 1.0 * (s / tr.length), D: 0.25 + s / 900, ph: rand() * 6.28, mi })
    }
    for (let s = 0; s < tr.length; s += SPACING) add(s)
    add(tr.length)
  }
  /** Points that gather in from scattered positions. */
  const gather = (delay, pts, { c = 0, a = 0.92, r0 = 2.0, mi } = {}) => {
    for (const [x, y] of pts) {
      const ang = rand() * 6.28
      const dist = 14 + rand() * 36
      particles.push({ mode: 1, rx: x, ry: y, c, r: r0 + rand() * 0.5, a, T: delay + rand() * 0.25, D: 0.7 + rand() * 0.5, ox: Math.cos(ang) * dist, oy: Math.sin(ang) * dist, ph: rand() * 6.28, mi })
    }
  }

  /** One helix: its two strands (front runs whole, back runs lighter), then the base pairs. `strong`: the main ones. */
  const helix = (h, i, strong, amberStrand) => {
    const k = strong ? 1 : 0.55 // the far row is fainter
    const rise = (strong ? 7 : 4) + (i % 3) * 2
    const mi = motion(floating(h.cx, h.cy, rise / 2, strong ? 1.4 : 0.8, (strong ? 7 : 9) + (i % 4) * 1.3, i * 1.7))
    const delay = at(h.cx)
    h.strands.forEach((st, n) => {
      const c = n === amberStrand ? 1 : 0
      stream(st.front, { delay, c, a: 0.95 * k, r0: strong ? 2.0 : 1.7, mi })
      stream(st.back, { delay, c, a: 0.5 * k, r0: 1.5, mi })
    })
    gather(at(h.cx, 0.35), pathPoints(h.rungs, 6), { a: 0.6 * k, r0: 1.4, mi })
  }
  FAR_HELICES.forEach((h, i) => helix(h, i, false))
  MAIN_HELICES.forEach((h, i) => helix(h, i + 3, true, !research && i === HIGHLIGHT.helix ? HIGHLIGHT.strand : undefined))

  // molecules and cells, floating in the air above
  MOLECULES.forEach((m, i) => {
    const mi = motion(floating(m.cx, m.cy, 4, 3, 6 + (i % 4) * 1.3, (i + 2) * 1.7))
    gather(at(m.cx, 0.4), pathPoints(m.d, 4.2), { c: research ? 1 : 0, a: 0.85, r0: 1.7, mi })
  })
  CELLS.forEach((c, i) => {
    const mi = motion(floating(c.cx, c.cy, 4.5, 2, 6.5 + (i % 4) * 1.3, (i + 5) * 1.7))
    gather(at(c.cx, 0.4), pathPoints(c.membrane, 4.4), { c: research ? 1 : 0, a: 0.8, r0: 1.7, mi })
    gather(at(c.cx, 0.9), pathPoints(c.nucleus, 3.4), { c: research ? 1 : 0, a: 0.85, r0: 1.4, mi })
  })

  return { particles, traces, motions }
}

export default function HelixParticles({ color = '#4ab47a', variant = 'projects' }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const { particles, traces, motions } = build(variant)
    return startFlatParticles(canvasRef.current, {
      particles,
      traces,
      motions,
      colors: [color, AMBER],
      // the picture fits the canvas' width and stands on its bottom edge, 22 units lower (like the line art's)
      layout: (w, h) => {
        const sc = Math.min(w / W, h / H)
        return { sc, tx: w - W * sc, ty: h - H * sc + 22 * sc }
      },
    })
  }, [color, variant])

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <canvas
        ref={canvasRef}
        style={{ aspectRatio: `${W} / ${H}` }}
        className={`absolute bottom-0 right-0 w-[min(660px,calc(100vw_-_560px))] ${variant === 'research' ? 'max-md:bottom-auto max-md:top-[calc((100vw_-_64px)_*_-0.06)] ' : ''}max-md:w-full max-md:opacity-40 [mask-image:linear-gradient(to_left,black_92%,transparent_100%)]`}
      />
    </div>
  )
}
