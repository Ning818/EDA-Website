import { W, H, FAR_HELICES, MAIN_HELICES, MOLECULES, CELLS } from './helixGeometry'

// Decoration for the Bioinformatics page headers: DNA drawn in thin lines only, in the theme's green - three main double helices
// with a faint row of smaller ones behind them (the strand in front whole, the one behind lighter, the base pairs between),
// benzene-ring molecules and a few cells with a dashed nucleus, all hanging in the air. It sits at the bottom right of the band, its left end level with the left end of the VLSI-CAD
// circuit (HeaderDecor); the lines draw themselves in once (index.css, .line-draw / .line-fade), each helix growing from the
// bottom up and the whole picture building up from the right to the left (everything is timed by its x). Afterwards every helix, molecule and cell floats: a slow drift up and down with a slight turn, each at its own pace
// (index.css, .float-drift). The geometry is helixGeometry.js.

/** When something centred at x starts to draw: the right-most first, the left-most last. */
const at = (cx, extra = 0) => 0.2 + ((W - cx) / W) * 2.2 + extra

/** Style for a floating group: the drift's height, turn, period and a negative delay so the objects start out of step. */
const floatStyle = (i, { rise = 6, turn = 1.2, base = 7 } = {}) => ({
  '--float-y': `${-(rise + (i % 3) * 2)}px`,
  '--float-r': `${i % 2 ? turn : -turn}deg`,
  '--float-t': `${base + (i % 4) * 1.3}s`,
  '--float-d': `${-i * 1.7}s`,
})

/** One helix: back strand, front strand, then its base pairs drawn rung by rung. */
function Helix({ h, i, faint = false }) {
  const d = { animationDelay: `${at(h.cx)}s` }
  return (
    <g opacity={faint ? 0.4 : 1}>
      <g className="float-drift" style={floatStyle(i, faint ? { rise: 4, turn: 0.8, base: 9 } : { rise: 7, turn: 1.4, base: 7 })}>
      <path d={h.back} strokeWidth="1" opacity="0.45" pathLength="1" className="line-draw" style={d} />
      <path d={h.front} strokeWidth={faint ? 1.2 : 1.7} opacity="0.95" pathLength="1" className="line-draw" style={d} />
      <path d={h.rungs} strokeWidth="1" opacity="0.6" pathLength="1" className="line-draw" style={{ animationDelay: `${at(h.cx, 0.35)}s` }} />
      </g>
    </g>
  )
}

export default function HelixDecor({ color = '#4ab47a' }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMaxYMax meet"
        className="absolute bottom-0 right-0 h-auto w-[min(660px,calc(100vw_-_560px))] max-md:w-full max-md:opacity-40 [mask-image:linear-gradient(to_left,black_92%,transparent_100%)]"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <g transform="translate(0 22)">
        {FAR_HELICES.map((h, i) => (
          <Helix key={`far${i}`} h={h} i={i} faint />
        ))}
        {MAIN_HELICES.map((h, i) => (
          <Helix key={`main${i}`} h={h} i={i + 3} />
        ))}

        {/* molecules and cells, floating in the air above */}
        <g strokeWidth="1.3" opacity="0.85">
          {MOLECULES.map((m, i) => (
            <g key={i} className="float-drift" style={floatStyle(i + 2, { rise: 8, turn: 3, base: 6 })}>
              <path d={m.d} pathLength="1" className="line-draw" style={{ animationDelay: `${at(m.cx, 0.4)}s` }} />
            </g>
          ))}
        </g>
        <g strokeWidth="1.2" opacity="0.8">
          {CELLS.map((c, i) => (
            <g key={i} className="float-drift" style={floatStyle(i + 5, { rise: 9, turn: 2, base: 6.5 })}>
              <path d={c.membrane} pathLength="1" className="line-draw" style={{ animationDelay: `${at(c.cx, 0.4)}s` }} />
              <path d={c.nucleus} strokeDasharray="2 3" className="line-fade" style={{ animationDelay: `${at(c.cx, 0.9)}s` }} />
            </g>
          ))}
        </g>
        </g>
      </svg>
    </div>
  )
}
