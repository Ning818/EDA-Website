import { useEffect, useRef } from 'react'
import { DENSE, clamp01, densePath, insidePoly, linePts, pathPoints, rng, startFlatParticles } from './flatParticles'
import { W, H, G, TOWERS, TOWER_LIST, TALLEST, FAR, BRIDGE_LINES, DRONES, POLES, TALL_CX, RING_Y, RING_RX, RING_RY, SIGNAL_RADII, signalArc, dronePath, polePath } from './skylineGeometry'

// The Smart City page headers' skyline (the line-art picture in SkylineDecor.jsx) made of flat particles, like the home page's
// Smart City cloud: the towers in the theme's blue, the road and everything "smart" - the smart poles, the signal arcs, the
// orbit ring, the drones - in the amber of that cloud's streets. Each tower is a stream of particles that rises from the
// ground at its foot and runs up one side, over the roof and down the other, so the skyline grows from right to left; the
// detail lines, sky bridges, ring, arcs, drones and poles gather in as their tower finishes. Afterwards the particles
// twinkle slightly, the signal arcs ripple outwards, the drones drift, and amber vehicles run along the road. With reduced
// motion it is just the finished picture. The engine is flatParticles.js; the geometry skylineGeometry.js.
//
// Two variants for the theme's two pages, told apart by where the amber goes: `projects` puts it at street level and on the
// "smart" overlay (the road, its lane dashes, the smart poles, the vehicles, the orbit ring, the signal arcs, the drones);
// `research` puts it on the city's outline instead - the silhouettes of the near towers - and leaves everything else (the
// street, the overlay, the detail lines, the sky bridges, the far row) in the theme's blue.

const AMBER = '#e0a94a' // SmartCityParticles.jsx ROAD_COLOR
const SPACING = 6.5 // between the particles of a line

function build(variant) {
  const rand = rng(5)
  const outlineAmber = variant === 'research' // amber on the near towers' outlines
  const cs = outlineAmber ? 0 : 1 // amber on the street level and the overlay
  const particles = []
  const traces = []

  // the near towers' silhouettes: far-row particles and the ring's back half behind them are left out
  const nearPolys = TOWER_LIST.map((t) => densePath(t.sil))
  const hidden = (x, y) => nearPolys.some((poly) => insidePoly(poly, x, y))
  const hiddenByTallest = (x, y) => insidePoly(nearPolys[TALLEST], x, y)

  // near-row particles closer than this to one already placed are left out: towers that stand a few units apart would
  // otherwise leave a doubled, darker column of dots between them
  const taken = new Set()
  const crowded = (x, y) => {
    const key = `${Math.round(x / 3.4)},${Math.round(y / 3.4)}`
    if (taken.has(key)) return true
    taken.add(key)
    return false
  }

  /** A stream along a path: its particles leave the path's start and settle along it. Returns the trace's index. */
  const stream = (d, { delay, c = 0, a = 0.92, filter, skipGround = true, r0 = 2.0, dedupe = false }) => {
    const tr = densePath(d)
    const idx = traces.push(tr) - 1
    const add = (s) => {
      const k = Math.min(tr.n, Math.round(s / DENSE))
      const x = tr.pts[2 * k]
      const y = tr.pts[2 * k + 1]
      if (skipGround && y > G - 0.8) return
      if (filter?.(x, y)) return
      if (dedupe && crowded(x, y)) return
      particles.push({ mode: 0, trace: idx, s, rx: x, ry: y, c, r: r0 + rand() * 0.6, a, T: delay + 1.0 * (s / tr.length), D: 0.25 + s / 900, ph: rand() * 6.28 })
    }
    for (let s = 0; s < tr.length; s += SPACING) add(s)
    add(tr.length)
    return idx
  }
  /** Points that gather in from scattered positions. */
  const gather = (delay, pts, { c = 0, a = 0.92, r0 = 2.0, bob, bobT, bobPh, steady, wave } = {}) => {
    for (const [x, y] of pts) {
      const ang = rand() * 6.28
      const dist = 14 + rand() * 36
      particles.push({ mode: 1, rx: x, ry: y, c, r: r0 + rand() * 0.6, a, T: delay + rand() * 0.25, D: 0.7 + rand() * 0.5, ox: Math.cos(ang) * dist, oy: Math.sin(ang) * dist, ph: rand() * 6.28, bob, bobT, bobPh, steady, wave })
    }
  }

  // the skyline grows from the right: the right-most tower starts first
  const towerDelay = (i) => 0.3 + (TOWER_LIST.length - 1 - i) * 0.12

  // the far row, faint, behind the near towers
  FAR.forEach(([type, w, h, x], i) => stream(TOWERS[type](x, w, h).sil, { delay: 0.1 + (FAR.length - 1 - i) * 0.1, a: 0.42, filter: hidden }))

  // the road: a line of amber that grows from the right (the vehicles run along it), its lane dashes, the smart poles
  const road = stream(`M${W} ${G} H0`, { delay: 0.1, c: cs, a: 0.8, skipGround: false })
  gather(0.8, linePts(0, G + 11, W, G + 11, SPACING).filter((_, i) => Math.floor(i / 2) % 2 === 0), { c: cs, a: 0.5 })
  POLES.forEach((x, i) => gather(1.0 + (POLES.length - 1 - i) * 0.05, pathPoints(polePath(x), 4), { c: cs, a: 0.75 }))

  // the near towers: outline streams, then detail lines, then spire / turbine
  TOWER_LIST.forEach((t, i) => {
    const delay = towerDelay(i)
    stream(t.sil, { delay, dedupe: true, c: outlineAmber ? 1 : 0 })
    if (t.lines) gather(delay + 1.0, pathPoints(t.lines, 7), { a: 0.55 })
    if (t.extra) gather(delay + 1.2, pathPoints(t.extra, 5), { a: 0.85 })
  })

  // sky bridges: two lines of particles from one tower's edge to the next one's
  BRIDGE_LINES.forEach(({ i, lines }) => gather(towerDelay(i) + 1.2, lines.flatMap(([x1, y1, x2, y2]) => linePts(x1, y1, x2, y2, 5)), { a: 0.85 }))

  // the orbit ring around the tallest tower (amber): the back half dashed and hidden behind the tower, the front half whole
  const back = pathPoints(`M${TALL_CX - RING_RX} ${RING_Y} A${RING_RX} ${RING_RY} 0 0 1 ${TALL_CX + RING_RX} ${RING_Y}`, 6).filter((_, i) => i % 2 === 0 && !hiddenByTallest(_[0], _[1]))
  gather(towerDelay(TALLEST) + 1.2, back, { c: cs, a: 0.5 })
  gather(towerDelay(TALLEST) + 1.3, pathPoints(`M${TALL_CX - RING_RX} ${RING_Y} A${RING_RX} ${RING_RY} 0 0 0 ${TALL_CX + RING_RX} ${RING_Y}`, 5), { c: cs, a: 0.9 })
  // the signal arcs over its antenna: a ripple runs outwards through them
  SIGNAL_RADII.forEach((r, i) => gather(towerDelay(TALLEST) + 1.6 + i * 0.2, pathPoints(signalArc(r), 4.5), { c: cs, a: 0.95, wave: i }))
  // drones: once one has taken shape it floats up and down as a whole (all its particles share the same phase)
  DRONES.forEach(([x, y], i) => {
    const delay = towerDelay(TALLEST) + 1.9 + i * 0.3
    gather(delay, pathPoints(dronePath(x, y), 4.8), { c: cs, a: 0.9, r0: 1.6, bob: 3, bobT: delay + 1.6, bobPh: i * 2.1, steady: true })
  })

  return { particles, traces, road, vehicleColor: cs }
}

// amber vehicles on the road: [speed (units/s), start offset (units), direction]; the road's trace starts at its right end,
// so a positive `s` runs right to left
const VEHICLES = [[70, 0, 1], [46, 300, 1], [96, 520, -1]]

export default function SkylineParticles({ color = '#2f86b3', variant = 'projects' }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const { particles, traces, road, vehicleColor } = build(variant)
    return startFlatParticles(canvasRef.current, {
      particles,
      traces,
      colors: [color, AMBER],
      glowColor: vehicleColor ? AMBER : color,
      // the picture fits the canvas' width and stands on its bottom edge
      layout: (w, h) => {
        const sc = Math.min(w / W, h / H)
        return { sc, tx: w - W * sc, ty: h - H * sc }
      },
      drawExtras: (ctx, t, { sprite, dots, glow, pointOn, reduceMotion }) => {
        if (reduceMotion || t < 2.5) return
        const tr = traces[road]
        VEHICLES.forEach(([speed, offset, dir]) => {
          const s = (offset + (t - 2.5) * speed) % (tr.length + 40)
          const fade = clamp01(Math.min(s / 30, (tr.length + 40 - s) / 30))
          const at = (d) => (dir > 0 ? d : tr.length - d) // distance along the trace of a point `d` units into the run
          for (let j = 5; j >= 0; j--) {
            const sj = s - j * 5
            if (sj < 0 || sj > tr.length) continue
            const [x, y] = pointOn(tr, at(sj))
            sprite(dots[vehicleColor], x, y - 3.5, 2.5 - j * 0.3, 0.95 * fade * (1 - j / 6))
          }
          if (s <= tr.length) {
            const [hx, hy] = pointOn(tr, at(s))
            sprite(glow, hx, hy - 3.5, 8, 0.45 * fade)
          }
        })
      },
    })
  }, [color, variant])

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <canvas
        ref={canvasRef}
        style={{ aspectRatio: `${W} / ${H}` }}
        className="absolute bottom-0 right-0 w-[min(645px,calc(100vw_-_575px))] max-md:w-full max-md:opacity-40 [mask-image:linear-gradient(to_left,black_72%,transparent_100%)]"
      />
    </div>
  )
}
