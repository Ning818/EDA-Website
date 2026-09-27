import * as THREE from 'three'

// Procedurally generated printed-circuit-board particle cloud that fills a whole screen. Nothing is
// loaded: the layout follows how real boards are routed -
//   - chip footprints (outline + a pin row on every side), each pin a trace that runs straight out,
//     turns 45deg (staggered so the bundle stays parallel and never crosses itself) and runs on as a bus,
//   - long parallel buses across the whole board with 45deg jogs (horizontal and vertical),
//   - vias (rings) where traces end and scattered test pads,
// then every polyline is sampled at an even spacing. Deterministic (seeded), so it is the same every load.

export const CIRCUIT_W = 1600 // reference board size in px; ParticleCanvas scales it to cover the screen
export const CIRCUIT_H = 900
export const CIRCUIT_UNIT = 100 // px per position unit
const SPACING = 10 // px between neighbouring particles along a trace
const MIN_GAP = 5 // px: points closer than this (crossings, overlaps) are merged

const TEAL = '#4a9db3', GOLD = '#e0a94a', INDIGO = '#6a6fc4'

// A rectangular gap left empty in the middle of the board, sized/positioned so it's always centered
// on screen regardless of viewport (the board's local origin always maps to the screen center,
// whatever "cover" scale a given aspect ratio ends up using - only the gap's on-screen size drifts a
// bit with aspect ratio, which is fine here). CircuitChipCards.jsx lays a real content card over it,
// pinned 120px from the left/right screen edges on desktop - since CIRCUIT_W (1600) is close to a
// common desktop width, a 130/770 local-unit margin/height lines up with that reasonably well.
export const CIRCUIT_KEEPOUT = { x: 130, y: 210, w: CIRCUIT_W - 260, h: 480 }

function makeRng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// THREE.Color converts the hex to linear space, which is what the particle shader expects.
const hexToRgb = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b] }

export function buildCircuitCloud(seed = 7) {
  const rnd = makeRng(seed)
  const range = (lo, hi) => lo + (hi - lo) * rnd()
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)]
  const pts = [] // [x, y, colorHex]
  const grid = new Map()
  const cell = MIN_GAP
  const flowLines = [] // a few whole traces (see `trace`'s `flow` option) whose own points travel - see updateCircuitFlow below

  const K = CIRCUIT_KEEPOUT
  // True if any part of `poly`'s bounding box overlaps the keep-out - used to keep the flowing lines
  // (see `bus`) confined to the board's outer margins, well clear of the card in the middle, rather
  // than lines that happen to run close behind/beside it.
  const polyOverlapsKeepout = (poly) => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    for (const [x, y] of poly) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y) }
    return minX < K.x + K.w && maxX > K.x && minY < K.y + K.h && maxY > K.y
  }
  const add = (x, y, color) => {
    if (x < 8 || x > CIRCUIT_W - 8 || y < 8 || y > CIRCUIT_H - 8) return -1
    // Leave the keep-out empty, but let a trace's own boundary sit exactly on its edge (a chip/bus
    // wall drawn right at x===K.x etc. isn't "inside" by this test) - that's how the outline below
    // survives while everything else ducks under the gap.
    if (x > K.x + 1 && x < K.x + K.w - 1 && y > K.y + 1 && y < K.y + K.h - 1) return -1
    const cx = Math.floor(x / cell), cy = Math.floor(y / cell)
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      for (const k of grid.get(`${cx + i},${cy + j}`) ?? []) {
        if ((pts[k][0] - x) ** 2 + (pts[k][1] - y) ** 2 < MIN_GAP * MIN_GAP) return -1
      }
    }
    const key = `${cx},${cy}`
    if (!grid.has(key)) grid.set(key, [])
    grid.get(key).push(pts.length)
    pts.push([x, y, color])
    return pts.length - 1
  }

  /** Points along a polyline at an even arc-length spacing (both ends included). `flow: true` also
   * records, for every point actually placed (a merged/clipped sample is skipped), its index into
   * `pts` and its own distance travelled along this polyline - see updateCircuitFlow below, which
   * uses that to slide exactly these points along the same polyline over time. */
  const trace = (poly, color, flow = false) => {
    let carry = 0, total = 0
    const stops = flow ? [] : null
    for (let i = 0; i + 1 < poly.length; i++) {
      const [x0, y0] = poly[i], [x1, y1] = poly[i + 1]
      const len = Math.hypot(x1 - x0, y1 - y0)
      for (let s = carry; s <= len; s += SPACING) {
        const idx = add(x0 + ((x1 - x0) * s) / len, y0 + ((y1 - y0) * s) / len, color)
        if (flow && idx >= 0) stops.push([idx, total + s])
      }
      carry = ((carry - len) % SPACING + SPACING) % SPACING
      total += len
    }
    const [lx, ly] = poly[poly.length - 1]
    const idxEnd = add(lx, ly, color)
    if (flow && idxEnd >= 0) stops.push([idxEnd, total])
    if (flow) flowLines.push({ poly, stops })
  }
  const ring = (cx, cy, r, color) => {
    const n = Math.max(6, Math.round((2 * Math.PI * r) / SPACING))
    for (let i = 0; i < n; i++) add(cx + r * Math.cos((2 * Math.PI * i) / n), cy + r * Math.sin((2 * Math.PI * i) / n), color)
  }
  const rect = (x, y, w, h, color) => trace([[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]], color)

  // 1. Long buses: a bundle of parallel traces across the whole board with two 45deg jogs.
  const bus = (horizontal, at, count, pitch, color) => {
    const L = horizontal ? CIRCUIT_W : CIRCUIT_H
    const a = range(0.2, 0.4) * L, b = a + range(0.2, 0.35) * L
    const j1 = pick([-1, 1]) * range(50, 130), j2 = pick([-1, 1]) * range(50, 130)
    for (let k = 0; k < count; k++) {
      const o = at + k * pitch
      const along = [[-10, 0], [a, 0], [a + Math.abs(j1), j1], [b, j1], [b + Math.abs(j2 - j1), j2], [L + 10, j2]]
      const poly = along.map(([s, d]) => (horizontal ? [s, o + d] : [o + d, s]))
      // A few separate, whole bus lines have their own points travel along them (see updateCircuitFlow)
      // - only lines that stay clear of the card in the middle, so the flow only happens around it.
      trace(poly, color, !polyOverlapsKeepout(poly) && rnd() < 0.45)
      ring(poly[poly.length - 2][0], poly[poly.length - 2][1], 5, GOLD)
    }
  }
  for (let i = 0; i < 5; i++) bus(true, 60 + i * 175 + range(-25, 25), Math.round(range(4, 7)), 14, i === 2 ? GOLD : TEAL)
  for (let i = 0; i < 6; i++) bus(false, 70 + i * 270 + range(-30, 30), Math.round(range(3, 6)), 14, i === 3 ? GOLD : TEAL)

  // The keep-out's own outline, like a big component's footprint silkscreen - CircuitChipCards.jsx's
  // card sits right on top of it.
  rect(K.x, K.y, K.w, K.h, INDIGO)

  // 2. Chips with fan-out pins. A 4x3 grid of cells, most of them holding a chip (any that would
  // overlap the keep-out are skipped instead).
  const cols = 4, rows = 3
  const overlapsKeepout = (x, y, w, h) => x < K.x + K.w && x + w > K.x && y < K.y + K.h && y + h > K.y
  for (let ci = 0; ci < cols; ci++) {
    for (let ri = 0; ri < rows; ri++) {
      if (rnd() < 0.2) continue
      const w = Math.round(range(90, 150) / 20) * 20, h = Math.round(range(70, 120) / 20) * 20
      const cx = (ci + 0.5) * (CIRCUIT_W / cols) + range(-40, 40), cy = (ri + 0.5) * (CIRCUIT_H / rows) + range(-30, 30)
      const x = cx - w / 2, y = cy - h / 2
      if (overlapsKeepout(x, y, w, h)) continue
      rect(x, y, w, h, INDIGO)
      rect(x + 12, y + 12, w - 24, h - 24, INDIGO)
      ring(x + 22, y + 22, 4, GOLD) // pin-1 mark
      const pitch = 20
      const sides = [
        { u: [0, -1], t: [1, 0], n: Math.floor((w - 20) / pitch), origin: (k) => [x + 10 + k * pitch, y] },
        { u: [0, 1], t: [1, 0], n: Math.floor((w - 20) / pitch), origin: (k) => [x + 10 + k * pitch, y + h] },
        { u: [-1, 0], t: [0, 1], n: Math.floor((h - 20) / pitch), origin: (k) => [x, y + 10 + k * pitch] },
        { u: [1, 0], t: [0, 1], n: Math.floor((h - 20) / pitch), origin: (k) => [x + w, y + 10 + k * pitch] },
      ]
      for (const s of sides) {
        const mid = (s.n - 1) / 2
        for (let k = 0; k < s.n; k++) {
          const p = s.origin(k)
          const off = k - mid
          const dir = off < 0 ? -1 : 1 // pins on either half of the side turn opposite ways
          // Staggered straight length: the pin nearest the middle turns latest, so the fan never crosses.
          const rank = Math.abs(off)
          const h1 = 22 + (mid - rank + 1) * pitch
          const t = [s.t[0] * dir, s.t[1] * dir]
          const D = 34
          const p1 = [p[0] + s.u[0] * h1, p[1] + s.u[1] * h1]
          const p2 = [p1[0] + (s.u[0] + t[0]) * D, p1[1] + (s.u[1] + t[1]) * D]
          const R = range(60, 240)
          const p3 = [p2[0] + t[0] * R, p2[1] + t[1] * R]
          const color = rnd() < 0.12 ? GOLD : TEAL
          trace([p, p1, p2, p3], color)
          if (rnd() < 0.55) ring(p3[0], p3[1], 5, GOLD)
        }
      }
    }
  }

  // 3. Loose test pads / vias to fill the gaps.
  for (let i = 0; i < 90; i++) ring(range(20, CIRCUIT_W - 20), range(20, CIRCUIT_H - 20), pick([3, 5, 7]), rnd() < 0.5 ? GOLD : TEAL)

  const n = pts.length
  const positions = new Float32Array(n * 3), colors = new Float32Array(n * 3), sizes = new Float32Array(n).fill(1)
  const rgb = new Map([TEAL, GOLD, INDIGO].map((c) => [c, hexToRgb(c)]))
  for (let i = 0; i < n; i++) {
    positions[i * 3] = (pts[i][0] - CIRCUIT_W / 2) / CIRCUIT_UNIT
    positions[i * 3 + 1] = -(pts[i][1] - CIRCUIT_H / 2) / CIRCUIT_UNIT
    colors.set(rgb.get(pts[i][2]), i * 3)
  }

  // A moving, uniformly-spaced, single-color stream of points looks static (translating a repeating
  // pattern by itself is invisible) - so a flow-tagged line's points get a fixed big/small pulse
  // pattern instead, one cycle every FLOW_PERIOD px along the line, keyed to each point's own
  // (unchanging) distance-along-the-line `s`. Since updateCircuitFlow moves a point from `s` to
  // `s + shift(t)` every frame while its size stays tied to the original `s`, the pulse pattern itself
  // reads as travelling along the wire as `shift(t)` grows - no color change, no extra points, no
  // blending trick, just the line's own particles varying in size as they go. The size never dips
  // below the board's normal point size (1): the line has to stay fully intact, on its own original
  // path, at every moment - the pulse only ever adds a brighter/bigger crest on top of that, never a
  // gap that would make it read as a different, broken-up line.
  const FLOW_PERIOD = 70
  for (const { stops } of flowLines) {
    for (const [idx, s] of stops) {
      const wave = 0.5 + 0.5 * Math.cos((2 * Math.PI * s) / FLOW_PERIOD)
      sizes[idx] = 1 + 0.7 * wave
    }
  }

  // Convert each flow-tagged line into the same local-unit space as `positions` above, with an
  // arc-length lookup table (cumulative length up to each vertex) - updateCircuitFlow below uses that
  // to relocate a point to anywhere along the line by distance travelled rather than by segment index,
  // and a random-but-fixed speed/direction so different lines drift at different rates.
  const toLocal = ([px, py]) => [(px - CIRCUIT_W / 2) / CIRCUIT_UNIT, -(py - CIRCUIT_H / 2) / CIRCUIT_UNIT]
  const flowGroups = flowLines.map(({ poly, stops }) => {
    const localPoly = poly.map(toLocal)
    const cum = [0]
    for (let i = 1; i < localPoly.length; i++) {
      cum.push(cum[i - 1] + Math.hypot(localPoly[i][0] - localPoly[i - 1][0], localPoly[i][1] - localPoly[i - 1][1]))
    }
    const total = cum[cum.length - 1]
    return {
      poly: localPoly,
      cum,
      total,
      // Every point this line placed: its index into `positions`/`colors` and its own distance along
      // the line, converted to the same local-unit scale as `cum`/`total` (a uniform scale, so this is
      // just dividing the pixel-space distance by CIRCUIT_UNIT).
      points: stops.map(([idx, s]) => [idx, s / CIRCUIT_UNIT]),
      speed: (0.15 + 0.3 * rnd()) * (rnd() < 0.5 ? -1 : 1), // local units/sec; direction randomized per line
    }
  })

  return { positions, colors, sizes, flowGroups }
}

/** A point at distance `s` (looping) along `group.poly` (one of buildCircuitCloud's `flowGroups`). */
function sampleFlowGroup(group, s) {
  const { poly, cum, total } = group
  let d = s % total
  if (d < 0) d += total
  let lo = 1, hi = cum.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (cum[mid] < d) lo = mid + 1
    else hi = mid
  }
  const segLen = cum[lo] - cum[lo - 1] || 1
  const t = (d - cum[lo - 1]) / segLen
  const [x0, y0] = poly[lo - 1], [x1, y1] = poly[lo]
  return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]
}

/**
 * The "current flowing" effect: no separate glow layer, just a few whole, separate bus lines
 * (`circuit.flowGroups`, tagged at build time - see `trace`'s `flow` option) whose own points slide
 * along their line, all at the same steady pace and in one direction, looping back to the start once
 * they reach the end - so those lines visually read as current running through the board, using
 * the board's own particles and colors. Writes straight into `positions` (pass the actual Float32Array
 * backing the circuit cloud's "position" attribute, so the change shows up with no extra Points object
 * - the caller still has to set that attribute's `needsUpdate = true` afterward).
 */
export function updateCircuitFlow(flowGroups, positions, t) {
  for (const g of flowGroups) {
    const shift = t * g.speed
    for (const [idx, s0] of g.points) {
      const [x, y] = sampleFlowGroup(g, s0 + shift)
      positions[idx * 3] = x
      positions[idx * 3 + 1] = y
    }
  }
}
