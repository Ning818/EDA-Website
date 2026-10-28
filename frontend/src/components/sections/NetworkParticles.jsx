import { useEffect, useRef } from 'react'
import { clamp01, rng, startFlatParticles } from './flatParticles'

// The Teaching page's background: an academic network of flat particles, behind the whole page (header and content - the white
// sidebar and cards simply cover it). It is made of the dots of the page's own background grid (the 24px dot grid Teaching.jsx lays
// under everything): the nodes sit on grid dots, and every link runs along the grid in straight or 45-degree lines, like a metro
// map or a circuit trace, so it passes through grid dots and is drawn as those dots lit up with a fine dotted line between them.
// Hubs (a larger dot with a slowly turning ring, some of them amber) stand for the scholars who lead, each with a few students
// on straight radial links round it; hubs are tied to the next hub along and the next one down by one bent link each. There
// are no other links, so nothing tangles. The graph is laid out over the page's whole height and scrolls with it. It is densest at
// the top of the page, behind the header, and thins out towards the bottom (rows of hubs further apart, fewer students, fainter
// dots). It is only a background: nothing in it reacts to the pointer or to the cards. It appears from the top left, the rings
// turn slowly, and amber pulses of "knowledge" run along the links from a hub to the student at its end, which flashes a ring when
// it arrives. With reduced motion it is the finished graph, still. The engine is flatParticles.js; everything is drawn in
// drawExtras, in css pixels, on a canvas that is the size of the page (<main>) and scrolls with it - not a fixed one that has to be
// redrawn to follow the scrolling, which always lagged a frame or more behind it; only the part in the viewport is drawn.

const TEAL = '#2b9fb3' // a little deeper than the site's teal so the fine dots hold up on the light ground
const AMBER = '#dc9a2e'
const GRID = 24 // the background grid's spacing, px: its dots are at GRID / 2 + k * GRID from the page's top left
const HALF = GRID / 2
const PULSE_EVERY = 1.1 // seconds between the starts of two pulses
const PULSE_SPEED = 70 // px per second

// the eight directions of the grid (the straight and the 45-degree ones), in turn
const DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]]

/** The route from grid point a to grid point b along the grid: one 45-degree run and one straight run, in either order. */
function route(a, b, straightFirst) {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const sx = Math.sign(dx)
  const sy = Math.sign(dy)
  const m = Math.min(Math.abs(dx), Math.abs(dy))
  if (m === 0 || Math.abs(dx) === Math.abs(dy)) return [a, b]
  const rest = Math.max(Math.abs(dx), Math.abs(dy)) - m
  const along = Math.abs(dx) > Math.abs(dy) ? [sx * rest, 0] : [0, sy * rest]
  const v = straightFirst ? [a[0] + along[0], a[1] + along[1]] : [a[0] + sx * m, a[1] + sy * m]
  return [a, v, b]
}

/** The lit dots of a route: a grid dot every grid step (a 45-degree step is longer) with two small dots between them. */
function samples(poly) {
  const out = []
  for (let i = 0; i < poly.length - 1; i++) {
    const [x0, y0] = poly[i]
    const [x1, y1] = poly[i + 1]
    const len = Math.hypot(x1 - x0, y1 - y0)
    const diagonal = x0 !== x1 && y0 !== y1
    const step = diagonal ? GRID * Math.SQRT2 : GRID
    const n = Math.round(len / step)
    for (let k = 0; k < n; k++) {
      for (let j = 0; j < 3; j++) {
        const u = (k + j / 3) / n
        out.push({ x: x0 + (x1 - x0) * u, y: y0 + (y1 - y0) * u, main: j === 0 })
      }
    }
  }
  const [lx, ly] = poly[poly.length - 1]
  out.push({ x: lx, y: ly, main: true })
  return out
}
const lengthOf = (poly) => poly.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - poly[i][0], p[1] - poly[i][1]), 0)
/** The point `d` along a route. */
function pointAlong(poly, d) {
  let rest = d
  for (let i = 0; i < poly.length - 1; i++) {
    const L = Math.hypot(poly[i + 1][0] - poly[i][0], poly[i + 1][1] - poly[i][1])
    if (rest <= L || i === poly.length - 2) {
      const u = L > 0 ? Math.min(1, rest / L) : 0
      return [poly[i][0] + (poly[i + 1][0] - poly[i][0]) * u, poly[i][1] + (poly[i + 1][1] - poly[i][1]) * u]
    }
    rest -= L
  }
  return poly[poly.length - 1]
}

function buildGraph(w, H) {
  const rand = rng(33)
  const cols = Math.max(2, Math.round(w / 340))
  const rows = Math.max(4, Math.round(H / 250))
  const maxX = HALF + GRID * Math.floor((w - GRID) / GRID)
  const maxY = HALF + GRID * Math.floor((H * 0.94 - GRID) / GRID)
  const snap = (v, max) => Math.min(max, Math.max(HALF, HALF + GRID * Math.round((v - HALF) / GRID)))
  const nodes = []
  const edges = [] // { a, b, kind, poly, dots, len }: 'child' (hub to its student, the pulses' road) and 'bridge' (hub to hub)

  // hubs on a loose grid whose rows get further apart down the page (the row at u of the way down sits at u ** 1.7 of the height)
  const hubs = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = snap((c + 0.5 + (rand() - 0.5) * 0.55) * (w / cols), maxX)
      const y = snap(H * Math.max(0.01, (r + 0.5 + (rand() - 0.5) * 0.5) / rows) ** 1.7, maxY)
      hubs.push(nodes.push({ x, y, hub: true, amber: rand() < 0.24, ph: rand() * 6.28, d: (x / w + y / H) * 0.5, row: r, col: c }) - 1)
    }
  }
  const addEdge = (a, b, kind, poly) => edges.push({ a, b, kind, poly, dots: samples(poly), len: lengthOf(poly), minY: Math.min(...poly.map((p) => p[1])), maxY: Math.max(...poly.map((p) => p[1])) })

  // each hub's students: on straight radial links in some of the eight directions, never in two neighbouring ones (so the links fan out
  // cleanly), two to four grid steps out
  for (const hi of hubs) {
    const hub = nodes[hi]
    const depth = hub.y / H // 0 at the top of the page, 1 at the bottom
    const want = 1 + Math.floor(rand() * 3) + (depth < 0.2 ? 2 : depth < 0.45 ? 1 : 0) // more students near the top
    const order = DIRS.map((_, i) => i).sort(() => rand() - 0.5)
    const chosen = []
    for (const d of order) {
      if (chosen.length >= want) break
      if (chosen.some((o) => Math.min(Math.abs(o - d), 8 - Math.abs(o - d)) < 2)) continue
      chosen.push(d)
    }
    for (const d of chosen) {
      const steps = 2 + Math.floor(rand() * 3)
      const x = hub.x + DIRS[d][0] * steps * GRID
      const y = hub.y + DIRS[d][1] * steps * GRID
      if (x < HALF || x > maxX || y < HALF || y > maxY) continue
      const ci = nodes.push({ x, y, hub: false, amber: false, ph: rand() * 6.28, d: (x / w + y / H) * 0.5 }) - 1
      addEdge(hi, ci, 'child', [[hub.x, hub.y], [x, y]])
    }
  }

  // each hub is tied to the next hub along its row and to the nearest hub in the row below, by one bent link each
  for (const hi of hubs) {
    const hub = nodes[hi]
    const right = hubs.find((o) => nodes[o].row === hub.row && nodes[o].col === hub.col + 1)
    const below = hubs
      .filter((o) => nodes[o].row === hub.row + 1)
      .sort((p, q) => Math.abs(nodes[p].x - hub.x) - Math.abs(nodes[q].x - hub.x))[0]
    for (const o of [right, below]) {
      if (o === undefined) continue
      const to = nodes[o]
      if (Math.hypot(to.x - hub.x, to.y - hub.y) > 620) continue
      addEdge(hi, o, 'bridge', route([hub.x, hub.y], [to.x, to.y], rand() < 0.5))
    }
  }
  // the lower on the page, the fainter (1 at the top down to 0.5 at the bottom)
  for (const n of nodes) n.fade = 1 - 0.5 * Math.min(1, n.y / H)
  const childEdges = edges.filter((e) => e.kind === 'child')
  return { nodes, edges, childEdges }
}

export default function NetworkParticles() {
  const canvasRef = useRef(null)

  useEffect(() => {
    let cache = { key: '', graph: null }
    const main = canvasRef.current.closest('main') ?? document.body
    const hash = (k) => {
      const s = Math.sin(k * 127.1 + 17.3) * 43758.5453
      return s - Math.floor(s)
    }

    return startFlatParticles(canvasRef.current, {
      particles: [],
      traces: [],
      colors: [TEAL, AMBER],
      glowColor: AMBER,
      introSeconds: 6,
      layout: () => ({ sc: 1, tx: 0, ty: 0 }),
      drawExtras: (ctx, now, { sprite, dots, glow, reduceMotion }) => {
        const t = reduceMotion ? 60 : now
        // the canvas is the page itself (it scrolls with it, so it can never lag behind the scrolling): its size is the page's, the graph is laid
        // out over it, and only what is within the viewport - from `viewTop` down for `vh` - is drawn
        const w = ctx.canvas.clientWidth
        const vh = window.innerHeight
        const viewTop = -main.getBoundingClientRect().top
        const pageH = Math.round(main.offsetHeight / 120) * 120 // in steps, so a few pixels' change does not re-lay it
        const key = `${w}x${pageH}`
        if (cache.key !== key) cache = { key, graph: buildGraph(w, pageH) }
        const { nodes, edges, childEdges } = cache.graph
        const top = 0 // positions are page positions

        // how far each node has appeared (the graph appears from the top left), faded with depth
        const ap = new Float32Array(nodes.length)
        nodes.forEach((n, i) => {
          ap[i] = clamp01((t - 0.2 - n.d * 1.6) / 0.7) * n.fade
        })
        const onScreen = (n) => n.y > viewTop - 40 && n.y < viewTop + vh + 40

        // the links: the grid dots they pass through, lit, with small dots between
        for (const e of edges) {
          if (e.maxY < viewTop - 10 || e.minY > viewTop + vh + 10) continue
          const s = Math.min(ap[e.a], ap[e.b])
          if (s <= 0) continue
          const base = e.kind === 'bridge' ? 1 : 0.85
          for (const d of e.dots) {
            if (d.main) sprite(dots[0], d.x, top + d.y, 1.9, 0.5 * base * s)
            else sprite(dots[0], d.x, top + d.y, 1.1, 0.26 * base * s)
          }
        }

        // the nodes: students as dots, hubs larger with a slowly turning ring (amber ones in amber)
        nodes.forEach((n, i) => {
          if (ap[i] <= 0 || !onScreen(n)) return
          const c = n.amber ? 1 : 0
          const y = top + n.y
          if (n.hub) {
            sprite(dots[c], n.x, y, 4 * ap[i], 0.85 * ap[i])
            const turn = t * 0.3 + n.ph
            for (let k = 0; k < 8; k++) {
              const ang = turn + (k * Math.PI * 2) / 8
              sprite(dots[c], n.x + 11 * Math.cos(ang), y + 11 * Math.sin(ang), 1.4, 0.5 * ap[i])
            }
          } else {
            sprite(dots[0], n.x, y, 2.8 * ap[i], 0.75 * ap[i])
          }
        })

        // pulses of "knowledge": from a hub along a link to the student at its end, which flashes a ring when it arrives
        if (!reduceMotion && t > 2.2) {
          const kMax = Math.floor((t - 2.2) / PULSE_EVERY)
          for (let k = Math.max(0, kMax - 9); k <= kMax; k++) {
            const e = childEdges[Math.floor(hash(k) * childEdges.length)]
            const dur = e.len / PULSE_SPEED
            const age = t - 2.2 - k * PULSE_EVERY
            if (age < 0) continue
            if (age <= dur) {
              for (let j = 5; j >= 0; j--) {
                const dist = age * PULSE_SPEED - j * 5
                if (dist < 0) continue
                const [x, py] = pointAlong(e.poly, dist)
                const y = top + py
                if (j === 0) sprite(glow, x, y, 12, 0.5)
                sprite(dots[1], x, y, 2.5 - j * 0.28, 0.95 * (1 - j / 6))
              }
            } else if (age - dur < 0.8) {
              const p = (age - dur) / 0.8
              const rr = 5 + 11 * p
              const end = nodes[e.b]
              for (let m = 0; m < 10; m++) {
                const ang = (m * Math.PI * 2) / 10
                sprite(dots[1], end.x + rr * Math.cos(ang), top + end.y + rr * Math.sin(ang), 1.5, 0.75 * (1 - p))
              }
            }
          }
        }
      },
    })
  }, [])

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full max-md:opacity-70" />
    </div>
  )
}
