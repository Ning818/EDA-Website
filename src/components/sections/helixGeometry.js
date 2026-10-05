// The Bioinformatics page headers' picture - DNA double helices, benzene-ring molecules and cells - as
// plain geometry (SVG path strings), for the line-art version (HelixDecor.jsx). Coordinates: a 660 x 360 viewBox, anchored to
// the bottom right of the band; fixed values, so it is the same on every load.

export const W = 660
export const H = 360

const f = (n) => Number(n.toFixed(1))

/**
 * A double helix along the axis from (x0, y0) (its start, the bottom) to (x1, y1): two strands that cross every half period `P`,
 * `A` wide each side. The strand that is nearer the viewer at a point is drawn whole (`front`), the one behind it lighter and
 * thinner (`back`), which gives the flat picture its depth; `rungs` are the base pairs between the strands, left out near the
 * crossings. Paths start at the axis' start, so a stroke animation runs along the helix from there.
 */
export function helix({ x0, y0, x1, y1, A, P, phase = 0 }) {
  const dx = x1 - x0
  const dy = y1 - y0
  const length = Math.hypot(dx, dy)
  const ux = dx / length
  const uy = dy / length
  const nx = -uy
  const ny = ux
  const step = 3
  const n = Math.ceil(length / step)
  const at = (t, side) => {
    const s = Math.sin((2 * Math.PI * t) / P + phase)
    return [x0 + ux * t + nx * A * s * side, y0 + uy * t + ny * A * s * side, Math.cos((2 * Math.PI * t) / P + phase) * side]
  }
  // each strand is cut into runs where it is in front (z > 0) and where it is behind
  const strandPaths = (side) => {
    let front = ''
    let back = ''
    let prevFront = null
    for (let i = 0; i <= n; i++) {
      const [x, y, z] = at(Math.min(length, i * step), side)
      const isFront = z > 0
      const cmd = prevFront === isFront ? 'L' : 'M'
      if (isFront) front += `${cmd}${f(x)} ${f(y)} `
      else back += `${cmd}${f(x)} ${f(y)} `
      prevFront = isFront
    }
    return { front, back }
  }
  const s1 = strandPaths(1)
  const s2 = strandPaths(-1)
  let rungs = ''
  for (let t = P / 12; t < length - P / 24; t += P / 8) {
    const [ax, ay] = at(t, 1)
    const [bx, by] = at(t, -1)
    if (Math.hypot(ax - bx, ay - by) > A * 0.7) rungs += `M${f(ax)} ${f(ay)} L${f(bx)} ${f(by)} `
  }
  return { front: s1.front + s2.front, back: s1.back + s2.back, rungs, length, cx: (x0 + x1) / 2 }
}

/** A benzene-like ring: the hexagon with three inner double-bond lines; `sub` adds a bond and a small atom on those vertices. */
export function ring(cx, cy, r, rot = 0, sub = []) {
  const v = (k, rr = r) => [cx + rr * Math.cos(rot + (k * Math.PI) / 3), cy + rr * Math.sin(rot + (k * Math.PI) / 3)]
  const pts = Array.from({ length: 6 }, (_, k) => v(k))
  let d = `M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L')} Z `
  for (const k of [0, 2, 4]) {
    const [ax, ay] = v(k, r * 0.72)
    const [bx, by] = v(k + 1, r * 0.72)
    // the inner line, a little shorter than the edge it runs beside
    d += `M${f(ax + (bx - ax) * 0.14)} ${f(ay + (by - ay) * 0.14)} L${f(ax + (bx - ax) * 0.86)} ${f(ay + (by - ay) * 0.86)} `
  }
  for (const k of sub) {
    const [x, y] = v(k)
    const [ex, ey] = v(k, r * 1.75)
    d += `M${f(x)} ${f(y)} L${f(ex)} ${f(ey)} `
    const ar = r * 0.2
    d += `M${f(ex + ar)} ${f(ey)} a${f(ar)} ${f(ar)} 0 1 0 ${f(-2 * ar)} 0 a${f(ar)} ${f(ar)} 0 1 0 ${f(2 * ar)} 0 `
  }
  return d
}

/** Two rings sharing an edge (naphthalene-like). */
export function ringPair(cx, cy, r, rot = 0, sub = []) {
  const dist = Math.sqrt(3) * r
  return ring(cx, cy, r, rot, sub) + ring(cx + dist * Math.cos(rot + Math.PI / 6), cy + dist * Math.sin(rot + Math.PI / 6), r, rot + Math.PI / 3)
}

/** A cell: a membrane and a dashed nucleus (returned separately, the nucleus is dashed). */
export function cell(cx, cy, r) {
  const circle = (rr) => `M${f(cx - rr)} ${f(cy)} a${rr} ${rr} 0 1 0 ${f(2 * rr)} 0 a${rr} ${rr} 0 1 0 ${f(-2 * rr)} 0`
  return { membrane: circle(r), nucleus: circle(r * 0.42), cx }
}

/**
 * A helix given by its centre, its length and how far its axis leans from the vertical (`lean`, degrees: positive leans the top
 * to the right, negative to the left).
 */
const helixAt = (cx, cy, len, lean, A, P, phase = 0) => {
  const a = (lean * Math.PI) / 180
  const dx = (Math.sin(a) * len) / 2
  const dy = (Math.cos(a) * len) / 2
  return helix({ x0: cx - dx, y0: cy + dy, x1: cx + dx, y1: cy - dy, A, P, phase })
}

// the helices, bottom to top. Left to right they alternate between faint ones (the far row) and full-strength ones (the main
// three). The lean differs from one to the next, to both sides, from nearly upright to about 35 degrees - never so far that
// one lies down - and neighbours never lean into each other, so the axes don't cross; lengths and heights differ too. None of
// them stands on anything: each hangs in the air (HelixDecor also sways them gently).
export const FAR_HELICES = [
  helixAt(22, 250, 100, 6, 11, 52, 0.5),
  helixAt(222, 232, 118, 22, 14, 60),
  helixAt(382, 216, 112, -14, 15, 64, 1),
  helixAt(574, 246, 104, -24, 14, 60, 2),
  helixAt(636, 232, 106, 9, 16, 64, 2.6),
]
export const MAIN_HELICES = [
  helixAt(112, 214, 230, -27, 22, 82, 1.4),
  helixAt(304, 196, 262, 8, 26, 92, 0.6),
  helixAt(500, 190, 270, 30, 30, 104, 0.2),
]

// the molecules, each with the x of its centre (what the right-to-left build-up is ordered by)
export const MOLECULES = [
  { d: ringPair(150, 66, 15, 0.35, [4]), cx: 158 },
  { d: ring(236, 36, 13, 0.1, [3]), cx: 236 },
  { d: ring(330, 46, 11, 0.6), cx: 330 },
  { d: ring(612, 56, 14, 0.5, [1, 4]), cx: 612 },
  { d: ring(24, 128, 12, 0.2), cx: 24 },
]
export const CELLS = [cell(36, 176, 11), cell(404, 100, 9), cell(470, 86, 9), cell(630, 138, 13)]
