import { useEffect, useRef } from 'react'
import { clamp01, startFlatParticles } from './flatParticles'
import { isLand } from './worldLand'

// The Collaborations page header's picture: a globe of flat particles, turning slowly, with the group's partners marked on it and
// arcs of amber particles reaching from Turin (the hub) to each of them - the same flat particle look as the other headers, but big
// and half off the band's right edge, not a picture standing in its corner. The land is a lattice of teal dots (the continents are
// hand-made outlines, worldLand.js) over a very faint graticule, the far side showing through almost not at all. The arcs
// grow out of Turin one after another, each ending in a marker that sends out rings, and a bright pulse runs along each
// of them. With reduced motion it is the finished globe, still, with Europe facing the viewer.
// It is drawn entirely in drawExtras (the points move on a sphere, which the engine's affine motions can't do): a 1000 x 1000
// box with the globe's centre in the middle, projected orthographically, with a tilt that shows a little of the north pole.

const TEAL = '#3fb0b8' // the VLSI-CAD teal, the site's accent
const AMBER = '#e0a94a'
// on a light ground the dots are deeper so they hold up against it, and the pulses (white on a dark one) are a deep amber
const TEAL_LIGHT = '#2b9fb3'
const AMBER_LIGHT = '#d9962a'
const PULSE_LIGHT = '#b8730f'
const R = 430 // the globe's radius in the 1000 x 1000 box
const C = 500 // its centre
const D2R = Math.PI / 180
const TILT = 20 * D2R // how far the north pole leans towards the viewer
const LON0 = 25 // the longitude facing the viewer at the start (Europe)
const SPIN = 3.2 // degrees per second: the globe turns eastwards (the longitude in the middle falls)
const LAT_STEP = 2.6 // the spacing of the land lattice, degrees

const vec = (lat, lon) => [Math.cos(lat * D2R) * Math.sin(lon * D2R), Math.sin(lat * D2R), Math.cos(lat * D2R) * Math.cos(lon * D2R)]
const hash = (i) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

// Turin, the hub, and the partners' cities (lat, lon): the universities' and the companies' homes, spread over the world
const HOME = [45.07, 7.69]
const PARTNERS = [
  [37.4, -122.2], // Stanford, Palo Alto
  [34.0, -118.3], // Los Angeles
  [40.0, -105.3], // Boulder
  [40.8, -74.0], // New York
  [41.8, -71.4], // Providence
  [1.35, 103.8], // Singapore
  [60.2, 24.9], // Helsinki
  [59.3, 18.1], // Stockholm
  [53.5, -2.2], // Manchester
  [50.9, -1.4], // Southampton
  [51.4, 5.5], // Eindhoven
  [48.1, 11.6], // Munich
  [46.5, 6.6], // Lausanne
  [53.1, 8.2], // Oldenburg
]

/** The land lattice, as world vectors with a hash for each point's turn to appear. */
function buildLand() {
  const pts = []
  let k = 0
  for (let lat = -58; lat <= 84; lat += LAT_STEP) {
    const step = LAT_STEP / Math.max(0.15, Math.cos(lat * D2R))
    for (let lon = -180; lon < 180; lon += step) {
      if (isLand(lon, lat)) pts.push({ v: vec(lat, lon), d: hash(k++) })
    }
  }
  return pts
}

/** The faint graticule: parallels every 30 degrees and meridians every 30 degrees, dotted. */
function buildGraticule() {
  const pts = []
  for (let lat = -60; lat <= 60; lat += 30) for (let lon = -180; lon < 180; lon += 3 / Math.max(0.3, Math.cos(lat * D2R))) pts.push(vec(lat, lon))
  for (let lon = -180; lon < 180; lon += 30) for (let lat = -78; lat <= 78; lat += 3) pts.push(vec(lat, lon))
  return pts
}

/** An arc from the hub to a partner: points along the great circle, lifted above the surface by a height that grows with the distance. */
function buildArc(to, i) {
  const a = vec(HOME[0], HOME[1])
  const b = vec(to[0], to[1])
  const omega = Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])))
  const height = 0.05 + 0.2 * (omega / Math.PI)
  const n = Math.max(8, Math.round((omega * R) / 9))
  const pts = []
  for (let k = 0; k <= n; k++) {
    const u = k / n
    const s0 = Math.sin((1 - u) * omega) / Math.sin(omega)
    const s1 = Math.sin(u * omega) / Math.sin(omega)
    const lift = 1 + height * Math.sin(Math.PI * u)
    pts.push([(s0 * a[0] + s1 * b[0]) * lift, (s0 * a[1] + s1 * b[1]) * lift, (s0 * a[2] + s1 * b[2]) * lift])
  }
  return { pts, end: b, start: 1.5 + i * 0.28, grow: 1.1 + 0.9 * (omega / Math.PI) }
}

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
function haloSprite(color, light) {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const x = c.getContext('2d')
  const g = x.createRadialGradient(64, 64, 40, 64, 64, 64)
  g.addColorStop(0, color + (light ? '1c' : '30'))
  g.addColorStop(0.55, color + (light ? '09' : '12'))
  g.addColorStop(1, color + '00')
  x.fillStyle = g
  x.fillRect(0, 0, 128, 128)
  return c
}

export default function GlobeParticles({ light = false }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const land = buildLand()
    const graticule = buildGraticule()
    const arcs = PARTNERS.map(buildArc)
    const hub = vec(HOME[0], HOME[1])
    const tealC = light ? TEAL_LIGHT : TEAL
    const amberC = light ? AMBER_LIGHT : AMBER
    const teal = dotSprite(tealC)
    const amber = dotSprite(amberC)
    const white = dotSprite(light ? PULSE_LIGHT : '#ffffff')
    const halo = haloSprite(tealC, light)

    return startFlatParticles(canvasRef.current, {
      particles: [],
      traces: [],
      colors: [tealC, amberC],
      glowColor: amberC,
      introSeconds: 8,
      // the 1000 x 1000 box fills the (square) canvas
      layout: (w, h) => {
        const sc = Math.min(w, h) / 1000
        return { sc, tx: (w - 1000 * sc) / 2, ty: (h - 1000 * sc) / 2 }
      },
      drawExtras: (ctx, now, { sprite, glow, reduceMotion }) => {
        const t = reduceMotion ? 60 : now
        const lonC = reduceMotion ? 12 : LON0 - SPIN * now
        const cl = Math.cos(lonC * D2R)
        const sl = Math.sin(lonC * D2R)
        const ct = Math.cos(TILT)
        const st = Math.sin(TILT)
        // a world vector -> [x, y, z] in the view (z towards the viewer), unit sphere
        const view = (v, out) => {
          const x1 = v[0] * cl - v[2] * sl
          const z1 = v[0] * sl + v[2] * cl
          out[0] = x1
          out[1] = v[1] * ct - z1 * st
          out[2] = v[1] * st + z1 * ct
        }
        const o = [0, 0, 0]
        const ramp = (u) => clamp01(u)
        const sx = (x, r = 1) => C + R * r * x
        const sy = (y, r = 1) => C - R * r * y

        // the halo round the globe, then its rim: a thin ring of dots
        sprite(halo, C, C, R * 1.15, ramp(t / 1.2))
        const rimA = (light ? 0.45 : 0.32) * ramp(t / 1.0)
        for (let k = 0; k < 200; k++) {
          const ang = (k * 2 * Math.PI) / 200
          sprite(teal, C + R * Math.cos(ang), C + R * Math.sin(ang), 1.6, rimA)
        }

        // the graticule: faint, only the near side
        const gA = (light ? 0.24 : 0.14) * ramp((t - 0.2) / 1.0)
        for (const v of graticule) {
          view(v, o)
          if (o[2] <= 0) continue
          sprite(teal, sx(o[0]), sy(o[1]), 1.5, gA * (0.4 + 0.6 * o[2]))
        }

        // the land: the near side in full (smaller and dimmer towards the edge), the far side a ghost
        for (const p of land) {
          const s = ramp((t - 0.3 - p.d * 1.5) / 0.6)
          if (s <= 0) continue
          view(p.v, o)
          if (o[2] > 0) sprite(teal, sx(o[0]), sy(o[1]), 3.6 * (0.55 + 0.45 * o[2]) * s, (0.3 + 0.7 * o[2] ** 0.6) * s * 0.95)
          else sprite(teal, sx(o[0]), sy(o[1]), 2.4 * s, 0.07 * s)
        }

        // the arcs from the hub: they grow out of Turin, one after another; a bright pulse runs along each
        arcs.forEach((arc, i) => {
          const frac = ramp((t - arc.start) / arc.grow)
          if (frac <= 0) return
          const last = Math.floor(frac * (arc.pts.length - 1))
          for (let k = 0; k <= last; k++) {
            view(arc.pts[k], o)
            if (o[2] < -0.02) continue
            const fade = clamp01((o[2] + 0.02) / 0.25)
            sprite(amber, sx(o[0]), sy(o[1]), 2.3, 0.85 * fade)
          }
          const arrived = t - (arc.start + arc.grow)
          if (arrived < 0) return
          // the pulse: a head with a tail, one pass every 3.4 seconds, each arc on its own beat
          const u = (((t - arc.start - arc.grow) / 3.4 + i * 0.37) % 1 + 1) % 1
          if (!reduceMotion) {
            for (let j = 5; j >= 0; j--) {
              const kk = Math.round(u * (arc.pts.length - 1)) - j
              if (kk < 0) continue
              view(arc.pts[kk], o)
              if (o[2] < -0.02) continue
              const fade = clamp01((o[2] + 0.02) / 0.25)
              if (j === 0) sprite(glow, sx(o[0]), sy(o[1]), 13, 0.5 * fade)
              sprite(white, sx(o[0]), sy(o[1]), 2.6 - j * 0.3, 0.9 * fade * (1 - j / 6))
            }
          }
          // the marker at the partner's city, with a ring that spreads and fades
          view(arc.end, o)
          if (o[2] <= 0.02) return
          sprite(amber, sx(o[0]), sy(o[1]), 4, 0.95)
          if (!reduceMotion) {
            const p = (((t - arc.start - arc.grow) / 2.8 + i * 0.23) % 1 + 1) % 1
            const rr = 5 + 15 * p
            for (let k = 0; k < 12; k++) {
              const ang = (k * 2 * Math.PI) / 12
              sprite(amber, sx(o[0]) + rr * Math.cos(ang), sy(o[1]) + rr * Math.sin(ang) * (0.45 + 0.55 * o[2]), 1.5, 0.7 * (1 - p))
            }
          }
        })

        // the hub itself: a larger marker with a slow double ring
        view(hub, o)
        if (o[2] > 0 && t > 0.8) {
          const a = ramp((t - 0.8) / 0.6)
          sprite(glow, sx(o[0]), sy(o[1]), 24, 0.55 * a)
          sprite(amber, sx(o[0]), sy(o[1]), 6.2, a)
          if (!reduceMotion) {
            for (let n = 0; n < 2; n++) {
              const p = (((t - 0.8) / 3.0 + n * 0.5) % 1 + 1) % 1
              const rr = 8 + 26 * p
              for (let k = 0; k < 18; k++) {
                const ang = (k * 2 * Math.PI) / 18
                sprite(amber, sx(o[0]) + rr * Math.cos(ang), sy(o[1]) + rr * Math.sin(ang) * (0.45 + 0.55 * o[2]), 1.8, 0.8 * (1 - p) * a)
              }
            }
          }
        }
      },
    })
  }, [light])

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <canvas
        ref={canvasRef}
        style={{ aspectRatio: '1 / 1' }}
        className="absolute right-0 top-[calc(58%+60px)] w-[min(660px,calc(100vw-540px))] -translate-y-1/2 translate-x-[10%] max-lg:top-4 max-lg:w-[min(80%,460px)] max-lg:translate-y-0 max-lg:translate-x-[18%] max-lg:opacity-35"
      />
    </div>
  )
}
