import {
  W, G, GEARS, ARM, BELT_PATH, BELT_LEGS, CRATE_XS, CRATE_STEP, crate, SCANNER, FACTORY, CLOUD, CLOUD_GEAR, cloud, DASHBOARD, DATA_LINES, circ,
} from './factoryGeometry'

// Decoration for the Industry 4.0 page headers: a smart factory drawn in thin lines only, in the theme's indigo - a robot arm that
// swings over a conveyor, a train of three meshing gears, a scanner arch over the belt, a factory with chimneys (faint, smoking)
// at the back, and above them a cloud and a dashboard card that float and send data (flowing dashes) to the machines. It sits at
// the bottom right of the band, its left end level with the left end of the VLSI-CAD circuit (HeaderDecor); the lines draw
// themselves in once (index.css, .line-draw / .line-fade), the picture building up from the right to the left (everything is
// timed by its x). Afterwards it works: the gears turn, the arm swings, crates ride the belt, the camera scans, smoke rises, the
// data flows and the cloud and card drift (index.css, .gear-spin, .arm-swing, .belt-crate, .scan-pulse, .smoke-puff,
// .line-flow, .float-drift). The geometry is factoryGeometry.js. Solid shapes are filled with the page colour so they hide
// what is behind them.

/** When something centred at x starts to draw: the right-most first, the left-most last. */
const at = (cx, extra = 0) => ({ animationDelay: `${(0.2 + ((W - cx) / W) * 2.2 + extra).toFixed(2)}s` })

const floatStyle = (i, { rise = 6, turn = 1, base = 7 } = {}) => ({
  '--float-y': `${-(rise + (i % 3) * 2)}px`,
  '--float-r': `${i % 2 ? turn : -turn}deg`,
  '--float-t': `${base + (i % 4) * 1.3}s`,
  '--float-d': `${-i * 1.7}s`,
})

const origin = ([x, y]) => `${x}px ${y}px`

export default function FactoryDecor({ color = '#6a6fc4', light = true }) {
  const bg = light ? '#eef8f3' : '#002843'
  const arm = (t, d, a0, a1) => ({ '--arm-t': `${t}s`, '--arm-d': `${d}s`, '--a0': `${a0}deg`, '--a1': `${a1}deg` })

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <svg
        viewBox={`0 0 ${W} 360`}
        preserveAspectRatio="xMaxYMax meet"
        className="absolute bottom-0 right-0 h-auto w-[min(660px,calc(100vw_-_560px))] max-md:w-full max-md:opacity-40 [mask-image:linear-gradient(to_left,black_92%,transparent_100%)]"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* the factory at the back: faint, with smoke from its chimneys */}
        <g opacity="0.4" strokeWidth="1.1">
          <path d={FACTORY.body} pathLength="1" className="line-draw" style={at(110)} />
          <path d={FACTORY.chimneys} pathLength="1" className="line-draw" style={at(80, 0.3)} />
          <path d={FACTORY.windows} strokeWidth="0.9" className="line-fade" style={at(110, 0.6)} />
          {FACTORY.smoke.map(([x, y], i) =>
            [0, 1, 2].map((k) => (
              <circle key={`${i}-${k}`} cx={x} cy={y} r="4" strokeWidth="0.9" className="smoke-puff" style={{ '--puff-d': `${2.6 + i * 0.9 + k * 1.7}s` }} />
            )),
          )}
        </g>

        {/* the floor */}
        <path d={`M0 ${G} H${W}`} strokeWidth="1.2" opacity="0.55" pathLength="1" className="line-draw" style={at(330, -0.2)} />

        {/* data from the cloud to the machines: flowing dashes ending in a node */}
        <g strokeWidth="1" opacity="0.6">
          {DATA_LINES.map((l, i) => (
            <g key={i} className="line-fade" style={at(l.to[0], 1.1)}>
              <path d={l.d} strokeDasharray="2 5" className="line-flow" />
              <path d={circ(l.to[0], l.to[1], 2.6)} fill={bg} />
            </g>
          ))}
        </g>

        {/* the dashboard card and the cloud: they float */}
        <g className="float-drift" style={floatStyle(1, { rise: 7, turn: 0.8, base: 8 })}>
          <g strokeWidth="1.2">
            <path d={DASHBOARD.frame} fill={bg} pathLength="1" className="line-draw" style={at(56, 0.4)} />
            <g opacity="0.85" className="line-fade" style={at(56, 1.0)}>
              <path d={DASHBOARD.dots} strokeWidth="0.9" />
              <path d={DASHBOARD.bars} strokeWidth="1" />
              <path d={DASHBOARD.gauge} strokeWidth="1" />
            </g>
            <path d={DASHBOARD.trend} strokeWidth="1.2" pathLength="1" className="line-draw" style={at(56, 1.3)} />
            <path d={circ(DASHBOARD.last[0], DASHBOARD.last[1], 2)} fill={color} className="line-fade" style={at(56, 1.9)} />
          </g>
        </g>
        <g className="float-drift" style={floatStyle(2, { rise: 8, turn: 1, base: 7 })}>
          <g strokeWidth="1.3">
            <path d={cloud(CLOUD.cx, CLOUD.cy)} fill={bg} pathLength="1" className="line-draw" style={at(CLOUD.cx, 0.3)} />
            <g className="gear-spin" style={{ '--spin-t': '14s' }}>
              <path d={CLOUD_GEAR.teeth} strokeWidth="1" className="line-fade" style={at(CLOUD.cx, 1.1)} />
            </g>
          </g>
        </g>

        {/* the conveyor: legs, belt, then the crates riding it */}
        <g strokeWidth="1.3">
          <path d={BELT_LEGS} opacity="0.7" pathLength="1" className="line-draw" style={at(300, 0.2)} />
          <path d={BELT_PATH} fill={bg} pathLength="1" className="line-draw" opacity="0.95" style={at(330, 0.1)} />
        </g>
        <g strokeWidth="1.2">
          {CRATE_XS.map((x, i) => (
            <g
              key={x}
              className={i === 0 ? 'belt-crate belt-crate-first' : i === CRATE_XS.length - 1 ? 'belt-crate belt-crate-last' : 'belt-crate'}
              style={{ '--belt-run': `${CRATE_STEP}px` }}
            >
              <path d={crate(x)} fill={bg} pathLength="1" className="line-draw" opacity="0.9" style={at(x, 0.5)} />
            </g>
          ))}
        </g>

        {/* the scanner arch: the camera scans the crates passing under it */}
        <g strokeWidth="1.2">
          <path d={SCANNER.arch} fill={bg} pathLength="1" className="line-draw" opacity="0.9" style={at(326, 0.6)} />
          <path d={SCANNER.camera} pathLength="1" className="line-draw" opacity="0.85" style={at(326, 1.0)} />
          <path d={SCANNER.lens} className="line-fade" style={at(326, 1.3)} />
          <path d={SCANNER.beam} strokeWidth="1" strokeDasharray="2 3" className="scan-pulse" />
        </g>

        {/* the gear train: A in the middle turns against B and C */}
        <g strokeWidth="1.3">
          {GEARS.map((g, i) => (
            <g key={i} className="gear-spin" style={{ '--spin-t': `${g.seconds}s`, '--spin-dir': g.reverse ? 'reverse' : 'normal' }}>
              <path d={g.teeth} fill={bg} pathLength="1" className="line-draw" opacity="0.95" style={at(g.cx, 0.2)} />
              <path d={g.inside} strokeWidth="1" opacity="0.6" className="line-fade" style={at(g.cx, 0.9)} />
            </g>
          ))}
        </g>

        {/* the robot arm: base, then the upper arm (swings about the shoulder) carrying the forearm (swings about the elbow) */}
        <g strokeWidth="1.5">
          <path d={ARM.base} fill={bg} pathLength="1" className="line-draw" opacity="0.95" style={at(596, 0)} />
          <g className="arm-swing" style={{ transformOrigin: origin(ARM.S), ...arm(7, 0, 0, -6) }}>
            <path d={ARM.upper} fill={bg} pathLength="1" className="line-draw" opacity="0.95" style={at(560, 0.15)} />
            <g className="arm-swing" style={{ transformOrigin: origin(ARM.E), ...arm(5.4, -1.2, 0, 11) }}>
              <path d={ARM.fore} fill={bg} pathLength="1" className="line-draw" opacity="0.95" style={at(500, 0.3)} />
              <path d={ARM.elbow} className="line-fade" opacity="0.8" style={at(540, 0.9)} />
              <path d={ARM.wrist} className="line-fade" opacity="0.8" style={at(470, 1.0)} />
              <path d={ARM.hand} strokeWidth="1.4" pathLength="1" className="line-draw" opacity="0.9" style={at(460, 0.8)} />
            </g>
          </g>
          <path d={ARM.shoulder} fill={bg} pathLength="1" className="line-draw" opacity="0.95" style={at(596, 0.1)} />
          <path d={ARM.shoulderRing} className="line-fade" opacity="0.8" style={at(596, 0.9)} />
        </g>
      </svg>
    </div>
  )
}
