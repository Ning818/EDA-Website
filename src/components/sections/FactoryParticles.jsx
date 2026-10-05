import { useEffect, useRef } from 'react'
import { DENSE, clamp01, compose, densePath, linePts, pathPoints, rng, rotateAbout, startFlatParticles, translate, IDENTITY } from './flatParticles'
import {
  W, H, G, BELT, GEARS, ARM, BELT_X0, BELT_X1, BELT_LEGS, CRATE_XS, CRATE_STEP, crate, SCANNER, FACTORY, CLOUD, CLOUD_GEAR, cloud, DASHBOARD, DATA_LINES,
} from './factoryGeometry'

// The Industry 4.0 page headers' smart factory (the line-art picture in FactoryDecor.jsx) made of flat particles, like the home
// page's robot-arm cloud: everything in the theme's indigo and the robot arm in the amber that cloud gives its bright arm. The
// floor, the belt and the factory are streams of particles that run in from the right and settle along their line; the
// gears, the arm, the crates, the scanner, the cloud and the dashboard gather in from scattered positions - the picture
// building up from the right to the left. Afterwards it works, every moving thing as a whole (the particles keep their places
// on it): the three gears turn against each other, the arm swings at the shoulder and the elbow, crates ride the belt (the
// first fades in at the left end, the last fades out under the gripper), the scanner's beam flickers, smoke rings rise from
// the chimneys, amber pulses run along the data lines from the cloud to the machines, and the cloud and the card drift. With
// reduced motion it is just the finished picture. The engine is flatParticles.js; the geometry factoryGeometry.js.

const AMBER = '#e0a94a' // IndustryArmParticles.jsx HIGHLIGHT_COLOR
const SPACING = 6.2 // between the particles of a line
const RUN = 3.2 // seconds after which the machines start to move (the picture is built by then)
const CRATES_RUN = 4.4 // the conveyor starts a little later: its left end is the last part to be built
const CRATE_SECONDS = 8 // a crate takes this long to ride one crate spacing

const TAU = Math.PI * 2
const ramp = (t, t0) => clamp01((t - t0) / 1.5) // eases a motion's amplitude in from t0
const swing = (t, seconds) => 0.5 - 0.5 * Math.cos((TAU * t) / seconds) // 0 -> 1 -> 0, once per period

/** When something centred at x starts to gather: the right-most first, the left-most last. */
const at = (cx, extra = 0) => 0.2 + ((W - cx) / W) * 2.2 + extra

/** A gentle drift of an object about its centre: up and down by `amp`, with a slight turn. */
const floating = (cx, cy, amp, turn, seconds, ph) => (t) => {
  const e = ramp(t, RUN)
  const s = Math.sin((TAU * t) / seconds + ph)
  return compose(translate(0, amp * s * e), rotateAbout(cx, cy, turn * s * e))
}

function build() {
  const rand = rng(11)
  const particles = []
  const traces = []
  const motions = []
  const motion = (fn) => motions.push(fn) - 1

  /** A stream along a path: its particles leave the path's start and settle along it. */
  const stream = (d, { delay, c = 0, a = 0.92, r0 = 2.0, filter }) => {
    const tr = densePath(d)
    const idx = traces.push(tr) - 1
    const add = (s) => {
      const k = Math.min(tr.n, Math.round(s / DENSE))
      const x = tr.pts[2 * k]
      const y = tr.pts[2 * k + 1]
      if (filter?.(x, y)) return
      particles.push({ mode: 0, trace: idx, s, rx: x, ry: y, c, r: r0 + rand() * 0.6, a, T: delay + 1.0 * (s / tr.length), D: 0.25 + s / 900, ph: rand() * 6.28 })
    }
    for (let s = 0; s < tr.length; s += SPACING) add(s)
    add(tr.length)
    return idx
  }
  /** Points that gather in from scattered positions. `mi`: the motion they share once assembled. */
  const gather = (delay, pts, { c = 0, a = 0.92, r0 = 2.0, jitter = 0.6, steady, mi, filter } = {}) => {
    for (const [x, y] of pts) {
      if (filter?.(x, y)) continue
      const ang = rand() * 6.28
      const dist = 14 + rand() * 36
      particles.push({ mode: 1, rx: x, ry: y, c, r: r0 + rand() * jitter, a, T: delay + rand() * 0.25, D: 0.7 + rand() * 0.5, ox: Math.cos(ang) * dist, oy: Math.sin(ang) * dist, ph: rand() * 6.28, steady, mi })
    }
  }
  const outline = (d, step = SPACING) => pathPoints(d, step)
  const within = (cx, cy, r) => (x, y) => Math.hypot(x - cx, y - cy) < r

  // the floor: a line that grows in from the right
  stream(`M${W} ${G} H0`, { delay: 0.1, a: 0.55 })

  // the factory at the back, faint: the sawtooth outline grows from its right wall (what the belt covers is left out), the
  // chimneys and windows gather in
  stream(FACTORY.body.replace(/^M6 334 V226 L73 196 V226 L140 196 V226 L207 196 V334$/, 'M207 334 V196 L140 226 V196 L73 226 V196 L6 226 V334'), {
    delay: at(207),
    a: 0.4,
    filter: (x, y) => y > BELT - 3 && y < BELT + 14,
  })
  gather(at(80, 0.3), outline(FACTORY.chimneys, 6), { a: 0.4 })
  gather(at(110, 0.6), outline(FACTORY.windows, 5.5), { a: 0.32 })

  // the conveyor: legs, then the belt itself - a stream that leaves the right end, runs along the top and back along the bottom
  gather(at(300, 0.2), outline(BELT_LEGS, 5), { a: 0.7 })
  const r = 5.5
  stream(`M${BELT_X1 - r} ${BELT} H${BELT_X0 + r} A${r} ${r} 0 0 0 ${BELT_X0 + r} ${BELT + 11} H${BELT_X1 - r} A${r} ${r} 0 0 0 ${BELT_X1 - r} ${BELT}`, { delay: at(BELT_X1 - 20), a: 0.92 })
  gather(at(330, 0.5), linePts(BELT_X0 + 14, BELT + 5.5, BELT_X1 - 14, BELT + 5.5, 8), { a: 0.5 })

  // the crates: each shares one motion with its own phase - they all ride one crate spacing per cycle and so end where the next began
  const crateMotion = (i) =>
    motion((t) => {
      if (t < CRATES_RUN) return i === 0 ? [1, 0, 0, 1, 0, 0, 0] : IDENTITY // the first one is not there until the belt starts
      const u = ((t - CRATES_RUN) / CRATE_SECONDS) % 1
      const alpha = i === 0 ? clamp01(u / 0.45) : i === CRATE_XS.length - 1 ? 1 - clamp01((u - 0.4) / 0.6) : 1
      return [1, 0, 0, 1, u * CRATE_STEP, 0, alpha]
    })
  CRATE_XS.forEach((x, i) => gather(at(x, 0.5), outline(crate(x), 5.2), { a: 0.9, r0: 2.1, jitter: 0, steady: true, mi: crateMotion(i) }))

  // the scanner arch, its camera and the beam (amber, flickering)
  gather(at(326, 0.6), outline(SCANNER.arch, 5.5), { a: 0.9 })
  gather(at(326, 1.0), outline(SCANNER.camera, 4.5), { a: 0.85 })
  gather(at(326, 1.2), outline(SCANNER.lens, 2.6), { a: 0.9, r0: 1.5 })
  gather(at(326, 1.3), outline(SCANNER.beam, 4.4).filter((_, i) => i % 2 === 0), {
    c: 1,
    a: 0.8,
    r0: 1.6,
    steady: true,
    mi: motion((t) => [1, 0, 0, 1, 0, 0, t < RUN ? 1 : 0.25 + 0.75 * Math.sin((TAU * t) / 4.4) ** 2]),
  })

  // the gear train: every gear turns about its own centre, at a speed in inverse proportion to its teeth (they all start together)
  GEARS.forEach((g) => {
    const mi = motion((t) => (t < RUN ? IDENTITY : rotateAbout(g.cx, g.cy, ((g.reverse ? -1 : 1) * TAU * (t - RUN)) / g.seconds)))
    gather(at(g.cx, 0.2), outline(g.teeth, 4.8), { a: 0.95, mi })
    gather(at(g.cx, 0.7), outline(g.inside, 5.5), { a: 0.55, r0: 1.7, mi })
  })

  // the robot arm (amber): the base and the shoulder housing stay put; the upper arm swings about the shoulder, the forearm
  // (with the elbow ring, the wrist and the gripper) about the elbow on top of that
  const upper = motion((t) => rotateAbout(ARM.S[0], ARM.S[1], ((-6 * Math.PI) / 180) * swing(t, 7) * ramp(t, RUN)))
  const fore = motion((t) => compose(rotateAbout(ARM.S[0], ARM.S[1], ((-6 * Math.PI) / 180) * swing(t, 7) * ramp(t, RUN)), rotateAbout(ARM.E[0], ARM.E[1], ((11 * Math.PI) / 180) * swing(t + 1.2, 5.4) * ramp(t, RUN))))
  const hidden = within(ARM.S[0], ARM.S[1], 15.5) // what the shoulder housing covers
  gather(at(596), outline(ARM.base, 5), { c: 1, a: 0.95, filter: hidden })
  gather(at(596, 0.1), outline(ARM.shoulder, 4.6), { c: 1, a: 0.95 })
  gather(at(596, 0.6), outline(ARM.shoulderRing, 3), { c: 1, a: 0.8, r0: 1.6 })
  gather(at(560, 0.15), outline(ARM.upper, 5), { c: 1, a: 0.95, filter: hidden, mi: upper })
  gather(at(500, 0.3), outline(ARM.fore, 5), { c: 1, a: 0.95, mi: fore })
  gather(at(540, 0.9), outline(ARM.elbow, 3), { c: 1, a: 0.8, r0: 1.6, mi: fore })
  gather(at(470, 1.0), outline(ARM.wrist, 3), { c: 1, a: 0.8, r0: 1.6, mi: fore })
  gather(at(460, 0.8), outline(ARM.hand, 4.5), { c: 1, a: 0.95, r0: 1.8, mi: fore })

  // the cloud (with its gear turning inside it) and the dashboard card drift
  const cloudFloat = floating(CLOUD.cx, CLOUD.cy, 3.5, 0.012, 8.3, 0)
  const cloudMi = motion(cloudFloat)
  const gearMi = motion((t) => compose(cloudFloat(t), t < RUN ? IDENTITY : rotateAbout(CLOUD_GEAR.cx, CLOUD_GEAR.cy, (TAU * (t - RUN)) / 14)))
  gather(at(CLOUD.cx, 0.3), outline(cloud(CLOUD.cx, CLOUD.cy), 5.2), { a: 0.95, mi: cloudMi })
  gather(at(CLOUD.cx, 1.1), outline(CLOUD_GEAR.teeth, 3.2), { a: 0.8, r0: 1.5, jitter: 0.4, mi: gearMi })
  const cardMi = motion(floating(56, 79, 3, 0.01, 7.4, 1.7))
  gather(at(56, 0.4), outline(DASHBOARD.frame, 5.2), { a: 0.95, mi: cardMi })
  gather(at(56, 1.0), outline(DASHBOARD.dots, 2.4), { a: 0.85, r0: 1.3, jitter: 0.3, mi: cardMi })
  DASHBOARD.barCols.forEach(([x, y0, y1]) => gather(at(56, 1.0), linePts(x, y0, x, y1, 4.4), { a: 0.85, r0: 1.7, mi: cardMi }))
  gather(at(56, 1.0), outline(DASHBOARD.gauge, 4.6), { a: 0.85, r0: 1.7, mi: cardMi })
  gather(at(56, 1.3), outline(DASHBOARD.trend, 4.6), { a: 0.95, r0: 1.7, mi: cardMi })
  gather(at(56, 1.9), [DASHBOARD.last], { c: 1, a: 1, r0: 2.6, jitter: 0, mi: cardMi })

  // the data lines from the cloud to the machines (dim dots, a node at the end); each starts at the cloud's lower edge
  const lines = DATA_LINES.map(({ edge: [x1, y1], to }) => {
    const pts = linePts(x1, y1, to[0], to[1], 7)
    gather(at(to[0], 1.1), pts, { a: 0.5, r0: 1.5, jitter: 0.4 })
    gather(at(to[0], 1.2), pathPoints(`M${to[0] + 2.6} ${to[1]} a2.6 2.6 0 1 0 -5.2 0 a2.6 2.6 0 1 0 5.2 0`, 2.8), { a: 0.9, r0: 1.4, jitter: 0.3 })
    return densePath(`M${x1} ${y1} L${to[0]} ${to[1]}`)
  })

  return { particles, traces, motions, lines }
}

// smoke rings from the chimneys: [x, y of the chimney's top, offset in seconds]
const SMOKE = FACTORY.smoke.flatMap(([x, y], i) => [0, 1, 2].map((k) => [x, y, 2.6 + i * 0.9 + k * 1.7]))
const SMOKE_SECONDS = 5

export default function FactoryParticles({ color = '#6a6fc4' }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const { particles, traces, motions, lines } = build()
    return startFlatParticles(canvasRef.current, {
      particles,
      traces,
      motions,
      colors: [color, AMBER],
      glowColor: AMBER,
      // the picture fits the canvas' width and stands on its bottom edge
      layout: (w, h) => {
        const sc = Math.min(w / W, h / H)
        return { sc, tx: w - W * sc, ty: h - H * sc }
      },
      drawExtras: (ctx, t, { sprite, dots, glow, pointOn, reduceMotion }) => {
        if (reduceMotion || t < RUN) return
        // smoke: a ring of faint dots that rises, spreads and fades
        for (const [x, y, d] of SMOKE) {
          const u = (((t - d) / SMOKE_SECONDS) % 1 + 1) % 1
          const a = 0.5 * (u < 0.15 ? u / 0.15 : 1 - (u - 0.15) / 0.85) * ramp(t, RUN)
          const rr = 4 * (0.6 + 1.3 * u)
          for (let k = 0; k < 10; k++) {
            const ang = (k * TAU) / 10
            sprite(dots[0], x + 8 * u + rr * Math.cos(ang), y - 34 * u + rr * Math.sin(ang), 1.2, a)
          }
        }
        // data: an amber pulse (a bright head and a short tail) runs from the cloud along each line
        lines.forEach((tr, i) => {
          const gap = 90 + i * 25
          const s = ((t - RUN - i * 0.8) * (50 + i * 6)) % (tr.length + gap)
          if (s < 0) return
          const fade = clamp01(Math.min(s / 10, (tr.length - s) / 14))
          for (let j = 5; j >= 0; j--) {
            const sj = s - j * 4.5
            if (sj < 0 || sj > tr.length) continue
            const [x, y] = pointOn(tr, sj)
            sprite(dots[1], x, y, 2.3 - j * 0.28, 0.9 * Math.max(0, fade) * (1 - j / 6))
          }
          if (s <= tr.length) {
            const [hx, hy] = pointOn(tr, s)
            sprite(glow, hx, hy, 7, 0.45 * Math.max(0, fade))
          }
        })
      },
    })
  }, [color])

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <canvas
        ref={canvasRef}
        style={{ aspectRatio: `${W} / ${H}` }}
        className="absolute bottom-0 right-0 w-[min(660px,calc(100vw_-_560px))] max-md:w-full max-md:opacity-40 [mask-image:linear-gradient(to_left,black_92%,transparent_100%)]"
      />
    </div>
  )
}
