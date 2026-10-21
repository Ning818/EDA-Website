// A small still picture of flat particles for the bottom of the Research pages' project wall (ProjectWall.jsx), one per theme and drawn here
// from scratch - it is not the page headers' artwork: a circuit board's traces (VLSI-CAD), a tilted double helix (Bioinformatics), a dot-matrix
// skyline (Smart City), gears over a conveyor (Industry 4.0). Everything is a dot in the page's colour, with a few amber accents; the skeleton of each picture (traces, strands, outlines, gear rims) is fully
// opaque, the filling (windows, rungs, the chip, the boxes) fainter.

const W = 400
const H = 170
const AMBER = '#e0a94a'

/** Points `step` apart along a polyline. */
function along(pts, step) {
  const out = []
  let carry = 0
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]
    const [x1, y1] = pts[i]
    const len = Math.hypot(x1 - x0, y1 - y0)
    let d = carry
    for (; d <= len; d += step) out.push([x0 + ((x1 - x0) * d) / len, y0 + ((y1 - y0) * d) / len])
    carry = d - len
  }
  return out
}

const ring = (cx, cy, r, step) => {
  const n = Math.max(6, Math.round((2 * Math.PI * r) / step))
  return Array.from({ length: n }, (_, i) => [cx + r * Math.cos((2 * Math.PI * i) / n), cy + r * Math.sin((2 * Math.PI * i) / n)])
}

function circuit() {
  const dots = []
  const traces = [
    [[0, 150], [110, 150], [130, 130], [250, 130], [270, 110], [400, 110]],
    [[0, 118], [70, 118], [90, 98], [190, 98], [210, 78], [310, 78], [330, 58], [400, 58]],
    [[40, 170], [40, 140], [60, 120]],
    [[160, 170], [160, 152], [180, 132]],
    [[290, 170], [290, 142], [310, 122], [360, 122], [380, 102]],
    [[130, 98], [130, 60], [150, 40], [230, 40]],
  ]
  traces.forEach((t) => along(t, 6).forEach(([x, y]) => dots.push({ x, y, r: 1.4, o: 1 })))
  // pads at the ends of the traces, a via in the middle of some
  ;[[0, 150], [400, 110], [0, 118], [400, 58], [60, 120], [180, 132], [380, 102], [230, 40]].forEach(([x, y]) => {
    ring(x, y, 5, 3.4).forEach(([px, py]) => dots.push({ x: px, y: py, r: 1.2, o: 1 }))
    dots.push({ x, y, r: 2.2, o: 1, accent: true })
  })
  // a chip: a block of dots with its pins
  for (let x = 330; x <= 372; x += 6) for (let y = 14; y <= 44; y += 6) dots.push({ x, y, r: 1.2, o: 0.35 })
  for (let k = 0; k < 6; k++) {
    dots.push({ x: 326, y: 16 + k * 6, r: 1.6, o: 1 })
    dots.push({ x: 376, y: 16 + k * 6, r: 1.6, o: 1 })
  }
  return dots
}

function helix() {
  const dots = []
  const amp = 34
  const k = (2 * Math.PI) / 140
  // the helix is laid out along a straight axis and then tilted, so it climbs from the bottom left to the top right
  const tilt = (-30 * Math.PI) / 180
  const put = (u, v, d) => {
    const x = 200 + u * Math.cos(tilt) - v * Math.sin(tilt)
    const y = 98 + u * Math.sin(tilt) + v * Math.cos(tilt)
    if (x > -4 && x < W + 4 && y > -4 && y < H + 4) dots.push({ x, y, ...d })
  }
  for (let u = -280; u <= 280; u += 5) {
    ;[0, Math.PI].forEach((ph, s) => {
      const depth = Math.cos(k * u + ph) // -1 .. 1: which strand is in front
      put(u, amp * Math.sin(k * u + ph), { r: 1.6 + 0.7 * depth, o: 1, accent: s === 1 && Math.abs(u % 70) < 2.5 })
    })
  }
  // base-pair rungs
  for (let u = -277; u <= 280; u += 14) {
    const a = amp * Math.sin(k * u)
    if (Math.abs(a) < 7) continue
    const n = Math.max(2, Math.round((2 * Math.abs(a)) / 7))
    for (let i = 1; i < n; i++) put(u, a - (2 * a * i) / n, { r: 1.1, o: 0.4, accent: i === Math.floor(n / 2) && Math.abs((u + 277) % 56) < 1 })
  }
  return dots
}

function skyline() {
  const dots = []
  const base = 160
  const towers = [[8, 36, 62], [50, 28, 98], [84, 40, 76], [130, 30, 128], [166, 44, 92], [216, 28, 60], [250, 38, 112], [294, 32, 82], [332, 28, 142], [366, 30, 70]]
  towers.forEach(([x0, w, h], t) => {
    // the outline's top edge and sides brighter, the windows a dim dot grid
    for (let y = base; y >= base - h; y -= 7) {
      for (let x = x0; x <= x0 + w; x += 7) {
        const edge = x === x0 || y <= base - h + 3.5
        dots.push({ x, y, r: edge ? 1.5 : 1.1, o: edge ? 1 : 0.3, accent: !edge && (x * 3 + y * 5 + t) % 29 === 0 })
      }
    }
  })
  along([[0, base + 5], [W, base + 5]], 6).forEach(([x, y]) => dots.push({ x, y, r: 1.3, o: 1 }))
  return dots
}

function factory() {
  const dots = []
  const gear = (cx, cy, r, teeth) => {
    ring(cx, cy, r, 4.6).forEach(([x, y]) => dots.push({ x, y, r: 1.4, o: 1 }))
    ring(cx, cy, r * 0.42, 4.2).forEach(([x, y]) => dots.push({ x, y, r: 1.2, o: 0.5 }))
    for (let i = 0; i < teeth; i++) {
      const a = (2 * Math.PI * i) / teeth
      for (let d = 5; d <= 12; d += 3.5) dots.push({ x: cx + (r + d) * Math.cos(a), y: cy + (r + d) * Math.sin(a), r: 1.5 - d * 0.03, o: 1 })
    }
    dots.push({ x: cx, y: cy, r: 2.4, o: 1, accent: true })
  }
  gear(96, 100, 34, 10)
  gear(168, 62, 22, 8)
  gear(300, 92, 30, 9)
  // the conveyor: its belt, and the boxes riding on it
  along([[0, 154], [W, 154]], 5).forEach(([x, y]) => dots.push({ x, y, r: 1.4, o: 1 }))
  along([[0, 163], [W, 163]], 12).forEach(([x, y]) => dots.push({ x, y, r: 1.8, o: 0.55 }))
  ;[[24, 26], [236, 30], [350, 24]].forEach(([x0, w], b) => {
    for (let x = x0; x <= x0 + w; x += 4.5) for (let y = 154 - 18; y <= 150; y += 4.5) dots.push({ x, y, r: 1.1, o: 0.55, accent: b === 1 && x === x0 })
  })
  return dots
}

const PICTURES = { 'vlsi-cad': circuit, bioinformatics: helix, 'smart-city': skyline, 'industry-4-0': factory }

/** `theme`: a theme's slug (themes.js); `color`: the theme's colour. Stands on the bottom edge of its box and fades out upwards. */
export default function WallParticles({ theme, color }) {
  const dots = PICTURES[theme]?.() ?? []
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-auto w-full [mask-image:linear-gradient(to_top,black_75%,transparent)]"
    >
      {dots.map((d, i) => (
        <circle key={i} cx={d.x.toFixed(1)} cy={d.y.toFixed(1)} r={d.r} fill={d.accent ? AMBER : color} fillOpacity={d.o} />
      ))}
    </svg>
  )
}
