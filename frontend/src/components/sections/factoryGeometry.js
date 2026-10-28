// The Industry 4.0 page headers' picture - a smart factory: a robot arm over a conveyor, a train of meshing gears, a scanner arch,
// a factory with chimneys, a cloud and a dashboard that talk to the machines - as plain geometry (SVG path strings) for the
// line-art version (FactoryDecor.jsx). Coordinates: a 660 x 360 viewBox, anchored to the bottom right of the band; fixed
// values, so it is the same on every load.

export const W = 660
export const H = 360
export const G = 334 // the factory floor
export const BELT = 302 // the top of the conveyor belt

const f = (n) => Number(n.toFixed(1))
const rad = (deg) => (deg * Math.PI) / 180
const pt = (cx, cy, r, deg) => [cx + r * Math.cos(rad(deg)), cy + r * Math.sin(rad(deg))]

export const circ = (cx, cy, r) => `M${f(cx - r)} ${f(cy)} a${r} ${r} 0 1 0 ${f(2 * r)} 0 a${r} ${r} 0 1 0 ${f(-2 * r)} 0 `

/** A rounded rectangle outline. */
export const roundRect = (x, y, w, h, r) =>
  `M${x + r} ${y} H${x + w - r} a${r} ${r} 0 0 1 ${r} ${r} V${y + h - r} a${r} ${r} 0 0 1 ${-r} ${r} H${x + r} a${r} ${r} 0 0 1 ${-r} ${-r} V${y + r} a${r} ${r} 0 0 1 ${r} ${-r} Z `

/**
 * A gear's toothed outline: `n` teeth (an even number, so the shape is point-symmetric and turns about its own centre), tooth
 * centres at `phase + k * 360 / n` degrees, tips at radius `Ro`, roots at `Rr`.
 */
export function gearOutline(cx, cy, Ro, Rr, n, phase) {
  const pitch = 360 / n
  const wt = pitch * 0.17 // half the tooth's width at the tip, in degrees
  const wr = pitch * 0.3 // and at the root
  let d = ''
  for (let k = 0; k < n; k++) {
    const a = phase + k * pitch
    const [r1x, r1y] = pt(cx, cy, Rr, a - wr)
    const [t1x, t1y] = pt(cx, cy, Ro, a - wt)
    const [t2x, t2y] = pt(cx, cy, Ro, a + wt)
    const [r2x, r2y] = pt(cx, cy, Rr, a + wr)
    d += `${k === 0 ? 'M' : `A${Rr} ${Rr} 0 0 1 `}${f(r1x)} ${f(r1y)} L${f(t1x)} ${f(t1y)} A${Ro} ${Ro} 0 0 1 ${f(t2x)} ${f(t2y)} L${f(r2x)} ${f(r2y)} `
  }
  const [sx, sy] = pt(cx, cy, Rr, phase - wr)
  return `${d}A${Rr} ${Rr} 0 0 1 ${f(sx)} ${f(sy)} Z`
}

/** A gear's inside: a rim ring, the hub, its hole and the spokes between hub and rim. */
function gearInside(cx, cy, Rr, spokes, phase) {
  const rim = Rr * 0.72
  const hub = Rr * 0.3
  let d = circ(cx, cy, rim) + circ(cx, cy, hub) + circ(cx, cy, Math.max(1.5, hub * 0.4))
  for (let i = 0; i < spokes; i++) {
    const a = phase + (i * 360) / spokes
    const [x1, y1] = pt(cx, cy, hub, a)
    const [x2, y2] = pt(cx, cy, rim, a)
    d += `M${f(x1)} ${f(y1)} L${f(x2)} ${f(y2)} `
  }
  return d
}

/**
 * A gear: its centre, outline, inside and `n` (its turning speed is set by the teeth: a gear turns at 1/n of a tooth's rate).
 * `at` places one that meshes with `parent` in direction `dir` (degrees, from the parent's centre): the centres sit one pitch
 * radius of each apart and the child has a gap where the parent has a tooth, so the pair turns - in opposite directions, at
 * speeds in inverse proportion to their teeth - without ever clashing, as long as the parent has a tooth at `dir`.
 */
function makeGear(cx, cy, Ro, Rr, n, phase, spokes) {
  return { cx, cy, Ro, Rr, n, phase, teeth: gearOutline(cx, cy, Ro, Rr, n, phase), inside: gearInside(cx, cy, Rr, spokes, phase) }
}
const gear = (cx, cy, Ro, Rr, n, phase, spokes = 5) => makeGear(cx, cy, Ro, Rr, n, phase, spokes)
function meshed(parent, dir, Ro, Rr, n, spokes = 5) {
  const dist = (parent.Ro + parent.Rr) / 2 + (Ro + Rr) / 2
  const [cx, cy] = pt(parent.cx, parent.cy, dist, dir)
  return makeGear(cx, cy, Ro, Rr, n, dir + 180 + 180 / n, spokes)
}

// the gear train, top centre-right: B and C turn against A. A's tooth centres are at 2.5 + k * 22.5 degrees, which puts teeth at
// both mesh directions (205 and 340).
const A_GEAR = gear(480, 104, 40, 33, 16, 2.5, 6)
export const GEARS = [
  { ...A_GEAR, seconds: 36, reverse: false },
  { ...meshed(A_GEAR, 205, 26, 20, 10, 5), seconds: (36 * 10) / 16, reverse: true },
  { ...meshed(A_GEAR, 340, 30, 23, 12, 5), seconds: (36 * 12) / 16, reverse: true },
]

/** A capsule (a stadium) from (x1, y1) to (x2, y2), `r` either side: one arm segment. */
export function link(x1, y1, x2, y2, r) {
  const len = Math.hypot(x2 - x1, y2 - y1)
  const nx = (-(y2 - y1) / len) * r
  const ny = ((x2 - x1) / len) * r
  return (
    `M${f(x1 + nx)} ${f(y1 + ny)} L${f(x2 + nx)} ${f(y2 + ny)} A${r} ${r} 0 0 0 ${f(x2 - nx)} ${f(y2 - ny)} ` +
    `L${f(x1 - nx)} ${f(y1 - ny)} A${r} ${r} 0 0 0 ${f(x1 + nx)} ${f(y1 + ny)} Z`
  )
}

// the robot arm, in its pose at rest: the shoulder S, the elbow E, the wrist WR and a gripper that hangs over the conveyor.
// FactoryDecor swings the upper arm about S and the forearm about E.
const S = [596, 284]
const E = [532, 196]
const WR = [462, 232]
export const ARM = {
  S,
  E,
  WR,
  base: `M566 ${G} V326 H626 V${G} M580 326 L584 296 H608 L612 326`,
  shoulder: circ(S[0], S[1], 15),
  shoulderRing: circ(S[0], S[1], 5.5),
  upper: link(S[0], S[1], E[0], E[1], 11),
  elbow: circ(E[0], E[1], 4.5),
  fore: link(E[0], E[1], WR[0], WR[1], 8),
  wrist: circ(WR[0], WR[1], 3.5),
  hand: `M${WR[0]} ${WR[1] + 8} V252 M450 252 H474 M452 252 V268 L457 275 M472 252 V268 L467 275`,
}

// the conveyor: a belt on legs from the left edge to just short of the arm, with crates riding it
export const BELT_X0 = 4
export const BELT_X1 = 548
export const BELT_PATH = `${roundRect(BELT_X0, BELT, BELT_X1 - BELT_X0, 11, 5.5)}M${BELT_X0 + 14} ${BELT + 5.5} H${BELT_X1 - 14}`
export const BELT_LEGS = [50, 180, 410, 520].map((x) => `M${x} ${BELT + 11} V${G} M${x - 8} ${G} H${x + 8}`).join(' ')
export const CRATE_W = 30
export const CRATE_H = 24
export const CRATE_STEP = 96 // the crates' spacing, and how far each one travels in a cycle
export const CRATE_XS = [20, 116, 212, 308, 404]
export const crate = (x) => `M${x} ${BELT - CRATE_H} h${CRATE_W} v${CRATE_H} h${-CRATE_W} Z M${x} ${BELT - CRATE_H + 7} h${CRATE_W} M${x + CRATE_W / 2} ${BELT - CRATE_H} v7`

// the scanner arch over the belt, with the camera in it and its scanning beam
export const SCANNER = {
  arch: `M296 ${BELT} V248 Q296 236 308 236 H344 Q356 236 356 248 V${BELT} M304 ${BELT} V250 Q304 244 310 244 H342 Q348 244 348 250 V${BELT}`,
  camera: 'M318 244 V252 H334 V244',
  lens: circ(326, 257, 3),
  beam: `M326 260 L304 ${BELT - 3} M326 260 L348 ${BELT - 3}`,
}

// the factory behind the belt, at the left: a sawtooth roof, two chimneys, a row of windows (all drawn faint)
export const FACTORY = {
  body: 'M6 334 V226 L73 196 V226 L140 196 V226 L207 196 V334',
  chimneys: 'M38 214 V150 H52 V207 M34 150 H56 M104 214 V140 H118 V206 M100 140 H122',
  windows: [18, 49, 80, 111, 142, 173].map((x) => roundRect(x, 240, 20, 16, 2)).join(''),
  smoke: [[45, 144], [111, 134]], // where the smoke rises from
}

/** A cloud outline, centred at (cx, cy). */
export const cloud = (cx, cy) =>
  `M${cx - 42} ${cy + 16} H${cx + 36} A14 14 0 0 0 ${cx + 36} ${cy - 12} A17 17 0 0 0 ${cx + 10} ${cy - 27} A22 22 0 0 0 ${cx - 28} ${cy - 16} A20 20 0 0 0 ${cx - 42} ${cy + 16} Z`
export const CLOUD = { cx: 196, cy: 78 }
export const CLOUD_GEAR = gear(CLOUD.cx - 2, CLOUD.cy + 1, 9, 7.2, 8, 0, 4)

/** The dashboard card: a window with three dots, a bar chart and a trend line over it. */
export function dashboard(x, y, w, h) {
  const base = y + h - 8
  const heights = [12, 20, 15, 26, 19]
  const bars = heights.map((bh, i) => `M${x + 12 + i * 13} ${base} v${-bh} h8 v${bh}`).join(' ')
  const tops = heights.map((bh, i) => [x + 16 + i * 13, base - bh - 6])
  const trend = `M${tops.map(([tx, ty]) => `${tx} ${ty}`).join(' L')}`
  return {
    frame: roundRect(x, y, w, h, 6) + `M${x} ${y + 12} H${x + w}`,
    dots: circ(x + 8, y + 6, 1.4) + circ(x + 14, y + 6, 1.4) + circ(x + 20, y + 6, 1.4),
    bars,
    // the bars as single columns for the particle version: [x, bottom, top]
    barCols: heights.map((bh, i) => [x + 16 + i * 13, base, base - bh]),
    trend,
    last: tops[tops.length - 1],
    gauge: circ(x + w - 17, base - 12, 9) + `M${x + w - 17} ${base - 12} L${x + w - 11} ${base - 17}`,
  }
}
export const DASHBOARD = dashboard(6, 44, 100, 70)

// the cloud's data lines to the machines: each ends in a small node. `from` is inside the cloud (the line art hides that part
// behind the cloud's fill); `edge` is where the particle version starts the line, on the cloud's lower edge.
export const DATA_LINES = [
  { from: [184, 90], edge: [188, 96], to: [111, 134] },
  { from: [204, 92], edge: [208, 98], to: [326, 236] },
  { from: [226, 74], edge: [240, 86], to: [532, 196] },
  { from: [106, 80], edge: [110, 80], to: [152, 80] },
].map((l) => ({ ...l, d: `M${l.from[0]} ${l.from[1]} L${l.to[0]} ${l.to[1]}` }))
