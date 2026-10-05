// The Smart City skyline's geometry, shared by the line-art version (SkylineDecor.jsx) and the particle version
// (SkylineParticles.jsx). Coordinates: a 660 x 360 viewBox, the ground at y = G; fixed values, so it is the same on every load.

export const W = 660
export const H = 360
export const G = 336 // the ground line

const poly = (pts) => `M${pts.map(([x, y]) => `${x} ${y}`).join(' L')} Z`

// Each tower type returns { sil: a closed silhouette, lines: inner detail lines (an open path), extra: more detail drawn with
// the outline (spire, turbine) }.
export const TOWERS = {
  // slender, tapering, with a spire and belts
  needle(x, w, h) {
    const cx = x + w / 2
    const top = G - h
    const sil = poly([[x, G], [x + w * 0.12, G - h * 0.5], [cx - w * 0.1, top + 34], [cx, top], [cx + w * 0.1, top + 34], [x + w - w * 0.12, G - h * 0.5], [x + w, G]])
    let lines = `M${cx} ${top + 34} V${G - 4} `
    for (const t of [0.2, 0.38, 0.56]) lines += `M${x + w * 0.2} ${G - h * t} H${x + w - w * 0.2} `
    return { sil, lines, extra: `M${cx} ${top} V${top - 18}` }
  },
  // glass tower with a slanted top and diagonal facet lines parallel to the roof
  facet(x, w, h) {
    const top = G - h
    const cut = Math.min(46, w)
    const sil = poly([[x, G], [x, top + cut], [x + w, top], [x + w, G]])
    let lines = ''
    for (let y = top + cut + 12; y < G - 8; y += 18) lines += `M${x} ${y} L${x + w} ${y - cut} `
    return { sil, lines, extra: '' }
  },
  // cylinder: elliptical top, ring bands
  cyl(x, w, h) {
    const top = G - h
    const rx = w / 2
    const sil = `M${x} ${G} V${top} A${rx} 6 0 0 1 ${x + w} ${top} V${G} Z`
    let lines = `M${x} ${top} A${rx} 6 0 0 0 ${x + w} ${top} `
    for (let y = top + 22; y < G - 10; y += 16) lines += `M${x} ${y} A${rx} 5 0 0 0 ${x + w} ${y} `
    return { sil, lines, extra: '' }
  },
  // four setbacks, a wind turbine on the roof
  zig(x, w, h) {
    const cx = x + w / 2
    const q = h / 4
    const sil = poly([
      [x, G], [x, G - q], [x + w * 0.1, G - q], [x + w * 0.1, G - 2 * q], [x + w * 0.2, G - 2 * q], [x + w * 0.2, G - 3 * q], [x + w * 0.3, G - 3 * q], [x + w * 0.3, G - h],
      [x + w * 0.7, G - h], [x + w * 0.7, G - 3 * q], [x + w * 0.8, G - 3 * q], [x + w * 0.8, G - 2 * q], [x + w * 0.9, G - 2 * q], [x + w * 0.9, G - q], [x + w, G - q], [x + w, G],
    ])
    const hub = G - h - 24
    let lines = ''
    for (const k of [1, 2, 3]) lines += `M${x + w * 0.1 * k + 4} ${G - k * q + 7} H${x + w - w * 0.1 * k - 4} `
    // turbine: mast + three blades
    const blades = [-90, 30, 150].map((a) => `M${cx} ${hub} l${(10 * Math.cos((a * Math.PI) / 180)).toFixed(1)} ${(10 * Math.sin((a * Math.PI) / 180)).toFixed(1)}`).join(' ')
    return { sil, lines, extra: `M${cx} ${G - h} V${hub} ${blades}` }
  },
  // a tapering tower with chamfered shoulders and a diamond lattice (diagrid) over its face
  diagrid(x, w, h) {
    const top = G - h
    const inset = w * 0.1 // each side leans in by this much over the straight part
    const shoulder = 16
    const sil = poly([[x, G], [x + inset, top + shoulder], [x + w * 0.3, top], [x + w * 0.7, top], [x + w - inset, top + shoulder], [x + w, G]])
    const yTop = top + shoulder
    const lean = (y) => (inset * (G - y)) / (G - yTop) // how far in the edges are at height y
    const gap = 28
    let lines = ''
    for (let y = G - 8; y - gap >= yTop; y -= gap) {
      // two crossing diagonals between the left and right edges, one row apart
      lines += `M${x + lean(y)} ${y} L${x + w - lean(y - gap)} ${y - gap} M${x + w - lean(y)} ${y} L${x + lean(y - gap)} ${y - gap} `
    }
    return { sil, lines, extra: '' }
  },
  // geodesic dome: meridians and a latitude arc
  dome(x, w) {
    const r = w / 2
    const cx = x + r
    const sil = `M${x} ${G} A${r} ${r} 0 0 1 ${x + w} ${G} Z`
    const lines = `M${cx - r * 0.4} ${G} A${r * 0.4} ${r} 0 0 1 ${cx + r * 0.4} ${G} M${cx - r * 0.75} ${G} A${r * 0.75} ${r} 0 0 1 ${cx + r * 0.75} ${G} M${x + r * 0.16} ${G - r * 0.55} Q${cx} ${G - r * 0.7} ${x + w - r * 0.16} ${G - r * 0.55}`
    return { sil, lines, extra: '' }
  },
}

// the near row, left to right: [type, width, height]; gaps are 3, except 18 where a sky bridge crosses
const NEAR = [
  ['dome', 68, 34], ['cyl', 40, 100], ['facet', 46, 145], ['needle', 34, 205], ['zig', 62, 130], ['diagrid', 40, 182],
  ['cyl', 46, 120], ['facet', 52, 188], ['needle', 40, 262], ['diagrid', 42, 210], ['zig', 56, 152], ['facet', 50, 235],
]
export const TALLEST = 8
export const BRIDGES = [[3, 100], [7, 150], [8, 178]] // between tower i and i+1, at this height above the ground
const WIDE_GAP_AFTER = new Set(BRIDGES.map(([i]) => i))

// the far row: faint, taller, thin: [type, width, height, x]
export const FAR = [['needle', 26, 190, 60], ['facet', 36, 235, 150], ['needle', 28, 262, 235], ['cyl', 34, 215, 330], ['facet', 38, 250, 420], ['needle', 28, 225, 500], ['facet', 34, 200, 590]]

function layout() {
  let x = 0
  return NEAR.map(([type, w, h], i) => {
    const t = { type, x, w, h, ...TOWERS[type](x, w, h) }
    x += w + (WIDE_GAP_AFTER.has(i) ? 18 : 3)
    return t
  })
}
export const TOWER_LIST = layout()

// Sky bridges: two parallel lines (a tube) between tower i and tower i + 1. The towers narrow and step in, so each line runs
// from the actual right-hand edge of the left tower to the actual left-hand edge of the right one at its own height.
const polygonOf = (sil) => {
  const nums = (sil.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)
  return Array.from({ length: nums.length / 2 }, (_, k) => [nums[2 * k], nums[2 * k + 1]])
}
/** The x where the horizontal line at height y crosses the polygon's edges. */
const crossings = (pts, y) => {
  const xs = []
  for (let k = 0; k < pts.length; k++) {
    const [x1, y1] = pts[k]
    const [x2, y2] = pts[(k + 1) % pts.length]
    if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) xs.push(x1 + ((y - y1) * (x2 - x1)) / (y2 - y1))
  }
  return xs
}
/** [{ i, lines: [[x1, y, x2, y], [x1, y + 6, x2, y + 6]] }, ...] */
export const BRIDGE_LINES = BRIDGES.map(([i, hAbove]) => {
  const a = polygonOf(TOWER_LIST[i].sil)
  const b = polygonOf(TOWER_LIST[i + 1].sil)
  const lines = [0, 6].map((dy) => {
    const y = G - hAbove + dy
    return [Math.max(...crossings(a, y)) - 0.5, y, Math.min(...crossings(b, y)) + 0.5, y]
  })
  return { i, lines }
})

const tall = TOWER_LIST[TALLEST]
export const TALL_CX = tall.x + tall.w / 2
export const RING_Y = G - tall.h * 0.55 // the orbit ring around the tallest tower
export const RING_RX = 36
export const RING_RY = 9
export const TIP_Y = G - tall.h - 18 // the antenna's tip
/**
 * One of the signal arcs over the tallest tower's antenna: a wide, open sweep (about 104 degrees) centred above the tip, so the
 * rings read as a broadcast spreading out rather than a small icon.
 */
export const signalArc = (r) => {
  const cy = TIP_Y - 6
  const a0 = ((-90 - 52) * Math.PI) / 180
  const a1 = ((-90 + 52) * Math.PI) / 180
  return `M${(TALL_CX + r * Math.cos(a0)).toFixed(1)} ${(cy + r * Math.sin(a0)).toFixed(1)} A${r} ${r} 0 0 1 ${(TALL_CX + r * Math.cos(a1)).toFixed(1)} ${(cy + r * Math.sin(a1)).toFixed(1)}`
}
export const SIGNAL_RADII = [10, 18, 27, 37]

export const DRONES = [[tall.x - 120, 64], [tall.x + 140, 42], [tall.x - 262, 104]]
const ell = (cx, cy, rx, ry) => `M${cx - rx} ${cy} a${rx} ${ry} 0 1 0 ${2 * rx} 0 a${rx} ${ry} 0 1 0 ${-2 * rx} 0`
/** A drone: a rounded body, four arms to four rotor discs (the far ones raised a little for depth), a camera and two legs. */
export const dronePath = (x, y, k = 0.95) => {
  const X = (d) => x + d * k
  const Y = (d) => y + d * k
  return [
    ell(x, y, 6 * k, 3 * k),
    `M${X(-5)} ${Y(-1)} L${X(-18)} ${Y(-6)} M${X(5)} ${Y(-1)} L${X(18)} ${Y(-6)} M${X(-5)} ${Y(1)} L${X(-19)} ${Y(6)} M${X(5)} ${Y(1)} L${X(19)} ${Y(6)}`,
    ell(X(-18), Y(-7), 8 * k, 2.2 * k), ell(X(18), Y(-7), 8 * k, 2.2 * k), ell(X(-19), Y(5), 8 * k, 2.2 * k), ell(X(19), Y(5), 8 * k, 2.2 * k),
    `M${x} ${Y(3)} V${Y(7)} ${ell(x, Y(10), 2 * k, 2 * k)}`,
    `M${X(-4)} ${Y(3)} L${X(-9)} ${Y(10)} M${X(4)} ${Y(3)} L${X(9)} ${Y(10)}`,
  ].join(' ')
}
export const POLES = Array.from({ length: 11 }, (_, i) => 24 + i * 60)
/** A smart pole: a pole with a square sensor head. */
export const polePath = (x) => `M${x} ${G} V${G - 20} h5 v-5 h-5`
