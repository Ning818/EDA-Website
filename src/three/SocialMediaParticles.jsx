import { useMemo } from 'react'
import { useLoader } from '@react-three/fiber'
import { FileLoader } from 'three'
import * as THREE from 'three'
import { parseDXFToChains, dedupeChains } from './parseDXF'
import { resampleChains } from './sampleLineStrips'
import { colorByGroup } from './particleColors'
import ParticleMesh from './ParticleMesh'

// Largest bounding-box axis after centering, in world units - same role as every other scene's
// TARGET_EXTENT.
const TARGET_EXTENT = 2.2
// Target distance between consecutive points along a curve segment (same units as TARGET_EXTENT).
// social-media.dxf is a "Standard" export - real LINE/ARC/POLYLINE/SPLINE entities (the molecule
// diagram on the central chip and each satellite's avatar icon are genuine SPLINE curves, up to 299
// points once tessellated - not the 2-5-point straight segments social-media-lines.glb's glTF
// export collapsed everything down to) - so parseDXF.js evaluates and resamples them itself at
// whatever resolution we want, same as DNAParticles.jsx/SmartCityParticles.jsx. No longer constrained
// by matchClouds (ParticleCanvas.jsx morphs straight from the arm into this cloud now, no scatter/
// regather transition) - picked for a comfortable, not-too-dense dot spacing, but not so coarse that
// the molecule diagram's one long, complex chain (a single ~1.4-unit spline tracing a big "atom"
// circle, a connector, and 2 more "atom" circles all in one path) dilutes down to so few points its
// own round parts stop reading as circles (confirmed by checking that chain's point count directly:
// spacing 0.03 left it only ~48 points for that whole path). Nudged up from 0.016 per request ("线稿
// 的点距离增大一点") - a modest step toward that danger zone, not all the way to it.
const EDGE_SPACING = 0.02
const CURVE_SEGMENTS = 48
export const SOCIAL_PARTICLE_SIZE = 0.025 // smaller than VLSI_PARTICLE_SIZE/CITY_PARTICLE_SIZE/ARM_PARTICLE_SIZE's
// shared 0.03 per request ("粒子小一点", tuned to 0.025) - this cloud's point density is much higher
// than those scenes' at the same on-screen scale, so smaller particles read more cleanly here.

// Each of social-media4.dxf's layers gets one of the site's own particle-cloud accent colors (not
// arbitrary new ones) - reused from DNAParticles.jsx/IndustryArmParticles.jsx/SmartCityParticles.jsx/
// VLSICADParticles.jsx so this scene reads as part of the same established palette. Different source
// layers -> different colors, per request. Each chip's own picture-pattern layer ("...上的图案")
// shares that chip's own true color - no separate lightened variant (per explicit correction this
// session: "面向镜头的粒子保持原色" - full color is the only state these ever need, since they have
// no "背面" counterpart - see below).
const CENTER_COLOR = '#4a9db3' // Smart City's building teal (BUILDING_COLOR)
const SAT2_COLOR = '#6a6fc4' // Industry Arm's ARM_COLOR - a callback since this scene follows the arm
const SAT3_COLOR = '#e0a94a' // the shared highlight/amber used across DNA, Smart City, Arm and VLSI-CAD
const SAT4_COLOR = '#4ab47a' // DNA's DNA_COLOR
const TRACE_COLOR = '#002843' // the site's own navy (nav bar, footer) - the pin-hatch ticks read as
// structural/chrome rather than another themed accent
// Two more generated (non-DXF) chip nodes, social2-only: muted brand reds/blues kept at the same
// saturation/value as the rest of this palette (not the harsh real YouTube/LinkedIn hex) so they read
// as part of the same family instead of clashing.
const YOUTUBE_COLOR = '#c0574f'
const LINKEDIN_COLOR = '#1f73c4' // more saturated than this palette's other blues (SAT2 indigo, CENTER
// teal) on purpose - confirmed by direct render check that a closer-to-muted blue blended into the
// existing navy/teal-heavy cluster too much to read as its own distinct node
const YOUTUBE_GROUP = 'YouTube芯片'
const LINKEDIN_GROUP = 'LinkedIn芯片'
const GROUP_COLORS = {
  '中心芯片-颜色1': CENTER_COLOR,
  '中心芯片的侧纹路': CENTER_COLOR,
  '中心芯片上面的图案': CENTER_COLOR,
  '次级芯片-颜色2': SAT2_COLOR,
  '次级芯片-颜色2上的图案': SAT2_COLOR,
  '次级芯片-颜色3': SAT3_COLOR,
  '次级芯片-颜色3上的图案': SAT3_COLOR,
  '次级芯片-颜色4': SAT4_COLOR,
  '次级芯片-颜色4上的图案': SAT4_COLOR,
  '用于连接电路板线路的起始线': TRACE_COLOR,
  [YOUTUBE_GROUP]: YOUTUBE_COLOR,
  [LINKEDIN_GROUP]: LINKEDIN_COLOR,
}

// social-media4.dxf pairs most structural layers with a manually-authored "...背面" twin (e.g.
// "中心芯片-颜色1" / "中心芯片-颜色1背面") - the user has already decided, line by line in Rhino,
// which curves sit on a face turned away from the established camera. Rather than re-deriving that
// from geometry (every attempt at computing it this session kept landing on self-consistent-but-wrong
// answers - see this file's git history), trust that labeling directly: a "...背面" layer always
// renders lightened, a plain layer always renders at full color, independent of any camera/normal
// math. BACK_LIGHTEN matches the visual strength of this scene's own established backA (0.6, the
// same fade amount VLSI-CAD's hand mesh and the brain's own back-facing points use).
const BACK_LIGHTEN = 0.6
const BACK_SUFFIX = '背面'
function lighten(hex, amount) {
  const c = new THREE.Color(hex)
  c.lerp(new THREE.Color('#ffffff'), amount)
  return `#${c.getHexString()}`
}
const FULL_GROUP_COLORS = { ...GROUP_COLORS }
for (const [g, c] of Object.entries(GROUP_COLORS)) FULL_GROUP_COLORS[g + BACK_SUFFIX] = lighten(c, BACK_LIGHTEN)

// True isometric (elevation = asin(1/sqrt(3)) ~= 35.264deg, the standard "equal angle" camera).
// Combined with makePoints' `orthographic` option (ParticleCanvas.jsx) for a true flat isometric
// look instead of this shared shader's usual subtle perspective.
//
// A real isometric view has a defining property: the model's own vertical edges stay exactly
// parallel to the screen's vertical at *any* azimuth (yaw) - elevation alone sets that, azimuth only
// picks which corner you're looking from. Getting that needed two fixes, not one:
//
// 1. Axis mismatch: this file feeds DXF's raw (X,Y,Z) straight into THREE's (x,y,z), but DXF's "up"
//    (the chip's own height) is its Z axis, not THREE's conventional Y. buildSocialMediaCloud swaps
//    Y and Z right after sampling (and mirrors X - see the comment there) so THREE's Y is the
//    model's true vertical before any rotation runs.
// 2. Euler order: THREE.Euler's order string sets which rotation ends up *outermost* (applied last,
//    to the already-rotated result of the others) - 'YXZ' (tried first) makes yaw outermost, which
//    means pitch's own tilt (applied first) has already pushed the up-vector off the Y axis by the
//    time yaw gets to it, so yaw's X/Z mixing drags that tilt sideways and verticals end up NOT
//    vertical except at yaw 0/180deg (confirmed numerically: rotating (0,1,0) through 'YXZ' at a
//    nonzero pitch and yaw=51deg gave x=-0.45, not 0). What's actually needed is yaw applied first
//    (so it only ever spins the model around its own already-vertical Y axis, which does nothing to
//    a vector that already points straight along that axis) and pitch applied last/outermost, which
//    is THREE's 'XYZ' order - confirmed this keeps the rotated (0,1,0)'s x-component at exactly 0 for
//    any yaw. (Previously this was patched per-shot with an extra "roll", which both hid the real bug
//    and isn't how a real isometric view - whose whole point is working for any azimuth - should need
//    to be built in the first place.)
//
// Pitch sign and yaw were solved for this corrected setup the same way as before - computing each
// satellite chip's own raw DXF center (the "次级芯片-颜色4" layer bundles 2 separate chips) and
// finding the rotation that reproduces the reference screenshot's arrangement (颜色4's pair up top,
// split left/right; 颜色3/颜色2 at the bottom, split left/right).
const SOCIAL_PITCH = -Math.asin(1 / Math.sqrt(3))
const SOCIAL_YAW = (330 * Math.PI) / 180
export const SOCIAL_ORIENTATION = new THREE.Quaternion().setFromEuler(new THREE.Euler(SOCIAL_PITCH, SOCIAL_YAW, 0, 'XYZ')).toArray()

/** Axis-aligned bounding box of one DXF layer's raw chains, in raw DXF units - used below to find
 * where each satellite chip actually sits, so generated traces route toward the right one. */
function groupBBox(chains, groups, groupName) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < chains.length; i++) {
    if (groups[i] !== groupName) continue
    const ch = chains[i]
    for (let k = 0; k < ch.length; k += 3) for (let a = 0; a < 3; a++) {
      if (ch[k + a] < min[a]) min[a] = ch[k + a]
      if (ch[k + a] > max[a]) max[a] = ch[k + a]
    }
  }
  return { min, max, center: [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2] }
}

/** '次级芯片-颜色4' bundles 2 physically separate ~40x40 chip boxes (confirmed by inspection) - a
 * single bounding box over both doesn't correspond to either chip's real footprint, so split its
 * chains into 2 clusters by X position (they sit clearly apart, one pair of coordinates in each). */
function splitSat4(chains, groups) {
  const entries = []
  for (let i = 0; i < chains.length; i++) {
    if (groups[i] !== '次级芯片-颜色4') continue
    const ch = chains[i]
    let cx = 0
    const n = ch.length / 3
    for (let k = 0; k < ch.length; k += 3) cx += ch[k]
    entries.push({ cx: cx / n, chain: ch })
  }
  const xs = entries.map((e) => e.cx)
  const splitX = (Math.min(...xs) + Math.max(...xs)) / 2
  const bboxOf = (list) => {
    const min = [Infinity, Infinity, 0], max = [-Infinity, -Infinity, 0]
    for (const e of list) for (let k = 0; k < e.chain.length; k += 3) {
      if (e.chain[k] < min[0]) min[0] = e.chain[k]
      if (e.chain[k] > max[0]) max[0] = e.chain[k]
      if (e.chain[k + 1] < min[1]) min[1] = e.chain[k + 1]
      if (e.chain[k + 1] > max[1]) max[1] = e.chain[k + 1]
    }
    return { min, max, center: [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, 0] }
  }
  return [bboxOf(entries.filter((e) => e.cx < splitX)), bboxOf(entries.filter((e) => e.cx >= splitX))]
}

const STUB_GROUP = '用于连接电路板线路的起始线'

/** Converts a desired on-screen pixel offset from the viewport's own center into a raw DXF-space
 * (x,y) at a given raw z - replicates this cloud's full render pipeline (resampleChains' own
 * center+scale, buildSocialMediaCloud's X-mirror + Y/Z swap, and ParticleCanvas.jsx's
 * setMirroredModel(SOCIAL_ORIENTATION) + SOCIAL_SCALE_PX) and inverts it, so a target like "380px
 * right of center" lands exactly there on screen instead of just somewhere in DXF space that happens
 * to look about right. Used below to place 2 new generated chip nodes in genuinely empty screen
 * margins (verified this session by comparing this formula's predictions against the actually-
 * rendered screen positions of the real chips - matched within a few px). SOCIAL_SCALE_PX=366 must
 * match ParticleCanvas.jsx's own constant of the same name (not imported - that file imports this
 * one, not the reverse). */
function screenTargetToRaw(chains, screenX, screenY, rawZ) {
  const ob = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] }
  for (const ch of chains) for (let i = 0; i < ch.length; i += 3) for (let a = 0; a < 3; a++) {
    if (ch[i + a] < ob.min[a]) ob.min[a] = ch[i + a]
    if (ch[i + a] > ob.max[a]) ob.max[a] = ch[i + a]
  }
  const extent = Math.max(ob.max[0] - ob.min[0], ob.max[1] - ob.min[1], ob.max[2] - ob.min[2])
  const scale = TARGET_EXTENT / extent
  const c = [(ob.min[0] + ob.max[0]) / 2, (ob.min[1] + ob.max[1]) / 2, (ob.min[2] + ob.max[2]) / 2]

  const [qx, qy, qz, qw] = SOCIAL_ORIENTATION
  const x2 = qx + qx, y2 = qy + qy, z2 = qz + qz
  const xx = qx * x2, xy = qx * y2, xz = qx * z2, yy = qy * y2, yz = qy * z2, zz = qz * z2, wx = qw * x2, wy = qw * y2, wz = qw * z2
  const M = [[1 - (yy + zz), xy - wz, xz + wy], [xy + wz, 1 - (xx + zz), yz - wx], [xz - wy, yz + wx, 1 - (xx + yy)]]
  M[0] = M[0].map((v) => -v) // setMirroredModel's row-0 negation (mirrors screen-x)
  const SOCIAL_SCALE_PX = 366

  const vzFixed = (rawZ - c[2]) * scale // the model-space z/"py" this target is pinned at (ground plane rawZ=0)
  const bx = screenX / SOCIAL_SCALE_PX - M[0][1] * vzFixed
  const by = screenY / SOCIAL_SCALE_PX - M[1][1] * vzFixed
  const A00 = -M[0][0], A01 = M[0][2], A10 = -M[1][0], A11 = M[1][2]
  const det = A00 * A11 - A01 * A10
  const vx = (bx * A11 - A01 * by) / det
  const vy = (A00 * by - bx * A10) / det
  return [vx / scale + c[0], vy / scale + c[1]]
}

/**
 * Per request: builds a real PCB network connecting the main chip's 24 real pins to their logical
 * satellite chip, each satellite's own small pin fan-out, and background bus traces spanning well
 * past the chip cluster so the network covers the whole screen - reusing this site's own earlier
 * (now-retired) generative circuit-board cloud's techniques (CircuitParticles.js, see git history:
 * 45deg dogleg turns instead of sharp right angles, and staggered pin fan-outs that don't cross
 * themselves) rather than inventing a new style, just pointed at this scene's *specific* real chips
 * instead of a generic grid. Two things that earlier attempt got wrong, fixed here:
 *   - pins converge PROPORTIONALLY onto a lane spread near their target (preserving pin order, so
 *     lanes never cross each other) instead of all jogging toward one shared point;
 *   - every trace *stops* just outside its target's own bounding box (with a via marking the
 *     connection) instead of running through and past it - connecting to a chip is not the same as
 *     cutting across it. `avoidAll` applies that same "stay outside every real chip's box" rule to
 *     the background buses and scattered vias too.
 */
function buildCircuitForSocial(chains, groups) {
  const [sat4a, sat4b] = splitSat4(chains, groups)
  const satellites = [groupBBox(chains, groups, '次级芯片-颜色2'), groupBBox(chains, groups, '次级芯片-颜色3'), sat4a, sat4b]
  const [sat2, sat3] = satellites
  const allBoxes = [groupBBox(chains, groups, '中心芯片-颜色1'), ...satellites]

  const overall = { min: [Infinity, Infinity], max: [-Infinity, -Infinity] }
  for (const ch of chains) for (let k = 0; k < ch.length; k += 3) for (let a = 0; a < 2; a++) {
    if (ch[k + a] < overall.min[a]) overall.min[a] = ch[k + a]
    if (ch[k + a] > overall.max[a]) overall.max[a] = ch[k + a]
  }
  const W = overall.max[0] - overall.min[0], H = overall.max[1] - overall.min[1]
  // How far past the chip cluster's own footprint the background buses/vias spread - per request
  // ("覆盖全屏"), generous margins on every side so the network reaches well beyond the 5 chips.
  const workMin = [overall.min[0] - W * 0.9, overall.min[1] - H * 0.9]
  const workMax = [overall.max[0] + W * 0.9, overall.max[1] + H * 0.9]

  let seed = 20261003
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
  const range = (lo, hi) => lo + (hi - lo) * rnd()
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)]

  const outChains = [], outGroups = []
  const trace = (poly, group = STUB_GROUP) => { outChains.push(poly.flat()); outGroups.push(group) }
  const viaRing = (cx, cy, r, group = STUB_GROUP) => {
    const n = 14
    const poly = []
    for (let i = 0; i <= n; i++) { const a = (2 * Math.PI * i) / n; poly.push([cx + r * Math.cos(a), cy + r * Math.sin(a), 0]) }
    trace(poly, group)
  }

  const CLEARANCE = 14
  // Pushes `coord` (a position along `axis`) just outside any box it currently falls inside, toward
  // whichever edge is nearer - applied to the main chip's own connections below, and again to the
  // background buses/vias, so nothing in this generated network cuts through a real chip's footprint.
  function avoidAll(coord, axis, skip) {
    let c = coord
    for (const b of allBoxes) {
      if (b === skip) continue
      const lo = b.min[axis] - CLEARANCE, hi = b.max[axis] + CLEARANCE
      if (c > lo && c < hi) c = c - b.center[axis] < 0 ? lo : hi
    }
    return c
  }

  // --- 1. The main chip's 24 real pins, grouped by which edge they exit (established earlier this
  // session: 11 south-pointing, 10 east-pointing, 1 west + 1 north) and connected to their logical
  // target satellite. ---
  const stubs = []
  for (let i = 0; i < chains.length; i++) {
    if (groups[i] !== STUB_GROUP) continue
    const ch = chains[i]
    const n = ch.length / 3
    stubs.push({ start: [ch[0], ch[1], ch[2]], end: [ch[(n - 1) * 3], ch[(n - 1) * 3 + 1], ch[(n - 1) * 3 + 2]] })
  }
  const dirOf = (s) => [s.end[0] - s.start[0], s.end[1] - s.start[1]]
  const southPins = stubs.filter((s) => { const [dx, dy] = dirOf(s); return dy < 0 && Math.abs(dy) > Math.abs(dx) })
  const eastPins = stubs.filter((s) => { const [dx, dy] = dirOf(s); return dx > 0 && Math.abs(dx) > Math.abs(dy) })
  const westNorthPins = stubs.filter((s) => { const [dx, dy] = dirOf(s); return (dx < 0 && Math.abs(dx) >= Math.abs(dy)) || (dy > 0 && Math.abs(dy) >= Math.abs(dx)) })

  /** Connects one group of parallel pins (all exiting along the same axis) to `target`: each pin's
   * position along the row maps *proportionally* (order-preserving, so lanes never cross) onto a
   * lane spread near the target, with a short breakout + 45deg dogleg onto that lane, then stops just
   * outside the target's near edge with a via - a real connection, not a pass-through. */
  function connectPinGroup(pins, target, axis) {
    const primaryAxis = axis === 0 ? 1 : 0
    const sorted = [...pins].sort((a, b) => a.end[axis] - b.end[axis])
    const n = sorted.length
    // Spread kept close to the pins' own original ~10-unit spacing at the main chip (not compressed
    // into the target's own width) per request ("别太密") - the bundle runs roughly parallel instead
    // of narrowing into a tight row right at the chip edge.
    const halfSpread = Math.max((target.max[axis] - target.min[axis]) * 0.45, (n - 1) * 5)
    sorted.forEach((stub, k) => {
      const t = n > 1 ? k / (n - 1) : 0.5
      const laneCoord = target.center[axis] - halfSpread + t * 2 * halfSpread
      const sign = Math.sign(target.center[primaryAxis] - stub.end[primaryAxis]) || 1
      const p0 = stub.end
      const p1 = p0.slice(); p1[primaryAxis] += sign * (8 + rnd() * 6) // short breakout
      const crossDelta = laneCoord - p1[axis]
      const p2 = p1.slice()
      p2[primaryAxis] += sign * Math.abs(crossDelta) // 45deg dogleg: same distance on both axes at once
      p2[axis] = laneCoord
      const halfPrimary = (target.max[primaryAxis] - target.min[primaryAxis]) / 2
      const p3 = p2.slice()
      p3[primaryAxis] = target.center[primaryAxis] - sign * (halfPrimary + CLEARANCE) // stop just outside the target
      trace([p0, p1, p2, p3])
      viaRing(p3[0], p3[1], 4)
    })
  }
  // 2 of the main chip's own pins, stolen from the south/east bundles rather than invented fresh -
  // those 2 directions already trend toward screen-left/screen-right respectively (confirmed by
  // comparing sat2's and sat3's actual rendered screen positions this session), so the new wires read
  // as a natural extension of the same pin layout instead of breaking out from an arbitrary point.
  // Leaves south/east at 10/9 pins each - still a full bundle for sat2/sat3.
  const youtubePin = southPins.shift()
  const linkedinPin = eastPins.pop()
  connectPinGroup(southPins, sat2, 0)
  connectPinGroup(eastPins, sat3, 1)
  // The 2 odd pins (west + north) each connect individually to whichever sat4 sub-chip is nearer.
  for (const stub of westNorthPins) {
    const [dx, dy] = dirOf(stub)
    const axis = Math.abs(dx) >= Math.abs(dy) ? 0 : 1
    const target = Math.hypot(stub.end[0] - sat4a.center[0], stub.end[1] - sat4a.center[1]) < Math.hypot(stub.end[0] - sat4b.center[0], stub.end[1] - sat4b.center[1]) ? sat4a : sat4b
    connectPinGroup([stub], target, axis)
  }

  // --- 1.5. Per request: 2 extra generated (non-DXF) chip nodes for YouTube and LinkedIn, placed at
  // genuinely empty screen margins left/right of the chip cluster (screenTargetToRaw inverts this
  // cloud's real render transform, rather than guessing a DXF-space offset that merely looks plausible
  // before that transform runs) and wired in from the 2 stolen pins above. ---
  const NEW_CHIP_HALF = 20
  function boxAt([cx, cy]) {
    return { min: [cx - NEW_CHIP_HALF, cy - NEW_CHIP_HALF, 0], max: [cx + NEW_CHIP_HALF, cy + NEW_CHIP_HALF, 0], center: [cx, cy, 0] }
  }
  const main = allBoxes[0] // pushed first above, before `...satellites`
  const youtubeBox = boxAt(screenTargetToRaw(chains, -380, 0, 0))
  const linkedinBox = boxAt(screenTargetToRaw(chains, 380, 0, 0))
  allBoxes.push(youtubeBox, linkedinBox) // so bgBus/via placement below routes around these too
  connectPinGroup([youtubePin], youtubeBox, 0)
  connectPinGroup([linkedinPin], linkedinBox, 1)
  // Which way the main cluster sits from each new node, in raw DXF space - used below to keep their
  // own small fan-out pointed away from the cluster instead of doubling back through it.
  function towardMain(box) {
    const dx = main.center[0] - box.center[0], dy = main.center[1] - box.center[1]
    const len = Math.hypot(dx, dy) || 1
    return [dx / len, dy / len]
  }
  function rectOutline(box, group) {
    const { min, max } = box
    trace([[min[0], min[1], 0], [max[0], min[1], 0], [max[0], max[1], 0], [min[0], max[1], 0], [min[0], min[1], 0]], group)
  }
  rectOutline(youtubeBox, YOUTUBE_GROUP)
  rectOutline(linkedinBox, LINKEDIN_GROUP)

  // --- 2. Each satellite's own small pin fan-out (the original circuit-board cloud's staggered,
  // self-non-crossing technique, reused directly - see its own comment in git history). ---
  function chipFanOut(box, group = STUB_GROUP, towardCluster = null) {
    const w = box.max[0] - box.min[0], h = box.max[1] - box.min[1]
    const pitch = Math.max(16, Math.min(w, h) / 2) // wider spacing per request ("别太密") - fewer, more spread-out pins
    let sides = [
      { u: [0, -1], t: [1, 0], n: Math.max(1, Math.floor(w / pitch)), origin: (k) => [box.min[0] + pitch / 2 + k * pitch, box.min[1]] },
      { u: [0, 1], t: [1, 0], n: Math.max(1, Math.floor(w / pitch)), origin: (k) => [box.min[0] + pitch / 2 + k * pitch, box.max[1]] },
      { u: [-1, 0], t: [0, 1], n: Math.max(1, Math.floor(h / pitch)), origin: (k) => [box.min[0], box.min[1] + pitch / 2 + k * pitch] },
      { u: [1, 0], t: [0, 1], n: Math.max(1, Math.floor(h / pitch)), origin: (k) => [box.max[0], box.min[1] + pitch / 2 + k * pitch] },
    ]
    // For the 2 margin-placed nodes (youtube/linkedin): drop any side whose own outward direction
    // points back toward the main cluster, so their fan-out doesn't double back through the existing
    // clutter - they're meant to read as clean, separate icons in open space, not another dense node
    // merged into the rest of the board.
    if (towardCluster) sides = sides.filter((s) => s.u[0] * towardCluster[0] + s.u[1] * towardCluster[1] <= 0)
    for (const s of sides) {
      const mid = (s.n - 1) / 2
      for (let k = 0; k < s.n; k++) {
        const p = s.origin(k)
        const off = k - mid, dir = off < 0 ? -1 : 1, rank = Math.abs(off)
        const h1 = 6 + (mid - rank + 1) * pitch * 0.6 // staggered: pins near the side's own middle turn latest
        const t = [s.t[0] * dir, s.t[1] * dir]
        const D = 10
        const p1 = [p[0] + s.u[0] * h1, p[1] + s.u[1] * h1, 0]
        const p2 = [p1[0] + (s.u[0] + t[0]) * D, p1[1] + (s.u[1] + t[1]) * D, 0]
        const R = range(18, 55)
        const p3 = [p2[0] + t[0] * R, p2[1] + t[1] * R, 0]
        trace([[p[0], p[1], 0], p1, p2, p3], group)
        if (rnd() < 0.5) viaRing(p3[0], p3[1], 3, group)
      }
    }
  }
  satellites.forEach((box) => chipFanOut(box))
  chipFanOut(youtubeBox, YOUTUBE_GROUP, towardMain(youtubeBox))
  chipFanOut(linkedinBox, LINKEDIN_GROUP, towardMain(linkedinBox))

  // --- 3. Background buses spanning the whole working area, so the network reaches past the chip
  // cluster to cover the screen (per request) - same bundle-of-parallel-traces-with-two-45deg-jogs
  // technique as the original circuit board's own bus(), routed around every real chip up front. ---
  function bgBus(horizontal, at, count, pitch) {
    const axis = horizontal ? 1 : 0
    const L = horizontal ? workMax[0] - workMin[0] : workMax[1] - workMin[1]
    const base = horizontal ? workMin[0] : workMin[1]
    const a = range(0.15, 0.4) * L, b = a + range(0.2, 0.35) * L
    const j1 = pick([-1, 1]) * range(40, 110), j2 = pick([-1, 1]) * range(40, 110)
    for (let k = 0; k < count; k++) {
      const o = avoidAll(at + k * pitch, axis)
      const along = [[0, 0], [a, 0], [a + Math.abs(j1), j1], [b, j1], [b + Math.abs(j2 - j1), j2], [L, j2]]
      trace(along.map(([s, d]) => (horizontal ? [base + s, o + d, 0] : [o + d, base + s, 0])))
    }
  }
  for (let i = 0; i < 4; i++) bgBus(true, workMin[1] + range(0.1, 0.9) * (workMax[1] - workMin[1]), Math.round(range(2, 4)), 12)
  for (let i = 0; i < 4; i++) bgBus(false, workMin[0] + range(0.1, 0.9) * (workMax[0] - workMin[0]), Math.round(range(2, 4)), 12)

  // --- 4. Scattered vias/test pads to fill remaining gaps, same as the original. ---
  for (let i = 0; i < 36; i++) {
    const x = avoidAll(range(workMin[0], workMax[0]), 0)
    const y = avoidAll(range(workMin[1], workMax[1]), 1)
    viaRing(x, y, pick([2, 3, 4]))
  }

  return { chains: outChains, groups: outGroups }
}

function reorderBackFirst(geo) {
  const count = geo.positions.length / 3
  const order = []
  for (let i = 0; i < count; i++) if (geo.groups[i]?.endsWith(BACK_SUFFIX)) order.push(i)
  for (let i = 0; i < count; i++) if (!geo.groups[i]?.endsWith(BACK_SUFFIX)) order.push(i)
  const positions = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const groups = new Array(count)
  for (let k = 0; k < count; k++) {
    const i = order[k]
    positions.set(geo.positions.subarray(i * 3, i * 3 + 3), k * 3)
    sizes[k] = geo.sizes[i]
    groups[k] = geo.groups[i]
  }
  return { positions, sizes, groups, transform: geo.transform }
}

/** The social-media particle data, shared by the scene below and the scroll-driven morph overlay.
 * Pure line art (per request, both the satellites' and the main chip's own random mesh-surface fill
 * points have been removed entirely) - every point comes from social-media4.dxf's own curves, no
 * social-media-light.glb mesh sampling involved at all.
 * @param {boolean} [withTraces] - also build the full buildCircuitForSocial() PCB trace network.
 * Opt-in (ParticleCanvas.jsx passes true only for `social2`, the placeholder "next stage" cloud -
 * `social` itself keeps its original, simpler look) rather than always-on, since the two clouds are
 * meant to read as two distinct states for a transition to be designed between them later. */
export function buildSocialMediaCloud(text, withTraces = false) {
  let { chains, chainGroups } = parseDXFToChains(text, { curveSegments: CURVE_SEGMENTS })
  ;({ chains, chainGroups } = dedupeChains(chains, chainGroups))
  // The generated traces deliberately extend well beyond the chip cluster's own footprint (to spread
  // across the screen) - bounding by the ORIGINAL chains only (computed before adding them) keeps the
  // chip cluster itself at its established on-screen size instead of shrinking to fit the new, much
  // larger combined extent.
  const originalBounds = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] }
  for (const ch of chains) for (let i = 0; i < ch.length; i += 3) for (let a = 0; a < 3; a++) {
    if (ch[i + a] < originalBounds.min[a]) originalBounds.min[a] = ch[i + a]
    if (ch[i + a] > originalBounds.max[a]) originalBounds.max[a] = ch[i + a]
  }
  const traces = withTraces ? buildCircuitForSocial(chains, chainGroups) : { chains: [], groups: [] }
  const allChains = [...chains, ...traces.chains]
  const allGroups = [...chainGroups, ...traces.groups]
  const geo = reorderBackFirst(resampleChains(allChains, allGroups, { targetExtent: TARGET_EXTENT, spacing: EDGE_SPACING, bounds: originalBounds }))
  const n = geo.positions.length / 3
  const positions = new Float32Array(geo.positions)

  // social-media4.dxf already marks, per layer, which curves sit on a face turned away from the
  // established camera (every "...背面" layer) - FULL_GROUP_COLORS maps those straight to a
  // pre-lightened color and everything else to its full color, so this is a plain per-point color
  // lookup with no geometry or camera math involved.
  const colors = colorByGroup(geo.groups, FULL_GROUP_COLORS, TRACE_COLOR)

  // A genuine reflection (mirroring X), not just a yaw rotation - a rotation alone can never fix a
  // front/back chirality flip (mirrored avatar faces, a mirrored overall chip arrangement). Confirmed
  // necessary two ways: the reference screenshot's avatar icons read mirrored without this, and the
  // specific left/right chip grouping it shows is provably impossible to reach via any pure rotation
  // of this model's own geometry (verified by solving for a separating line between the two
  // satellite-pairs' raw DXF positions - none exists without a reflection first).
  //
  // Swap Y and Z: DXF's "up" (the chip's own height) is its Z axis, but this file's own
  // SOCIAL_ORIENTATION rotation (like every other scene here) treats THREE's Y as the privileged
  // "up" that `yaw` spins around and keeps fixed - feeding DXF's Z straight into THREE's z (as every
  // other coordinate here does, with no axis remapping) left yaw spinning around the model's own
  // *horizontal* axis instead, which is exactly why its vertical edges weren't staying vertical on
  // screen - see SOCIAL_ORIENTATION's own comment for the full explanation.
  for (let i = 0; i < n; i++) {
    positions[i * 3] *= -1
    const py = positions[i * 3 + 1]
    positions[i * 3 + 1] = positions[i * 3 + 2]
    positions[i * 3 + 2] = py
  }

  return { positions, sizes: geo.sizes, colors }
}

/**
 * Particle-cloud rendering of the post-Industry-4.0 "social media" stage: a central chip carrying a
 * molecule/network diagram, 4 satellite chips each carrying a real avatar-icon curve, the central
 * chip's own edge/notch pattern, and the pin-hatch ticks along its edges - all genuine curve geometry
 * (ARC/SPLINE/POLYLINE), sampled from social-media4.dxf the same way as DNAParticles.jsx/
 * SmartCityParticles.jsx (parseDXF.js's sampleDXF). social-media4.dxf pairs most of its layers with a
 * manually-authored "...背面" twin, already marking which curves sit on a face turned away from this
 * scene's camera (see FULL_GROUP_COLORS) - pure line art, no mesh-surface fill (removed per request).
 * Not wired into the page as its own pinned theme card - ParticleCanvas.jsx morphs the arm straight
 * into buildSocialMediaCloud's data as the page's final backdrop. This default export exists for
 * parity with the other particle files (and ad-hoc preview) rather than being rendered anywhere.
 */
export default function SocialMediaParticles() {
  const text = useLoader(FileLoader, '/models/social-media4.dxf', (loader) => loader.setResponseType('text'))
  const { positions, sizes, colors } = useMemo(() => buildSocialMediaCloud(text), [text])

  return (
    <group quaternion={SOCIAL_ORIENTATION}>
      <ParticleMesh positions={positions} sizes={sizes} colors={colors} particleSize={SOCIAL_PARTICLE_SIZE} />
    </group>
  )
}
