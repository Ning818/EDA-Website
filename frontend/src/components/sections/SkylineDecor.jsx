import { W, H, G, TOWERS, TOWER_LIST, FAR, BRIDGE_LINES, DRONES, POLES, TALL_CX, RING_Y, RING_RX, RING_RY, SIGNAL_RADII, signalArc, dronePath, polePath } from './skylineGeometry'

// Decoration for the Smart City page headers: a futuristic city skyline drawn in thin lines only, in the theme's blue - no
// particles, no dot grid. Slender needle towers, glass towers with faceted slanted tops, a cylinder with ring bands, stepped
// "ziggurat" towers carrying a wind turbine, diagrid towers (a diamond lattice over a tapering body) and a geodesic dome, a far row behind them, sky bridges
// between some towers, an orbit ring and a "connected city" signal on the tallest one, drones, and a road with smart poles
// (geometry: skylineGeometry.js; the particle version of this picture is SkylineParticles.jsx).
// It stands on the bottom edge of the band at the right, its left end level with the left end of the VLSI-CAD circuit
// (HeaderDecor), and the lines draw themselves in once (index.css, .line-draw / .line-fade). Towers are filled with the page
// colour so they hide the far row and the orbit ring's back half.

const step = (i) => ({ animationDelay: `${0.15 + i * 0.07}s` })

export default function SkylineDecor({ color = '#2f86b3', light = true }) {
  const bg = light ? '#eef8f3' : '#002843'

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMaxYMax meet"
        className="absolute bottom-0 right-0 h-auto w-[min(645px,calc(100vw_-_575px))] max-md:w-full max-md:opacity-40 [mask-image:linear-gradient(to_left,black_72%,transparent_100%)]"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* the far row: thin, faint */}
        <g strokeWidth="1" opacity="0.38">
          {FAR.map(([type, w, h, x], i) => (
            <path key={i} d={TOWERS[type](x, w, h).sil} pathLength="1" className="line-draw" style={step(i)} />
          ))}
        </g>

        {/* the orbit ring around the tallest tower: its back half first (the tower hides part of it) */}
        <path d={`M${TALL_CX - RING_RX} ${RING_Y} A${RING_RX} ${RING_RY} 0 0 1 ${TALL_CX + RING_RX} ${RING_Y}`} strokeWidth="1" strokeDasharray="3 4" opacity="0.5" className="line-fade" style={{ animationDelay: '1.6s' }} />

        {/* the near row: each tower hides what is behind it, draws its outline, then its detail lines fade in */}
        {TOWER_LIST.map((t, i) => (
          <g key={i} strokeWidth="1.5">
            <path d={t.sil} fill={bg} stroke="none" className="line-fade" style={step(i + 4)} />
            <path d={t.sil} pathLength="1" className="line-draw" opacity="0.9" style={step(i + 4)} />
            {t.lines && <path d={t.lines} strokeWidth="1" opacity="0.5" className="line-fade" style={{ animationDelay: `${0.9 + i * 0.07}s` }} />}
            {t.extra && <path d={t.extra} strokeWidth="1.3" opacity="0.85" pathLength="1" className="line-draw" style={{ animationDelay: `${1.3 + i * 0.05}s` }} />}
          </g>
        ))}

        {/* sky bridges between towers: a tube (two lines) from one tower's edge to the next one's */}
        <g strokeWidth="1.3" opacity="0.85">
          {BRIDGE_LINES.map(({ i, lines }, k) => (
            <path key={i} d={lines.map(([x1, y1, x2, y2]) => `M${x1} ${y1} H${x2}`).join(' ')} pathLength="1" className="line-draw" style={{ animationDelay: `${1.5 + k * 0.15}s` }} />
          ))}
        </g>

        {/* the orbit ring's front half, the antenna's signal arcs */}
        <g strokeWidth="1.3" opacity="0.9">
          <path d={`M${TALL_CX - RING_RX} ${RING_Y} A${RING_RX} ${RING_RY} 0 0 0 ${TALL_CX + RING_RX} ${RING_Y}`} pathLength="1" className="line-draw" style={{ animationDelay: '1.7s' }} />
          {SIGNAL_RADII.map((r, i) => (
            <path key={r} d={signalArc(r)} pathLength="1" className="line-draw" style={{ animationDelay: `${2.0 + i * 0.2}s` }} />
          ))}
        </g>

        {/* drones */}
        <g strokeWidth="1.1" opacity="0.75">
          {DRONES.map(([x, y], i) => (
            <path key={i} d={dronePath(x, y)} pathLength="1" className="line-draw" style={{ animationDelay: `${2.2 + i * 0.2}s` }} />
          ))}
        </g>

        {/* the road and smart poles */}
        <g strokeWidth="1.3">
          <path d={`M0 ${G} H${W}`} pathLength="1" className="line-draw" opacity="0.7" style={{ animationDelay: '0.1s' }} />
          <path d={`M0 ${G + 11} H${W}`} strokeDasharray="12 9" strokeWidth="1" opacity="0.4" className="line-fade" style={{ animationDelay: '0.8s' }} />
          {POLES.map((x, i) => (
            <path key={x} d={polePath(x)} opacity="0.7" pathLength="1" className="line-draw" style={{ animationDelay: `${1.0 + i * 0.05}s` }} />
          ))}
        </g>
      </svg>
    </div>
  )
}
