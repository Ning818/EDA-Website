import { useMemo } from 'react'
import { useLoader } from '@react-three/fiber'
import { FileLoader } from 'three'
import { GLTFLoader } from 'three-stdlib'
import * as THREE from 'three'
import { sampleDXF } from './parseDXF'
import { collectTriangles } from './parseGLBLines'
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
export const SOCIAL_PARTICLE_SIZE = 0.03 // same as VLSI_PARTICLE_SIZE/CITY_PARTICLE_SIZE/ARM_PARTICLE_SIZE
// How many mesh-surface fill points to spread across the 5 chip boxes' faces (social-media-light.glb -
// see sampleMeshFill), area-weighted per box. Modest relative to the ~2900 curve points so the
// fill reads as shading under the crisp wireframe, not a competing layer of its own.
const MESH_FILL_COUNT = 700

// Each of social-media.dxf's 6 layers gets one of the site's own particle-cloud accent colors (not
// arbitrary new ones) - reused from DNAParticles.jsx/IndustryArmParticles.jsx/SmartCityParticles.jsx/
// VLSICADParticles.jsx so this scene reads as part of the same established palette. Different source
// layers -> different colors, per request. A satellite chip's own avatar-icon curve shares its chip's
// layer (there's no separate per-icon layer in the DXF), so it naturally matches its chip's color;
// the central chip's molecule-diagram curve has its own layer ("中心芯片上面的图案"), so it gets its
// own contrasting color instead.
const CENTER_COLOR = '#4a9db3' // Smart City's building teal (BUILDING_COLOR)
const CENTER_PATTERN_COLOR = '#89bfce' // CENTER_COLOR lightened ~35% toward white - a shade lighter
// than the chip itself, not near-white (too pale to read against the chip, per feedback)
const SAT2_COLOR = '#6a6fc4' // Industry Arm's ARM_COLOR - a callback since this scene follows the arm
const SAT3_COLOR = '#e0a94a' // the shared highlight/amber used across DNA, Smart City, Arm and VLSI-CAD
const SAT4_COLOR = '#4ab47a' // DNA's DNA_COLOR
const TRACE_COLOR = '#002843' // the site's own navy (nav bar, footer) - the pin-hatch ticks read as
// structural/chrome rather than another themed accent
const GROUP_COLORS = {
  '中心芯片-颜色1': CENTER_COLOR,
  '中心芯片上面的图案': CENTER_PATTERN_COLOR,
  '次级芯片-颜色2': SAT2_COLOR,
  '次级芯片-颜色3': SAT3_COLOR,
  '次级芯片-颜色4': SAT4_COLOR,
  '用于连接电路板线路的起始线': TRACE_COLOR,
}

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

// Maps a point OR a direction/normal (the mapping is purely linear, no translation term) from
// social-media-light.glb's own local space into social-media3.dxf's raw coordinate space, so a
// mesh-sampled fill point can be run through the exact same center/scale/mirror/swap pipeline the
// curve cloud already uses below and land in precisely the same place. Derived by comparing the two
// files' own central-chip box: the GLB's is 1x0.2x1 at local (6.1989,0.1,-4.2317), the DXF's is
// 100x20x100 at (619.89,423.17,10) - a clean x100 scale with GLB's Y (glTF's own up) corresponding
// to DXF's Z (its "up"), and GLB's Z to DXF's Y negated (confirmed against a second chip's center
// independently, not just the one used to derive it).
function glbToDxf(x, y, z) {
  const s = 100
  return [x * s, -z * s, y * s]
}

/** social-media-light.glb's triangles (its 5 chip boxes), converted into the DXF curve cloud's own
 * FINAL (already centered/scaled by `transform`, from sampleDXF's resampleChains - see
 * buildSocialMediaCloud) coordinate space - shared by both sampleMeshFill (the surface-fill points)
 * and nearestTriangleNormal (looking up which real 3D face a curve point actually sits on, below).
 * Position: raw GLB -> raw DXF units (glbToDxf) -> the curve cloud's own centered/scaled space (same
 * `(x-center)*scale` resampleChains itself applies - see sampleLineStrips.js), so this lines up
 * exactly with the curve points' own coordinate space. Normal: glbToDxf alone (no center/scale) -
 * it's a linear map composed of a uniform scale and an orthogonal axis permutation+reflection, so
 * applying it directly to a direction vector (rather than via an inverse-transpose) is already
 * correct, and the subsequent normalize() absorbs the uniform scale factor regardless. */
function collectTrianglesInCloudSpace(gltfScene, transform) {
  const [cx, cy, cz] = transform.center
  const { scale } = transform
  const toCloud = (p) => {
    const [rx, ry, rz] = glbToDxf(p[0], p[1], p[2])
    return [(rx - cx) * scale, (ry - cy) * scale, (rz - cz) * scale]
  }
  // Flips ONLY the box's own height axis (GLB Y, i.e. DXF Z, i.e. "top vs bottom") - NOT a blanket
  // negation of the whole vector. Verified numerically (checking the box's own 4 real corner
  // positions against this scene's established SOCIAL_ORIENTATION+mirror, with zero involvement of
  // this normal code) that the box's geometrically nearest corner is adjacent to 2 *specific* side
  // walls; a full negation flipped those 2 side walls' own facing to the wrong sign along with fixing
  // top/bottom, because it also negates the horizontal (GLB X/Z) components that correctly already
  // picked out the near walls. Negating only `y` here (before glbToDxf) negates just its 3rd output
  // component (DXF Z depends solely on GLB y; DXF X/Y depend solely on GLB x/z - glbToDxf keeps the
  // axes separate, so this leaves the side-wall-determining components untouched) - confirmed this
  // keeps the verified-correct near/far side walls intact while still making the box's artwork-
  // bearing top face (DXF Z=max, where the molecule diagram and every avatar icon actually live -
  // confirmed by checking those curves' own raw DXF Z) read as camera-facing instead of its blank
  // underside.
  const toDir = (v) => {
    const [dx, dy, dz] = glbToDxf(v[0], -v[1], v[2])
    const l = Math.hypot(dx, dy, dz) || 1
    return [dx / l, dy / l, dz / l]
  }
  return collectTriangles(gltfScene)
    .filter((t) => t.na) // only faces with real normals
    .map((t) => ({
      group: t.group,
      a: toCloud(t.a), b: toCloud(t.b), c: toCloud(t.c),
      normal: toDir([(t.na[0] + t.nb[0] + t.nc[0]) / 3, (t.na[1] + t.nb[1] + t.nc[1]) / 3, (t.na[2] + t.nb[2] + t.nc[2]) / 3]),
    }))
}

/** Area-weighted random surface points (no blue-noise thinning, unlike parseGLBLines.js's own
 * sampleGLBLinesAndMesh) since these are plain boxes, not a complex organic shape. `tris` already in
 * the curve cloud's own coordinate space (collectTrianglesInCloudSpace). */
function sampleMeshFill(tris, count) {
  const areas = tris.map((t) => {
    const ux = t.b[0] - t.a[0], uy = t.b[1] - t.a[1], uz = t.b[2] - t.a[2]
    const vx = t.c[0] - t.a[0], vy = t.c[1] - t.a[1], vz = t.c[2] - t.a[2]
    return 0.5 * Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx)
  })
  const cumulative = []
  let total = 0
  for (const a of areas) { total += a; cumulative.push(total) }
  let seed = 20261001
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
  const positions = [], normals = [], groups = []
  for (let n = 0; n < count && total > 0; n++) {
    const r = rnd() * total
    let lo = 0, hi = cumulative.length - 1
    while (lo < hi) { const mid = (lo + hi) >> 1; if (cumulative[mid] < r) lo = mid + 1; else hi = mid }
    const t = tris[lo]
    let u = rnd(), v = rnd()
    if (u + v > 1) { u = 1 - u; v = 1 - v }
    const w = 1 - u - v
    for (let k = 0; k < 3; k++) positions.push(w * t.a[k] + u * t.b[k] + v * t.c[k])
    normals.push(...t.normal)
    groups.push(t.group)
  }
  return { positions, normals, groups }
}

/** Closest point on triangle ABC to point P (Ericson, "Real-Time Collision Detection" 5.1.5) -
 * handles all 7 Voronoi regions (3 vertices, 3 edges, the face) so it's exact everywhere, not just
 * near the face's interior. Arrays, not THREE.Vector3 - this runs per curve-point x per-triangle
 * (thousands x dozens) and avoiding object allocation keeps it cheap. */
function closestPointOnTriangle(p, a, b, c) {
  const abx = b[0] - a[0], aby = b[1] - a[1], abz = b[2] - a[2]
  const acx = c[0] - a[0], acy = c[1] - a[1], acz = c[2] - a[2]
  const apx = p[0] - a[0], apy = p[1] - a[1], apz = p[2] - a[2]
  const d1 = abx * apx + aby * apy + abz * apz
  const d2 = acx * apx + acy * apy + acz * apz
  if (d1 <= 0 && d2 <= 0) return a

  const bpx = p[0] - b[0], bpy = p[1] - b[1], bpz = p[2] - b[2]
  const d3 = abx * bpx + aby * bpy + abz * bpz
  const d4 = acx * bpx + acy * bpy + acz * bpz
  if (d3 >= 0 && d4 <= d3) return b

  const vc = d1 * d4 - d3 * d2
  if (vc <= 0 && d1 >= 0 && d3 <= 0) {
    const t = d1 / (d1 - d3)
    return [a[0] + abx * t, a[1] + aby * t, a[2] + abz * t]
  }

  const cpx = p[0] - c[0], cpy = p[1] - c[1], cpz = p[2] - c[2]
  const d5 = abx * cpx + aby * cpy + abz * cpz
  const d6 = acx * cpx + acy * cpy + acz * cpz
  if (d6 >= 0 && d5 <= d6) return c

  const vb = d5 * d2 - d1 * d6
  if (vb <= 0 && d2 >= 0 && d6 <= 0) {
    const t = d2 / (d2 - d6)
    return [a[0] + acx * t, a[1] + acy * t, a[2] + acz * t]
  }

  const va = d3 * d6 - d5 * d4
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
    const t = (d4 - d3) / (d4 - d3 + (d5 - d6))
    return [b[0] + (c[0] - b[0]) * t, b[1] + (c[1] - b[1]) * t, b[2] + (c[2] - b[2]) * t]
  }

  const denom = 1 / (va + vb + vc)
  const v = vb * denom, w = vc * denom
  return [a[0] + abx * v + acx * w, a[1] + aby * v + acy * w, a[2] + abz * v + acz * w]
}

/** Which real 3D chip-box face a given curve point (already in the cloud's final coordinate space)
 * actually sits on, by genuine closest-surface-point distance (not just nearest triangle centroid -
 * a box's top face is much wider than it is tall, so a point near a top-face corner can sit closer
 * in straight-line distance to a side wall's centroid than to its own top face's; testing the real
 * closest point on every triangle avoids that misclassification). Brute-force over all ~60 triangles
 * per point - cheap enough for a one-time useMemo build (a few thousand points x a few dozen
 * triangles). Returns that triangle's own face normal. */
function nearestTriangleNormal(p, tris) {
  let bestD2 = Infinity, bestNormal = tris[0]?.normal ?? [0, 0, 1]
  for (const t of tris) {
    const q = closestPointOnTriangle(p, t.a, t.b, t.c)
    const dx = p[0] - q[0], dy = p[1] - q[1], dz = p[2] - q[2]
    const d2 = dx * dx + dy * dy + dz * dz
    if (d2 < bestD2) { bestD2 = d2; bestNormal = t.normal }
  }
  return bestNormal
}

/** The social-media particle data, shared by the scene below and the scroll-driven morph overlay. */
export function buildSocialMediaCloud(text, gltf) {
  const geo = sampleDXF(text, { targetExtent: TARGET_EXTENT, spacing: EDGE_SPACING, curveSegments: CURVE_SEGMENTS, dedupeChains: true })
  const baseCount = geo.positions.length / 3

  const tris = gltf ? collectTrianglesInCloudSpace(gltf.scene, geo.transform) : []
  // Mesh-surface fill (social-media-light.glb), in the SAME coordinate space as the curves above -
  // appended as extra points before the shared mirror/swap transform runs, so one pass handles both.
  const fill = tris.length ? sampleMeshFill(tris, MESH_FILL_COUNT) : { positions: [], normals: [], groups: [] }
  const fillCount = fill.positions.length / 3

  const n = baseCount + fillCount
  const positions = new Float32Array(n * 3)
  const colors = new Float32Array(n * 3)
  const sizes = new Float32Array(n)
  const normals = new Float32Array(n * 3)
  const normalMask = new Float32Array(n) // 1 wherever a real face normal was found (both the curve
  // points, below, and the mesh fill points) - those fade toward white when that face faces away
  // from the camera, same as the brain/VLSI-CAD clouds' own back-facing points. 0 (default) only for
  // a curve point when gltf wasn't supplied at all (the no-mesh-data fallback).
  positions.set(geo.positions, 0)
  sizes.set(geo.sizes, 0)
  positions.set(fill.positions, baseCount * 3)
  normals.set(fill.normals, baseCount * 3)
  normalMask.fill(1, baseCount)
  for (let i = 0; i < fillCount; i++) sizes[baseCount + i] = 0.9 // close to the curve points' own ~0.82-1.18

  // Each curve point (the molecule diagram, the avatar icons, the pin-hatch ticks) is drawn directly
  // on some chip box's real surface, so - unlike treating them as always front-facing - look up which
  // face it actually sits on (nearestTriangleNormal) and use that face's own normal, the same way a
  // mesh-fill point's normal comes from the triangle it was sampled from. This makes the curve art
  // itself fade toward white on a face that's turned away from the camera, not just the plain
  // surface-fill dusting layered under it.
  if (tris.length) {
    for (let i = 0; i < baseCount; i++) {
      const p = [geo.positions[i * 3], geo.positions[i * 3 + 1], geo.positions[i * 3 + 2]]
      const nrm = nearestTriangleNormal(p, tris)
      normals[i * 3] = nrm[0]; normals[i * 3 + 1] = nrm[1]; normals[i * 3 + 2] = nrm[2]
    }
    normalMask.fill(1, 0, baseCount)
  }

  const baseColors = colorByGroup(geo.groups, GROUP_COLORS, TRACE_COLOR)
  colors.set(baseColors, 0)
  const fillColors = colorByGroup(fill.groups, GROUP_COLORS, TRACE_COLOR)
  colors.set(fillColors, baseCount * 3)

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
  // screen - see SOCIAL_ORIENTATION's own comment for the full explanation. Applied to both the
  // points and their normals (normals skip the mirror's implicit translate, but get the same sign
  // flip and axis swap).
  for (let i = 0; i < n; i++) {
    positions[i * 3] *= -1
    const py = positions[i * 3 + 1]
    positions[i * 3 + 1] = positions[i * 3 + 2]
    positions[i * 3 + 2] = py
    if (normalMask[i]) {
      normals[i * 3] *= -1
      const ny = normals[i * 3 + 1]
      normals[i * 3 + 1] = normals[i * 3 + 2]
      normals[i * 3 + 2] = ny
    }
  }

  return { positions, sizes, colors, normals, normalMask }
}

/**
 * Particle-cloud rendering of the post-Industry-4.0 "social media" stage: a central chip carrying a
 * molecule/network diagram, 4 satellite chips each carrying a real avatar-icon curve, and the
 * pin-hatch ticks along the central chip's edges - all genuine curve geometry (ARC/SPLINE/POLYLINE),
 * sampled from social-media3.dxf the same way as DNAParticles.jsx/SmartCityParticles.jsx
 * (parseDXF.js's sampleDXF) - plus a sparse mesh-surface fill sampled from social-media-light.glb's 5
 * solid chip boxes, carrying real normals so points facing away from the camera fade toward white
 * (ParticleCanvas.jsx's `backA`/whiteFade, the same mechanism BrainParticles.jsx's own back-facing
 * points use). Not wired into the page as its own pinned theme card - ParticleCanvas.jsx morphs the
 * arm straight into buildSocialMediaCloud's data as the page's final backdrop. This default export
 * exists for parity with the other particle files (and ad-hoc preview) rather than being rendered
 * anywhere.
 */
export default function SocialMediaParticles() {
  const text = useLoader(FileLoader, '/models/social-media3.dxf', (loader) => loader.setResponseType('text'))
  const gltf = useLoader(GLTFLoader, '/models/social-media-light.glb')
  const { positions, sizes, colors, normals, normalMask } = useMemo(() => buildSocialMediaCloud(text, gltf), [text, gltf])

  return (
    <group quaternion={SOCIAL_ORIENTATION}>
      <ParticleMesh positions={positions} sizes={sizes} colors={colors} normals={normals} normalMask={normalMask} particleSize={SOCIAL_PARTICLE_SIZE} />
    </group>
  )
}
