import { useMemo } from 'react'
import { useLoader } from '@react-three/fiber'
import { FileLoader } from 'three'
import * as THREE from 'three'
import { sampleDXF } from './parseDXF'
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

/** Reorders a sampleDXF() result so every "...背面" point comes before every non-背面 point, leaving
 * positions/sizes/groups in sync. Used together with this cloud's own dedicated depthTest:false draw
 * pass (see ParticleCanvas.jsx's `social`) - with depth testing off, whichever point is submitted
 * *last* simply paints over anything already there at that pixel, so front points need to come after
 * every 背面 point in the buffer to reliably win, regardless of either point's own real (and, for this
 * manually-labeled DXF, not reliably camera-accurate) 3D depth. */
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
 * Pure line art now (per request, both the satellites' and the main chip's own random mesh-surface
 * fill points have been removed entirely) - every point comes straight from social-media4.dxf's own
 * curves, with no social-media-light.glb mesh sampling involved at all. */
export function buildSocialMediaCloud(text) {
  const geo = reorderBackFirst(sampleDXF(text, { targetExtent: TARGET_EXTENT, spacing: EDGE_SPACING, curveSegments: CURVE_SEGMENTS, dedupeChains: true }))
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
