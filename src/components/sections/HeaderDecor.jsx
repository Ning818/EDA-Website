import { useEffect, useRef } from 'react'

// Decoration for the page-header band (on top of the shared dot grid, HeaderDots.jsx): a PCB-style circuit
// entering from the right edge and reaching well into the band, made of flat (2D) particles in the VLSI-CAD theme colours
// (the teal of its chip board, the amber of its hand) - the same particle look as the home page's clouds.
//   - a partial IC (U1: pin stubs on every edge, a status LED) whose pins fan out into an upper bus that ends in a connector
//     (J1) and a lower bus that ends in a small QFN (U2) inside a dashed courtyard; all lines of a bus bend together at 45
//     degrees so the spacing holds; U2 and J1 each send lines on towards the left, one of them a length-matching serpentine;
//   - a differential pair that ends in a crystal (Y1), a thick power line (amber) with an inductor (L1) and a T-junction down
//     to a ground symbol, SMD resistors and a capacitor sitting on lines, short stubs off U1's top and bottom edges, a row of
//     stitching vias, fiducial marks, net labels and silkscreen text.
// How it plays: every trace is a stream of particles that leave the IC's pin and fly out along the line to settle at their
// place, so the line grows outwards from the chip; the parts (IC outline, connector, pads, ...) gather in from scattered
// positions as their line reaches them. Afterwards the particles twinkle very slightly, amber signal pulses (a bright head with
// a short tail) keep running along some traces, and the status LED blinks. With reduced motion it is just the finished picture.
// Two variants of the same circuit, for the two VLSI-CAD pages: `projects` (Funded Projects) puts the amber accent on the
// power line (with its inductor, the junction and its pad) and keeps the plain net labels; `research` puts it on the
// upper bus and the J1 connector, runs the signal pulses along other routes, and renames the bus labels after the page's
// research topics (logic synthesis, placement, routing, power, thermal, aging, graphene).
// Coordinates: a 1100 x 460 viewBox anchored to the right edge. The canvas' width is capped so that, on narrower desktop
// windows, the left end of the circuit stays clear of the title / numbers on the left (~560px of the window).

const TEAL = '#3fb0b8' // VLSICADParticles.jsx CHIP_COLOR
const AMBER = '#e0a94a' // VLSICADParticles.jsx HIGHLIGHT_COLOR
const MONO = 'ui-monospace, Menlo, Consolas, monospace'

// [d, end pad ('ring' | 'square' | 'small' | null)]; the order is the draw order. U1's pins sit on its left edge, x = 1000
// (top edge y = 130, bottom edge y = 350).
const TRACES = [
  // 0-3 upper bus: bends up together at x=910, ends at J1 (x=710)
  ['M1000 150 H910 L850 90 H710', null],
  ['M1000 170 H910 L850 110 H710', null],
  ['M1000 190 H910 L850 130 H710', null],
  ['M1000 210 H910 L850 150 H710', null],
  // 4-5 differential pair, ends at the crystal Y1 (x=570)
  ['M1000 226 H700 L680 206 H570', null],
  ['M1000 234 H700 L680 214 H570', null],
  // 6 power line (amber), with the inductor L1 on it
  ['M1000 254 H660 L640 274 H520', 'ring'],
  // 7-10 lower bus: bends down together at x=930, ends at U2 (x=750)
  ['M1000 280 H930 L910 300 H750', null],
  ['M1000 300 H930 L910 320 H750', null],
  ['M1000 320 H930 L910 340 H750', null],
  ['M1000 340 H930 L910 360 H750', null],
  // 11-12 out of U2's left side, on towards the text
  ['M690 310 H610 L590 330 H540', 'ring'],
  ['M690 340 H640 L620 360 H560', 'square'],
  // 13 branch off the power line down to a ground symbol
  ['M900 254 V286', null],
  // 14-15 out of J1's left side: a plain line and a length-matching serpentine
  ['M682 100 H620', 'square'],
  ['M682 142 H670 V150 H662 V134 H654 V150 H646 V134 H638 V150 H630 V142 H600', 'ring'],
  // 16-18 off U1's top edge, 19-21 off its bottom edge
  ['M1030 124 V104', 'small'],
  ['M1052 124 V96', 'small'],
  ['M1074 124 V104', 'small'],
  ['M1030 356 V368', 'small'],
  ['M1052 356 V374', 'small'],
  ['M1074 356 V368', 'small'],
]
const POWER = 6 // the amber trace
const END = {
  6: [520, 274], 11: [540, 330], 12: [560, 360], 14: [620, 100], 15: [600, 142],
  16: [1030, 104], 17: [1052, 96], 18: [1074, 104], 19: [1030, 368], 20: [1052, 374], 21: [1074, 368],
}

const PIN_YS = [150, 170, 190, 210, 226, 234, 254, 280, 300, 320, 340] // U1's left pins
const J1_PADS = [90, 110, 130, 150]
const RESISTORS = [[760, 106], [820, 316], [780, 250]] // 18 x 8 bodies
const CAPACITORS = [[780, 130]]
const VIAS = [[760, 190], [782, 190], [804, 190]]
const FIDUCIALS = [[560, 116], [960, 100]]
// net labels / silkscreen: [x, y, text]
const LABELS = [
  [722, 86, 'D0'], [722, 106, 'D1'], [722, 126, 'D2'], [722, 146, 'D3'],
  [582, 201, 'CLK'], [700, 248, 'VCC'], [908, 276, 'GND'],
  [772, 296, 'A0'], [772, 316, 'A1'], [772, 336, 'A2'], [772, 356, 'A3'],
  [1008, 122, 'U1'], [660, 90, 'J1'], [692, 273, 'U2'], [528, 193, 'Y1'], [566, 300, 'L1'],
]
// Which traces carry a travelling signal pulse: [trace index, seconds per run, reverse?]
const PULSES = [[0, 3.6], [5, 4.4], [6, 5.2], [8, 3.8], [11, 4.6], [2, 4.0, true], [15, 5.0], [9, 3.4, true]]

const VARIANTS = {
  projects: {
    hot: [POWER], // traces drawn in amber
    hotJ1: false,
    hotPower: true, // amber inductor, junction dot and end pad of the power line
    pulses: PULSES,
    rename: {},
  },
  research: {
    hot: [0, 1, 2, 3],
    hotJ1: true,
    hotPower: false,
    pulses: [[1, 3.2], [3, 3.9], [0, 4.4, true], [15, 4.8], [14, 3.6, true], [4, 4.6], [7, 3.8, true], [12, 4.2]],
    rename: { D0: 'LOGIC', D1: 'SYNTH', D2: 'PLACE', D3: 'ROUTE', A0: 'POWER', A1: 'THERM', A2: 'AGING', A3: 'GRAPH' },
  },
}

const VB_W = 1100
const VB_H = 460
const START = 0.3 // seconds before the first trace starts
const STEP = 0.08 // between traces
const at = (i) => START + i * STEP
const PARTS_AT = START + 1.4
const SPACING = 6.5 // between the particles of a line
const DENSE = 1.5 // spacing of the lookup points a stream particle slides along
const PULSE_BEGIN = 3
const INTRO_SECONDS = 6

// ---- geometry -> particles -------------------------------------------------------------------------------------------

const SVG_NS = 'http://www.w3.org/2000/svg'

/** Points along an SVG path every DENSE units (a flat [x, y, x, y, ...] array), plus its length. */
function densePath(d) {
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

// a small seeded random, so the particles are the same on every load
function rng(seed) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const linePts = (x1, y1, x2, y2, step) => {
  const n = Math.max(1, Math.round(Math.hypot(x2 - x1, y2 - y1) / step))
  return Array.from({ length: n + 1 }, (_, i) => [x1 + ((x2 - x1) * i) / n, y1 + ((y2 - y1) * i) / n])
}
const rectPts = (x, y, w, h, step) => {
  const pts = []
  for (const [a, b, c, d] of [[x, y, x + w, y], [x + w, y, x + w, y + h], [x + w, y + h, x, y + h], [x, y + h, x, y]]) {
    pts.push(...linePts(a, b, c, d, step).slice(0, -1))
  }
  return pts
}
const circlePts = (cx, cy, r, step) => {
  const n = Math.max(5, Math.round((2 * Math.PI * r) / step))
  return Array.from({ length: n }, (_, i) => [cx + r * Math.cos((2 * Math.PI * i) / n), cy + r * Math.sin((2 * Math.PI * i) / n)])
}

/** All the particles, the trace look-up tables, and the masks that hide a trace under a part. Built once. */
function build(v) {
  const rand = rng(7)
  const hot = new Set(v.hot)
  const particles = []
  const traces = TRACES.map(([d]) => densePath(d))

  // parts that sit on a line: the line's particles are left out under their bodies
  const masks = [
    ...RESISTORS.map(([x, y]) => [x - 1, y - 1, x + 19, y + 9]),
    ...CAPACITORS.map(([x, y]) => [x - 4, y - 9, x + 10, y + 9]),
    [556, 262, 616, 286], // the inductor
  ]
  const masked = (x, y) => masks.some(([x0, y0, x1, y1]) => x > x0 && x < x1 && y > y0 && y < y1)

  // trace streams
  traces.forEach((tr, i) => {
    const amber = hot.has(i)
    const delay = at(i)
    const add = (s) => {
      const k = Math.min(tr.n, Math.round(s / DENSE))
      if (masked(tr.pts[2 * k], tr.pts[2 * k + 1])) return
      particles.push({
        mode: 0, trace: i, s, rx: tr.pts[2 * k], ry: tr.pts[2 * k + 1], amber,
        r: (amber ? 2.5 : 1.9) + rand() * 0.6, a: 0.92,
        T: delay + 1.1 * (s / tr.length), D: 0.25 + s / 900, ph: rand() * 6.28,
      })
    }
    for (let s = 0; s < tr.length; s += SPACING) add(s)
    add(tr.length)
  })

  // parts: gather in from scattered positions
  const gather = (delay, pts, o = {}) => {
    for (const [x, y] of pts) {
      const ang = rand() * 6.28
      const dist = 16 + rand() * 40
      particles.push({
        mode: 1, rx: x, ry: y, amber: !!o.amber, r: (o.r ?? 1.9) + rand() * 0.6, a: o.a ?? 0.92,
        T: delay + rand() * 0.25, D: 0.7 + rand() * 0.5, ox: Math.cos(ang) * dist, oy: Math.sin(ang) * dist, ph: rand() * 6.28,
      })
    }
  }
  const padDelay = (i) => at(i) + 1.36
  const ring = (cx, cy, r, delay, o) => gather(delay, [...circlePts(cx, cy, r, 4), [cx, cy]], o)
  const square = (cx, cy, delay, o) => gather(delay, [...rectPts(cx - 4.5, cy - 4.5, 9, 9, 4.5), [cx, cy]], o)

  // U1: outline (with rounded corners), inner die, pin stubs
  gather(0.1, densePathPoints('M1100 130 H1006 Q1000 130 1000 136 V344 Q1000 350 1006 350 H1100', 5))
  gather(0.25, densePathPoints('M1100 152 H1024 V328 H1100', 7), { a: 0.5 })
  gather(START + 0.3, [
    ...PIN_YS.flatMap((y) => [[995, y], [998.5, y]]),
    ...[1030, 1052, 1074].flatMap((x) => [[x, 126], [x, 129], [x, 352], [x, 355]]),
  ])
  gather(PARTS_AT, [[1014, 141]], { r: 2.6 })
  // J1 connector, U2, Y1, L1
  gather(padDelay(3), [...rectPts(682, 78, 28, 84, SPACING)], { amber: v.hotJ1 })
  J1_PADS.forEach((y) => square(709.5, y, padDelay(3), { amber: v.hotJ1 }))
  gather(padDelay(10), rectPts(690, 290, 60, 80, SPACING))
  gather(padDelay(10), rectPts(702, 303, 36, 54, 7), { a: 0.5 })
  gather(padDelay(10), [[699, 299]], { r: 2.4 })
  gather(PARTS_AT, rectPts(676, 278, 88, 102, 4).filter((_, i) => Math.floor(i / 2) % 2 === 0), { a: 0.55 }) // dashed courtyard
  gather(padDelay(5), rectPts(524, 198, 44, 24, SPACING))
  gather(padDelay(5), [...rectPts(557, 203, 6, 6, 3), ...rectPts(557, 211, 6, 6, 3)])
  gather(at(6) + 1.12, densePathPoints('M556 274 a10 10 0 0 1 20 0 a10 10 0 0 1 20 0 a10 10 0 0 1 20 0', 4.5), { amber: v.hotPower })
  // resistors, capacitor, ground symbol, vias
  RESISTORS.forEach(([x, y], i) => gather(at(i * 3 + 1) + 1.12, rectPts(x, y, 18, 8, 4.5)))
  CAPACITORS.forEach(([x, y]) => gather(at(2) + 1.12, [...linePts(x - 1, y - 8, x - 1, y + 8, 4), ...linePts(x + 7, y - 8, x + 7, y + 8, 4)]))
  gather(padDelay(13), [...linePts(893, 288, 907, 288, 3.5), ...linePts(896, 291.5, 904, 291.5, 3.5), ...linePts(899, 295, 901, 295, 2)])
  gather(padDelay(13), [[900, 254]], { r: 2.6, amber: v.hotPower }) // the T-junction
  VIAS.forEach(([x, y], i) => ring(x, y, 3.4, START + 1.2 + i * 0.12))
  // pads at the free line ends
  TRACES.forEach(([, pad], i) => {
    if (!pad) return
    const [x, y] = END[i]
    const o = { amber: v.hotPower && i === POWER }
    if (pad === 'square') square(x, y, padDelay(i), o)
    else ring(x, y, pad === 'small' ? 3.4 : 5, padDelay(i), o)
  })
  // fiducial marks
  FIDUCIALS.forEach(([x, y]) => {
    gather(PARTS_AT, [...circlePts(x, y, 6, 4), [x, y], ...linePts(x - 10, y, x - 7, y, 3), ...linePts(x + 7, y, x + 10, y, 3), ...linePts(x, y - 10, x, y - 7, 3), ...linePts(x, y + 7, x, y + 10, 3)], { a: 0.55 })
  })

  return { particles, traces }
}

/** Points along a path every `step` units (from the dense look-up). */
function densePathPoints(d, step) {
  const { length, n, pts } = densePath(d)
  const out = []
  for (let s = 0; s <= length; s += step) {
    const k = Math.min(n, Math.round(s / DENSE))
    out.push([pts[2 * k], pts[2 * k + 1]])
  }
  return out
}

// ---- drawing ---------------------------------------------------------------------------------------------------------

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

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
const easeOut = (u) => 1 - (1 - u) ** 3

export default function HeaderDecor({ variant = 'projects' }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const v = VARIANTS[variant] ?? VARIANTS.projects
    const { particles, traces } = build(v)
    const labels = LABELS.map(([x, y, text]) => [x, y, v.rename[text] ?? text])
    const dots = [dotSprite(TEAL), dotSprite(AMBER)]
    const glow = glowSprite(AMBER)

    let view = { w: 0, h: 0, sc: 1, tx: 0, ty: 0, dpr: 1 }
    const resize = () => {
      const r = canvas.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.max(1, Math.round(r.width * dpr))
      canvas.height = Math.max(1, Math.round(r.height * dpr))
      // like preserveAspectRatio "xMaxYMid slice", but a tall band does not blow the circuit up: the height-driven scale is capped
      const sc = Math.max(r.width / VB_W, Math.min(r.height / VB_H, 0.77))
      view = { w: r.width, h: r.height, sc, tx: r.width - VB_W * sc, ty: (r.height - VB_H * sc) / 2, dpr }
    }

    const sprite = (img, x, y, r, a) => {
      ctx.globalAlpha = a
      ctx.drawImage(img, x - r, y - r, 2 * r, 2 * r)
    }
    const pointOn = (tr, s) => {
      const k = Math.max(0, Math.min(tr.n, Math.round(s / DENSE)))
      return [tr.pts[2 * k], tr.pts[2 * k + 1]]
    }

    const draw = (t) => {
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const { sc, tx, ty, dpr } = view
      ctx.setTransform(dpr * sc, 0, 0, dpr * sc, dpr * tx, dpr * ty)

      // the particles
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
        const twinkle = u >= 1 && !reduceMotion ? 0.86 + 0.14 * Math.sin(t * 1.3 + p.ph) : 1
        sprite(dots[p.amber ? 1 : 0], x, y, p.r * (0.5 + 0.5 * clamp01(u * 4)), p.a * clamp01(u * 4) * twinkle)
      }

      // silkscreen text
      const textA = 0.6 * clamp01((t - PARTS_AT) / 0.6)
      if (textA > 0) {
        ctx.globalAlpha = textA
        ctx.fillStyle = TEAL
        ctx.font = `8px ${MONO}`
        for (const [x, y, text] of labels) ctx.fillText(text, x, y)
      }

      // status LED, signal pulses
      if (t > PARTS_AT) {
        const led = reduceMotion ? 1 : 0.6 + 0.4 * Math.sin((t - 2) * ((2 * Math.PI) / 2.6))
        sprite(glow, 1086, 141, 9, 0.5 * led)
        sprite(dots[1], 1086, 141, 2.8, 0.95 * led)
      }
      if (!reduceMotion) {
        v.pulses.forEach(([ti, dur, reverse], k) => {
          const tt = t - (PULSE_BEGIN + k * 0.7)
          if (tt < 0) return
          const phase = (tt % dur) / dur // 0..1 over a run; it travels during the first 60% of it
          const prog = clamp01(phase / 0.6)
          if (phase > 0.62) return
          const fade = Math.min(1, phase / 0.05) * (phase > 0.55 ? clamp01((0.62 - phase) / 0.07) : 1)
          const tr = traces[ti]
          const head = reverse ? tr.length * (1 - prog) : tr.length * prog
          for (let j = 6; j >= 0; j--) {
            const s = head - (reverse ? -1 : 1) * j * 5
            if (s < 0 || s > tr.length) continue
            const [x, y] = pointOn(tr, s)
            sprite(dots[1], x, y, 2.6 - j * 0.28, 0.95 * fade * (1 - j / 7))
          }
          const [hx, hy] = pointOn(tr, head)
          sprite(glow, hx, hy, 8, 0.45 * fade)
        })
      }
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
      // full rate while it assembles, 30 fps once it only twinkles and carries pulses
      if (t < INTRO_SECONDS || now - last >= 32) {
        draw(t)
        last = now
      }
      raf = visible ? requestAnimationFrame(frame) : 0
    }
    if (reduceMotion) {
      draw(60)
    } else {
      raf = requestAnimationFrame(frame)
    }

    const ro = new ResizeObserver(() => {
      resize()
      if (reduceMotion) draw(60)
    })
    ro.observe(canvas)
    // no drawing while the band is scrolled out of view
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
  }, [variant])

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <canvas
        ref={canvasRef}
        className="absolute inset-y-0 right-0 h-full w-[min(1250px,calc((100vw_-_560px)_*_1.9))] max-md:w-full max-md:opacity-35 [mask-image:linear-gradient(to_left,black_50%,transparent_100%)] max-md:[mask-image:linear-gradient(to_left,black_15%,transparent_75%)]"
      />
    </div>
  )
}
