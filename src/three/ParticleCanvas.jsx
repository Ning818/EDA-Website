import { Suspense, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { GLTFLoader } from 'three-stdlib'
import { buildBrainCloud, BRAIN_PARTICLE_SIZE } from './BrainParticles'
import { buildVLSICloud, VLSI_ORIENTATION, VLSI_PARTICLE_SIZE } from './VLSICADParticles'
import { buildDNACloud, DNA_PARTICLE_SIZE } from './DNAParticles'
import { buildCityCloud, CITY_ORIENTATION, CITY_PIVOT, CITY_PARTICLE_SIZE } from './SmartCityParticles'
import { buildArmCloud, ARM_ORIENTATION, ARM_PARTICLE_SIZE } from './IndustryArmParticles'
import { buildSocialMediaCloud, SOCIAL_ORIENTATION, SOCIAL_PARTICLE_SIZE, YOUTUBE_BRAND_COLOR, LINKEDIN_BRAND_COLOR, YOUTUBE_SAT2_COLOR } from './SocialMediaParticles'
import { FileLoader } from 'three'
import { matchClouds } from './morphMatch'
import { makeCircleTexture } from './makeCircleTexture'
import { brainState, isMobileView, ARM_EXIT_SCREENS, SOCIAL_HOLD_SCREENS } from './cloudState'

/*
 * One fixed, viewport-sized WebGL "stage" that the particle clouds live on. Page text scrolls over
 * it normally, but the particles do NOT scroll with the sections: they always stay inside the one
 * desktop screen and are driven by scroll progress instead. Right now only the first transition
 * exists - the brain (hero, right side of the screen) scatters in place and regathers as the first
 * theme's cloud (VLSI-CAD, left side of the screen); the other themes get added one at a time later.
 *
 * Where each cloud sits comes from a DOM "anchor" (data-cloud): only its x position and size are
 * used live; its vertical position is taken as a fixed page coordinate, converted to a screen
 * position for the moment it's the section in focus.
 *
 * Each cloud is drawn as if seen by the old per-section camera (position z=CAM looking at the
 * origin, 45deg fov): the vertex shader does that perspective itself in unit space, then places the
 * result in pixels around the cloud's screen center, so every cloud looks the same as before.
 */

const CAM = 6
const CITY_PIVOT_VEC = new THREE.Vector3(...CITY_PIVOT) // Smart City's rotation axis (SmartCityParticles.jsx)
const FOV = 45
const PX_PER_UNIT_PER_ANCHOR_PX = 1 / (2 * CAM * Math.tan((FOV * Math.PI) / 360))
const SPIN_SPEED = 0.6 * ((2 * Math.PI) / 60) // rad/s: OrbitControls' autoRotateSpeed 0.6 (about 0.063 rad/s)
const SWAY_YAW = 0.12, SWAY_PITCH = 0.09, SWAY_EASE = 14 // mouse sway of the four themes

// Brain -> first-theme transition, learned from deepsouth-ai-3d-website.vercel.app and driven by a
// GSAP ScrollTrigger timeline (see the useEffect in Clouds). In order:
//   1. the brain spins horizontally while sliding to where the first theme's cloud sits,
//   2. "destruction": every particle flies out in its own fixed random direction, in a straight line,
//   3. collapse + morph at once: the particles come straight back (linear) while interpolating
//      into the first theme's shape.
// `t` are positions on the timeline (its total length is 1); the timeline is scrubbed by scroll.
const SCRUB = 1.2 // seconds the animation takes to catch up with the scrollbar (smooths it)
const SPIN_TURNS = 1 // extra full horizontal turns the brain makes while it moves
const ARM_PHONE_SCALE = 0.95 // on a phone the Industry 4.0 arm is drawn at this fraction of its box, about the middle of its silhouette
// Brain -> VLSI-CAD: the brain slides to the middle of the screen (turning a full turn from wherever it currently faces),
// scatters and regathers there as the VLSI-CAD cloud. Once that cloud has formed, a time-based (not
// scroll-scrubbed) tween slides it left to its default place - no rotation (see `slide` below).
const VLSI_SLIDE_SECONDS = 1.5
const VLSI_UP_PX = 40 // the VLSI-CAD cloud's default place sits this many px above its anchor's center (it feeds the brain's
// landing spot and the VLSI -> DNA start too, so it all stays consistent)
const SOCIAL_SLIDE_FROM_MORPH = 0.9 // morph progress at which social1's slide left begins
// Theme -> theme transitions 2-4 (VLSI-CAD -> DNA -> Smart City -> Industry 4.0): when a cloud has swept to
// the next theme's side (the end of the scroll timeline's move step) it scatters by itself (time-based) and
// STAYS scattered - at SCATTER_HOLD of the full explosion distance, a loose cloud rather than particles
// flung off-screen - until scrolling on collapses it into the next theme's cloud.
const SCATTER_HOLD = 0.25
const SCATTER_SECONDS = 1.1
// Gets up to full speed within the first ~SLIDE_RAMP of its time (so it flows out of the cloud's settle instead of
// kicking), then lands softly exactly on the left-hand spot - no overshoot or rebound. A power4.out curve with its
// clock warped so speed ramps up from zero instead of starting at maximum.
const SLIDE_RAMP = 0.1
const VLSI_SLIDE_EASE = (t) => {
  const warped = (t < SLIDE_RAMP ? (t * t) / (2 * SLIDE_RAMP) : t - SLIDE_RAMP / 2) / (1 - SLIDE_RAMP / 2)
  return 1 - (1 - warped) ** 4
}
// ARM_EXIT_SCREENS (the arm -> social1 transition's scroll length) and SOCIAL_HOLD_SCREENS: cloudState.js
// Industry 4.0 arm -> social-media chip cluster: once the arm's closing turn ends and scroll passes
// this point, the social-media cloud (SocialMediaParticles.js) just replaces it outright - no
// scatter/regather morph into it (per request, to skip the extra matchClouds/transition work).
// Holds for SOCIAL_HOLD_SCREENS, then cuts (same instant-replace, no morph yet) to `social2` - a
// placeholder duplicate of the exact same cloud, standing in for a planned next stage/transition the
// user will design later. `social2` then holds as the page's final backdrop for everything below it
// (YoutubeSpotlight, LinkedInSection). Home.jsx's own Industry-4.0 `gap` needs to stay wide enough to
// hold this scroll range before those sections scroll into view - see its own comment.
// Click targets for the pressable logo layer of each social stage (opened in a new tab).
const YOUTUBE_URL = 'https://www.youtube.com/@edagrouppolito329/videos'
const LINKEDIN_URL = 'https://www.linkedin.com/company/edagroup-polito/posts/?feedView=all'
// social1 -> social2 is not scrubbed by the scrollbar: scrolling past the end of social1's hold starts it, and it then runs
// to the end by itself over this many seconds (scrolling back past that point plays it in reverse). It takes no scroll
// length of its own. Eased like the clouds' slide (VLSI_SLIDE_EASE): quick off the mark, landing softly with no rebound.
const SOCIAL_MORPH_SECONDS = 0.5
// Px-per-model-unit for the social-media composition once formed - a flat on-screen size (unlike
// the circuit board's old viewport-covering "cover" scale) since this is a compact poster-style
// composition, not a full-bleed wallpaper. Tuned by eye against the Rhino reference screenshots.
const SOCIAL_SCALE_PX = 366
const EXPLODE_DIST = 6 // how far particles fly, x the brain's on-screen radius

const VERTEX = `
  attribute vec3 aPosB;
  attribute vec3 aCol;
  attribute vec3 aColB;
  attribute float aSize;
  attribute float aSizeB;
  attribute vec3 aNormal;
  attribute vec3 aNormalB;
  attribute float aMask;
  attribute float aMaskB;
  attribute float aPress; // 1 = pressable logo point (social clouds), else 0
  attribute float aFill; // -1 = always shown; >= 0 = hover-revealed fill point with that reveal delay
  attribute float aFold;
  attribute vec3 aRand;
  uniform mat3 uModelA;
  uniform mat3 uModelB;
  uniform vec2 uCA;
  uniform vec2 uCB;
  uniform float uScaleA;
  uniform float uScaleB;
  uniform float uBaseA;
  uniform float uBaseB;
  uniform float uBackA;
  uniform float uBackB;
  uniform float uFoldA;
  uniform float uMorph;
  uniform float uDestruct;
  uniform float uExplodeDist;
  uniform float uCam;
  uniform float uPress; // 0..1 how far the logo is pressed in
  uniform float uPressDist; // model-space units sunk at uPress=1
  uniform float uFill; // 0..1 hover reveal progress for the fill points
  uniform vec3 uOffA; // A's rotation-pivot compensation (unit space, added after the model rotation)
  varying vec3 vColor;

  // x,y = pixel offset from the viewport center, z = depth in pixels, w = point size in pixels.
  vec4 place(vec3 p, mat3 M, vec3 off, vec2 c, float sc, float base, float size) {
    vec3 r = M * p + off;
    float k = uCam / (uCam - r.z);
    return vec4(c + r.xy * sc * k, r.z * sc, size * base * sc * k);
  }
  float whiteFade(vec3 p, vec3 n, float mask, float fold, mat3 M, float back, float foldFade) {
    vec3 r = M * p;
    vec3 toCam = normalize(vec3(0.0, 0.0, uCam) - r);
    float facing = mask > 0.5 ? dot(normalize(M * n), toCam) : 1.0;
    return max(facing >= 0.0 ? 0.0 : back, fold * foldFade);
  }
  void main() {
    // Pressing sinks the logo points along the model's own vertical (+Y is up in model space), so it reads
    // as pushing into the chip from any view angle.
    vec3 posA = position - vec3(0.0, 1.0, 0.0) * aPress * uPress * uPressDist;
    vec4 a = place(posA, uModelA, uOffA, uCA, uScaleA, uBaseA, aSize);
    if (aFill >= 0.0) a.w *= smoothstep(0.0, 0.4, uFill - aFill);
    vec3 col = mix(aCol, vec3(1.0), whiteFade(position, aNormal, aMask, aFold, uModelA, uBackA, uFoldA));
    vec3 pos = a.xyz;
    float size = a.w;
    if (uMorph > 0.0) {
      vec4 b = place(aPosB, uModelB, vec3(0.0), uCB, uScaleB, uBaseB, aSizeB);
      vec3 colB = mix(aColB, vec3(1.0), whiteFade(aPosB, aNormalB, aMaskB, 0.0, uModelB, uBackB, 0.0));
      pos = mix(a.xyz, b.xyz, uMorph);
      size = mix(a.w, b.w, uMorph);
      col = mix(col, colB, uMorph);
    }
    // Destruction: every particle straight out along its own fixed random direction.
    pos += aRand * uExplodeDist * uDestruct;
    vColor = col;
    gl_PointSize = max(size, 0.0);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`

const FRAGMENT = `
  uniform sampler2D uMap;
  varying vec3 vColor;
  vec3 linearToSRGB(vec3 c) {
    vec3 lo = c * 12.92;
    vec3 hi = 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055;
    return mix(lo, hi, step(vec3(0.0031308), c));
  }
  void main() {
    if (texture2D(uMap, gl_PointCoord).a < 0.5) discard;
    gl_FragColor = vec4(linearToSRGB(vColor), 1.0);
  }
`

function rotated(positions, q) {
  const out = new Float32Array(positions.length)
  const v = new THREE.Vector3()
  for (let i = 0; i < positions.length; i += 3) {
    v.set(positions[i], positions[i + 1], positions[i + 2]).applyQuaternion(q)
    out[i] = v.x; out[i + 1] = v.y; out[i + 2] = v.z
  }
  return out
}

const defaultNormals = (len) => Float32Array.from({ length: len * 3 }, (_, i) => (i % 3 === 2 ? 1 : 0))

/** THREE.Points for one cloud; `b` (optional) is the morph target, already matched 1:1 to a's points. */
function makePoints(map, a, base, b) {
  const n = a.positions.length / 3
  const g = new THREE.BufferGeometry()
  const aNormals = a.normals ?? defaultNormals(n)
  const aMask = a.normalMask ?? new Float32Array(n).fill(a.normals ? 1 : 0)
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(a.positions), 3))
  g.setAttribute('aCol', new THREE.BufferAttribute(new Float32Array(a.colors), 3))
  g.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(a.sizes), 1))
  g.setAttribute('aNormal', new THREE.BufferAttribute(new Float32Array(aNormals), 3))
  g.setAttribute('aMask', new THREE.BufferAttribute(new Float32Array(aMask), 1))
  g.setAttribute('aFold', new THREE.BufferAttribute(new Float32Array(a.foldWeights ?? new Float32Array(n)), 1))
  const rand = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    // Uniform random direction, random length 0.35..1 (fixed per particle).
    const z = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, r = Math.sqrt(1 - z * z), len = 0.35 + 0.65 * Math.random()
    rand[i * 3] = r * Math.cos(th) * len; rand[i * 3 + 1] = r * Math.sin(th) * len; rand[i * 3 + 2] = z * len
  }
  g.setAttribute('aRand', new THREE.BufferAttribute(rand, 3))
  g.setAttribute('aPress', new THREE.BufferAttribute(new Float32Array(a.press ?? new Float32Array(n)), 1))
  g.setAttribute('aFill', new THREE.BufferAttribute(new Float32Array(a.fill ?? new Float32Array(n).fill(-1)), 1))
  const t = b ?? { positions: a.positions, colors: a.colors, sizes: a.sizes, normals: aNormals, mask: aMask }
  g.setAttribute('aPosB', new THREE.BufferAttribute(new Float32Array(t.positions), 3))
  g.setAttribute('aColB', new THREE.BufferAttribute(new Float32Array(t.colors), 3))
  g.setAttribute('aSizeB', new THREE.BufferAttribute(new Float32Array(t.sizes), 1))
  g.setAttribute('aNormalB', new THREE.BufferAttribute(new Float32Array(t.normals), 3))
  g.setAttribute('aMaskB', new THREE.BufferAttribute(new Float32Array(t.mask), 1))
  const m = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      uMap: { value: map },
      uModelA: { value: new THREE.Matrix3() }, uModelB: { value: new THREE.Matrix3() },
      uCA: { value: new THREE.Vector2() }, uCB: { value: new THREE.Vector2() },
      uScaleA: { value: 1 }, uScaleB: { value: 1 },
      uBaseA: { value: base.a }, uBaseB: { value: base.b ?? base.a },
      uBackA: { value: base.backA ?? 0 }, uBackB: { value: base.backB ?? 0 }, uFoldA: { value: base.foldA ?? 0 },
      uMorph: { value: 0 }, uDestruct: { value: 0 }, uExplodeDist: { value: 0 },
      uPress: { value: 0 }, uPressDist: { value: 0.05 }, uFill: { value: 0 },
      // uCam feeds place()'s k = uCam/(uCam-r.z) perspective-divide factor; a huge value makes k≈1
      // for any reasonable r.z, i.e. an orthographic (no-perspective) look for this cloud specifically
      // - SocialMediaParticles.js's "no perspective, true isometric" request, without touching the
      // perspective every other cloud on this shared shader still uses (uCam is per-material, not
      // shared across makePoints() calls).
      uCam: { value: base.orthographic ? 1e6 : CAM },
      uOffA: { value: new THREE.Vector3() },
    },
    // depthTest:false (default true, elsewhere): for an overlay that must always read as "on top" of
    // another cloud sharing the same screen position (SocialMediaParticles.js's icon-pictogram
    // points over their chip's own densely-sampled surface points) rather than competing pixel-by-
    // pixel on this scene's custom depth (place()'s r.z*scale, fed straight into gl_Position with no
    // perspective divide) - a small, tasteful offset there is enough to lose a depth test against a
    // box face's own ~0.05-thick point spread, but disabling the test entirely draws it cleanly
    // regardless.
    depthTest: base.depthTest ?? true,
    // Same fix BrainParticles.jsx/VLSICADParticles.jsx's own ParticleMesh.jsx already applies for
    // their hand/brain back-face points: THREE's own default here (true) should already cover this,
    // but passing it explicitly for SocialMediaParticles.js's cloud specifically (base.depthWrite) to
    // rule out any doubt that a back-facing point might render after - and so visually sit on top of -
    // a front one it shares screen space with, regardless of actual draw order.
    depthWrite: base.depthWrite ?? true,
  })
  const obj = new THREE.Points(g, m)
  obj.frustumCulled = false
  return obj
}

const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion(), _m4 = new THREE.Matrix4(), _yAxis = new THREE.Vector3(0, 1, 0), _v = new THREE.Vector3()
function setModel(mat3, q) {
  _m4.makeRotationFromQuaternion(q)
  mat3.setFromMatrix4(_m4)
}
// Like setModel, but the result is a true mirror image of the normal rotation (screen-x negated,
// screen-y/depth untouched) rather than just a different rotation - picking a different yaw instead
// changes *which* azimuth you're looking from (a genuinely different view, not a left-right flip of
// this one: confirmed numerically that two opposite yaws do not produce negated-x/same-y results for
// general points), whereas negating the matrix's row 0 (mat3 is column-major, so that's elements
// 0,3,6) gives screen-x' = -screen-x for every point, exactly a mirror of whatever q alone would
// render - including the avatar icons reading backwards, same as any real mirror reverses faces.
function setMirroredModel(mat3, q) {
  setModel(mat3, q)
  mat3.elements[0] *= -1
  mat3.elements[3] *= -1
  mat3.elements[6] *= -1
}

/**
 * For a transition into a BIGGER cloud: the source cloud expanded to the target's point count. Each
 * extra target point starts out as a size-0 copy of the source point it is matched to, so it grows
 * out of the source shape instead of appearing from nowhere. `target`/`extra` come from
 * matchClouds(bStage, aStage) (the bigger cloud first). Returns the expanded source plus the bigger
 * cloud's own data in its original point order, as the morph target.
 */
function expandedSource(aCloud, bCloud, { target, extra }) {
  const n = target.length
  const src = { positions: new Float32Array(n * 3), colors: new Float32Array(n * 3), sizes: new Float32Array(n) }
  for (let i = 0; i < n; i++) {
    const j = target[i]
    src.positions.set(aCloud.positions.subarray(j * 3, j * 3 + 3), i * 3)
    src.colors.set(aCloud.colors.subarray(j * 3, j * 3 + 3), i * 3)
    src.sizes[i] = extra[i] ? 0 : aCloud.sizes[j]
  }
  const tgt = {
    positions: bCloud.positions, colors: bCloud.colors, sizes: bCloud.sizes,
    normals: bCloud.normals ?? defaultNormals(n), mask: bCloud.normalMask ?? new Float32Array(n).fill(bCloud.normals ? 1 : 0),
  }
  return { src, tgt }
}

/**
 * Like matchedTarget, but for a morph that ends on a cloud whose draw order matters (the social clouds: depth
 * test off, "...back side" points must be submitted before the front ones). The source cloud is reordered so its
 * points are sorted by the index of the target point they land on - since the target cloud is already
 * back-first, the morph's last frame then has the same draw order as the social cloud it hands over to.
 * Returns { src, tgt } (src = aCloud reordered, tgt = b's data for each reordered a point).
 */
function orderedMatch(aCloud, aStage, bCloud, bStage) {
  const { target, extra } = matchClouds(aStage, bStage)
  const n = target.length
  const order = Array.from({ length: n }, (_, i) => i).sort((p, q) => target[p] - target[q] || p - q)
  const src = { positions: new Float32Array(n * 3), colors: new Float32Array(n * 3), sizes: new Float32Array(n) }
  const tgt = {
    positions: new Float32Array(n * 3), colors: new Float32Array(n * 3), sizes: new Float32Array(n),
    normals: new Float32Array(n * 3), mask: new Float32Array(n),
  }
  order.forEach((i, k) => {
    const j = target[i]
    src.positions.set(aCloud.positions.subarray(i * 3, i * 3 + 3), k * 3)
    src.colors.set(aCloud.colors.subarray(i * 3, i * 3 + 3), k * 3)
    src.sizes[k] = aCloud.sizes[i]
    tgt.positions.set(bCloud.positions.subarray(j * 3, j * 3 + 3), k * 3)
    tgt.colors.set(bCloud.colors.subarray(j * 3, j * 3 + 3), k * 3)
    tgt.sizes[k] = extra[i] ? 0 : bCloud.sizes[j]
  })
  return { src, tgt }
}

/**
 * In-place morph data between two clouds that share most of their geometry (social1 -> social2: same chips, a
 * different logo and icons). Points sitting at the same position in both clouds are paired with each other (they
 * stay exactly where they are; only their color/size may change). Only the leftover points - the ones that really
 * differ - are matched across (matchClouds, in the given pixel-space frames), so only those travel. Where one side
 * has more leftovers, the extra points grow out of / shrink into their nearest partner.
 * Entries are ordered by the index of the b point they end on (b's draw order = the end state's draw order).
 * Returns { src, tgt } in makePoints' morph format, and `moving` = how many entries actually move.
 */
function inPlaceMatch(a, aPx, b, bPx) {
  const nA = a.sizes.length, nB = b.sizes.length
  const q = (p, i) => `${Math.round(p[i * 3] * 1e4)},${Math.round(p[i * 3 + 1] * 1e4)},${Math.round(p[i * 3 + 2] * 1e4)}`
  const bAt = new Map()
  for (let j = 0; j < nB; j++) { const k = q(b.positions, j); if (!bAt.has(k)) bAt.set(k, []); bAt.get(k).push(j) }
  const entries = [] // { ai, bi, aSize, bSize } - ai/bi are indices into a/b whose data is the start / end of this point
  const usedB = new Uint8Array(nB), usedA = new Uint8Array(nA)
  for (let i = 0; i < nA; i++) {
    const list = bAt.get(q(a.positions, i))
    const j = list?.find((x) => !usedB[x])
    if (j !== undefined) { usedB[j] = usedA[i] = 1; entries.push({ ai: i, bi: j, aSize: a.sizes[i], bSize: b.sizes[j] }) }
  }
  const stay = entries.length
  const restA = [], restB = []
  for (let i = 0; i < nA; i++) if (!usedA[i]) restA.push(i)
  for (let j = 0; j < nB; j++) if (!usedB[j]) restB.push(j)
  const sub = (px, idx) => { const o = new Float32Array(idx.length * 3); idx.forEach((i, k) => o.set(px.subarray(i * 3, i * 3 + 3), k * 3)); return o }
  if (restA.length && restB.length) {
    if (restB.length >= restA.length) {
      const { target, extra } = matchClouds(sub(bPx, restB), sub(aPx, restA))
      restB.forEach((j, k) => { const i = restA[target[k]]; entries.push({ ai: i, bi: j, aSize: extra[k] ? 0 : a.sizes[i], bSize: b.sizes[j] }) })
    } else {
      const { target, extra } = matchClouds(sub(aPx, restA), sub(bPx, restB))
      restA.forEach((i, k) => { const j = restB[target[k]]; entries.push({ ai: i, bi: j, aSize: a.sizes[i], bSize: extra[k] ? 0 : b.sizes[j] }) })
    }
  } else {
    // One side has no leftovers at all: its partners simply grow in / shrink away in place.
    restB.forEach((j) => entries.push({ ai: 0, bi: j, aSize: 0, bSize: b.sizes[j] }))
    restA.forEach((i) => entries.push({ ai: i, bi: 0, aSize: a.sizes[i], bSize: 0 }))
  }
  entries.sort((p, r) => p.bi - r.bi)
  const n = entries.length
  const src = { positions: new Float32Array(n * 3), colors: new Float32Array(n * 3), sizes: new Float32Array(n) }
  const tgt = { positions: new Float32Array(n * 3), colors: new Float32Array(n * 3), sizes: new Float32Array(n), normals: new Float32Array(n * 3), mask: new Float32Array(n) }
  entries.forEach((e, k) => {
    src.positions.set(a.positions.subarray(e.ai * 3, e.ai * 3 + 3), k * 3)
    src.colors.set(a.colors.subarray(e.ai * 3, e.ai * 3 + 3), k * 3)
    src.sizes[k] = e.aSize
    tgt.positions.set(b.positions.subarray(e.bi * 3, e.bi * 3 + 3), k * 3)
    tgt.colors.set(b.colors.subarray(e.bi * 3, e.bi * 3 + 3), k * 3)
    tgt.sizes[k] = e.bSize
  })
  return { src, tgt, stay, total: n }
}

/** A social cloud without its hover-revealed fill points (those start invisible; they are not part of the morph). */
function withoutFill(cloud) {
  const keep = []
  for (let i = 0; i < cloud.fill.length; i++) if (cloud.fill[i] < 0) keep.push(i)
  const out = { positions: new Float32Array(keep.length * 3), colors: new Float32Array(keep.length * 3), sizes: new Float32Array(keep.length) }
  keep.forEach((i, k) => {
    out.positions.set(cloud.positions.subarray(i * 3, i * 3 + 3), k * 3)
    out.colors.set(cloud.colors.subarray(i * 3, i * 3 + 3), k * 3)
    out.sizes[k] = cloud.sizes[i]
  })
  return out
}

/** Matches `a` (bigger or equal, already in the stage frame) to `b` and returns b's data reordered to a's points. */
function matchedTarget(aStage, bCloud, bStage) {
  const { target, extra } = matchClouds(aStage, bStage)
  const nA = aStage.length / 3
  const t = {
    positions: new Float32Array(nA * 3), colors: new Float32Array(nA * 3), sizes: new Float32Array(nA),
    normals: new Float32Array(nA * 3), mask: new Float32Array(nA),
  }
  for (let i = 0; i < nA; i++) {
    const j = target[i]
    t.positions.set(bCloud.positions.subarray(j * 3, j * 3 + 3), i * 3) // unrotated; the B model matrix rotates it live
    t.colors.set(bCloud.colors.subarray(j * 3, j * 3 + 3), i * 3)
    t.sizes[i] = extra[i] ? 0 : bCloud.sizes[j]
    if (bCloud.normals) t.normals.set(bCloud.normals.subarray(j * 3, j * 3 + 3), i * 3)
    t.mask[i] = bCloud.normalMask ? bCloud.normalMask[j] : 0
  }
  return t
}

/**
 * The scroll-scrubbed timeline for one transition: spin + slide, then explode, then collapse and
 * morph at once (see the constants above). It runs while scroll goes from `start` to `end`.
 */
function transitionTimeline(anim, start, end) {
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: document.documentElement, start, end, scrub: SCRUB, invalidateOnRefresh: true },
  })
  // Timeline positions are fractions of the scroll range. The slide/spin gets the longest stretch so
  // the turn is slow, and the new shape is fully formed by 0.92 - the last 8% is a pause on it.
  tl.to(anim, { move: 1, spin: 1, duration: 0.45, ease: 'power2.inOut' }, 0) // 1. spin + slide (eased)
  tl.to(anim, { destruct: 1, duration: 0.25 }, 0.45) // 2. straight-line explosion
  tl.to(anim, { destruct: 0, duration: 0.18 }, 0.7) // 3a. collapse (faster)...
  tl.to(anim, { morph: 1, duration: 0.22 }, 0.7) // 3b. ...while morphing into the next shape
  tl.to({}, { duration: 0.08 }, 0.92) // hold on the finished shape
  return tl
}

/**
 * Brain -> VLSI-CAD: `move` = brain turns a full turn (from its current angle) and slides to the screen
 * middle; `destruct`/`morph` = scatter and regather there. The cloud's own slide to the left (`slide`,
 * 0->1) is NOT on this scroll timeline: it is a time-based eased tween fired when the cloud finishes
 * forming (see useFrame), so it springs into place by itself.
 */
// Constant speed for the first part of a step, then a quadratic slow-down to a dead stop at the end - so the
// cloud settles onto its finished shape instead of hitting it at full speed (position continuous, speed
// continuous at DECEL_FROM, and exactly 1 with zero speed at t=1).
const DECEL_FROM = 0.6
const decelEnd = (t) => {
  const v = 2 / (1 + DECEL_FROM)
  if (t <= DECEL_FROM) return v * t
  const s = t - DECEL_FROM
  return v * DECEL_FROM + v * s - (v * s * s) / (2 * (1 - DECEL_FROM))
}

function brainTimeline(anim, start, end) {
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: document.documentElement, start, end, scrub: SCRUB, invalidateOnRefresh: true },
  })
  // Same step lengths as before the slide left the timeline; the scroll distance it needs is trimmed to match
  // (Home.jsx's spacer), rather than stretching these out.
  tl.to(anim, { move: 1, spin: 1, duration: 0.32, ease: 'power2.inOut' }, 0)
  tl.to(anim, { destruct: 1, duration: 0.16 }, 0.32)
  tl.to(anim, { destruct: 0, duration: 0.14, ease: decelEnd }, 0.48) // regather: eases into rest
  tl.to(anim, { morph: 1, duration: 0.18, ease: decelEnd }, 0.48) // morph: eases into the finished shape
  tl.to({}, { duration: 0.06 }, 0.66)
  return tl
}

/**
 * Theme -> theme (transitions 2-4): the cloud sweeps to the next theme's side while turning (`move`);
 * reaching it triggers a time-based scatter (see SCATTER_HOLD) instead of a scroll-scrubbed explosion, so the
 * explosion step is gone. A short scroll hold lets the scattered state be seen, then the cloud collapses
 * (`collapse` 0->1) and morphs into the next cloud at once. Steps keep their old lengths; the timeline is
 * 0.87 long instead of 1 (the explosion's 0.25 replaced by the 0.12 hold), so Home.jsx's gap for each of
 * these transitions is 161vh (the transition spans gap + 100vh = 0.87 x 300vh).
 */
function scatteredTimeline(anim, start, end) {
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: document.documentElement, start, end, scrub: SCRUB, invalidateOnRefresh: true },
  })
  tl.to(anim, { move: 1, spin: 1, duration: 0.45, ease: 'power2.inOut' }, 0)
  tl.to(anim, { collapse: 1, duration: 0.18 }, 0.57)
  tl.to(anim, { morph: 1, duration: 0.22 }, 0.57)
  tl.to({}, { duration: 0.08 }, 0.79)
  return tl
}

// Scroll positions for a theme section, whose content is pinned (sticky) for its whole dwell:
// pinStart = the section's top reaches the top of the screen (its text is now centered and stays put),
// pinEnd = the pin releases. A transition into a theme ends at its pinStart; the next one starts at pinEnd.
/**
 * The social stage on the phone layout: the cloud sits above the copy (SocialCopy.jsx stacks the copy at the bottom of the
 * screen), centred in the space between the top of the page and the copy, shrunk from SOCIAL_SCALE_PX to fit that space and
 * the screen's width. Returns the cloud's origin (px from the screen centre, y up) and scale.
 */
// The brain's silhouette centre relative to its anchor (fractions of the anchor's height), for the phone layout; the theme
// clouds carry theirs as --fx / --fy on their anchors.
const BRAIN_CENTER = { fx: 0.042, fy: -0.008 }
/**
 * Phone layout: makes a cloud's full turn (about the screen's vertical axis, applied after its own orientation) go round its
 * silhouette's centre instead of its origin, so the turn doesn't swing the cloud sideways off the narrow screen. `o` is the
 * silhouette centre relative to the origin (px), `scale` the cloud's px per unit, `spin` its 0..1 turn progress. Written
 * into the material's uOffA (unit space, added after the rotation): V - Ry(theta) V for V = the centre's offset.
 */
function spinAboutCentre(u, o, scale, spin) {
  const th = spin * SPIN_TURNS * 2 * Math.PI
  const vx = o.x / scale
  u.uOffA.value.set(vx * (1 - Math.cos(th)), 0, vx * Math.sin(th))
}
const PHONE_SOCIAL_TOP = 64 // px kept clear at the top (the header slides back in over it)
const PHONE_SOCIAL_SIDE = 16 // px kept clear at each side
const PHONE_SOCIAL_GAP = 16 // px between the cloud and the copy
let socialCopyWrap = null
function phoneSocial(box, vw, vh) {
  if (!socialCopyWrap?.isConnected) socialCopyWrap = document.querySelector('[data-social-copy-wrap]')
  // The wrapper is as tall as the taller of the two copy blocks (they share its top edge), so the cloud doesn't jump
  // between social1 and social2.
  const copyTop = socialCopyWrap ? socialCopyWrap.getBoundingClientRect().top : vh * 0.6
  const availW = vw - 2 * PHONE_SOCIAL_SIDE, availH = Math.max(80, copyTop - PHONE_SOCIAL_GAP - PHONE_SOCIAL_TOP)
  const k = Math.min(1, availW / (box.maxX - box.minX), availH / (box.maxY - box.minY))
  const midY = PHONE_SOCIAL_TOP + availH / 2 // screen y (down) of the cloud's centre
  const cy = vh / 2 - midY // where the cloud's centre goes (y up from the screen centre)
  return {
    scale: SOCIAL_SCALE_PX * k,
    x: -k * (box.minX + box.maxX) / 2,
    y: cy - k * (box.minY + box.maxY) / 2,
    cx: 0,
    cy,
  }
}

const themeSection = (anchorName) => document.querySelector(`[data-cloud="${anchorName}"]`)?.closest('section')
const pinStart = (anchorName) => () => {
  const sec = themeSection(anchorName)
  return sec ? Math.max(1, sec.getBoundingClientRect().top + window.scrollY) : 1
}
export const pinEnd = (anchorName) => () => {
  const sec = themeSection(anchorName)
  return sec ? Math.max(1, sec.getBoundingClientRect().bottom + window.scrollY - window.innerHeight) : 1
}

function logoPoints(cloud) {
  const out = []
  for (let i = 0; i < cloud.press.length; i++) if (cloud.press[i]) out.push(cloud.positions[i * 3], cloud.positions[i * 3 + 1], cloud.positions[i * 3 + 2])
  return new Float32Array(out)
}

function convexHull(pts) {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const half = (list) => {
    const h = []
    for (const q of list) {
      while (h.length >= 2 && cross(h[h.length - 2], h[h.length - 1], q) <= 0) h.pop()
      h.push(q)
    }
    h.pop()
    return h
  }
  return [...half(p), ...half([...p].reverse())]
}
function insideHull(hull, x, y) {
  for (let i = 0; i < hull.length; i++) {
    const a = hull[i], b = hull[(i + 1) % hull.length]
    if ((b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]) < 0) return false
  }
  return hull.length > 2
}

function Clouds() {
  const brainGltf = useLoader(GLTFLoader, '/models/brain.glb')
  const chipsGltf = useLoader(GLTFLoader, '/models/chips.glb')
  const dnaText = useLoader(FileLoader, '/models/dna6.dxf', (l) => l.setResponseType('text'))
  const armGltf = useLoader(GLTFLoader, '/models/industry-arm.glb')
  const cityText = useLoader(FileLoader, '/models/smart-city13.dxf', (l) => l.setResponseType('text'))
  // social = YouTube line art, social2 = LinkedIn line art (same layer names/extents as social-media4.dxf).
  const socialText = useLoader(FileLoader, '/models/social-media-youtube2.dxf', (l) => l.setResponseType('text'))
  const social2Text = useLoader(FileLoader, '/models/social-media-linkedin.dxf', (l) => l.setResponseType('text'))
  const sway = useRef({ tx: 0, ty: 0, x: 0, y: 0 })
  // [0] VLSI-CAD cloud, [1] social1: v = 0 at the screen middle .. 1 at its left default place; done = was it formed last frame (null = first frame)
  const slides = useRef([{ v: 0, done: null }, { v: 0, done: null }])
  const cityLeft = useRef({ key: '', edge: 0 }) // where the Smart City cloud's left edge sits on screen (px from the viewport's left), cached per layout
  // Transitions 2-4: v = 0 gathered .. 1 scattered (at SCATTER_HOLD); moveDone = had the cloud reached the next side last frame (null = first frame)
  const scatters = useRef([{ v: 0, moveDone: null }, { v: 0, moveDone: null }, { v: 0, moveDone: null }])
  const press = useRef({ hover: false, down: false, value: 0, fill: 0 }) // the social logo's press state
  const anchors = useRef({})
  // Animated by the ScrollTrigger timelines below; read every frame. One per transition.
  const anim1 = useRef({ move: 0, spin: 0, destruct: 0, morph: 0 }) // brain -> VLSI-CAD
  const anim2 = useRef({ move: 0, spin: 0, collapse: 0, morph: 0 }) // VLSI-CAD -> DNA
  const anim3 = useRef({ move: 0, spin: 0, collapse: 0, morph: 0 }) // DNA -> Smart City
  const anim5 = useRef({ move: 0, spin: 0, destruct: 0, morph: 0 }) // Industry 4.0 arm -> social1 (same shape as brain -> VLSI-CAD)
  const anim6 = useRef({ morph: 0 }) // social1 -> social2, in place (time-based, see SOCIAL_MORPH_SECONDS)
  const social2Crossed = useRef(null) // was the scroll past social1's hold last frame (null = first frame)
  const copyState = useRef({ y: 0, l: 0, els: {}, last: {} }) // the YouTube / LinkedIn copy beside social1 / social2 (SocialCopy.jsx)
  const anim4 = useRef({ move: 0, spin: 0, collapse: 0, morph: 0 }) // Smart City -> Industry 4.0

  const scene = useMemo(() => {
    const map = makeCircleTexture()
    const brain = buildBrainCloud(brainGltf)
    const vlsi = buildVLSICloud(chipsGltf)
    const dna = buildDNACloud(dnaText)
    const city = buildCityCloud(cityText)
    const qCity = new THREE.Quaternion(...CITY_ORIENTATION)
    const cityRot = rotated(city.positions, qCity) // the city's default-pose points (unit space), for measuring where its left edge sits on screen
    const cityStage = cityRot.map((v) => v * 260)
    const arm = buildArmCloud(armGltf)
    const qArm = new THREE.Quaternion(...ARM_ORIENTATION)
    const armStage = rotated(arm.positions, qArm).map((v) => v * 260)
    // The arm has more points than the city: match the arm to the city and grow the extras out of it.
    const ex4 = expandedSource(city, arm, matchClouds(armStage, cityStage))
    const social = buildSocialMediaCloud(socialText, false, YOUTUBE_BRAND_COLOR, { '次级芯片-颜色2': YOUTUBE_SAT2_COLOR, '次级芯片-颜色2上的图案': YOUTUBE_SAT2_COLOR }, { skipOutermost: true }) // layers: satellite chip color 2 and the pattern on it
    // Circuit-trace drawing is switched off per request; pass `true` as a 2nd arg to bring it back.
    const social2 = buildSocialMediaCloud(social2Text, false, LINKEDIN_BRAND_COLOR, null, true)
    const qSocial = new THREE.Quaternion(...SOCIAL_ORIENTATION)
    const qVlsi = new THREE.Quaternion(...VLSI_ORIENTATION)
    const vlsiStage = rotated(vlsi.positions, qVlsi).map((v) => v * 260)
    // Each transition matches the earlier cloud's points 1:1 to the next one's (the earlier one has
    // more; its surplus shrinks away at the end).
    const tgt1 = matchedTarget(brain.positions.map((v) => v * 140), vlsi, vlsiStage)
    const tgt2 = matchedTarget(vlsiStage, dna, dna.positions.map((v) => v * 260))
    const tgt3 = matchedTarget(dna.positions.map((v) => v * 260), city, cityStage)
    // Arm -> social1: stage frames in on-screen pixels (the arm at its pinned-element scale, the mirrored social cloud at
    // SOCIAL_SCALE_PX), so the point matching pairs points that really are near each other on screen.
    const socialBase = withoutFill(social)
    const armPx = rotated(arm.positions, qArm).map((v) => v * 478 * PX_PER_UNIT_PER_ANCHOR_PX)
    const socialPx = rotated(socialBase.positions, qSocial).map((v, i) => (i % 3 === 0 ? -v : v) * SOCIAL_SCALE_PX)
    const armToSocialMatch = orderedMatch(arm, armPx, socialBase, socialPx)
    // social1 -> social2 in place: only the points that differ between the two clouds move.
    const social2Base = withoutFill(social2)
    const social2Px = rotated(social2Base.positions, qSocial).map((v, i) => (i % 3 === 0 ? -v : v) * SOCIAL_SCALE_PX)
    const social1To2Match = inPlaceMatch(socialBase, socialPx, social2Base, social2Px)
    // How far the social cloud reaches to the left of its own center on screen (px), for limiting its leftward slide.
    let socialLeftPx = 0
    for (let i = 0; i < socialPx.length; i += 3) socialLeftPx = Math.max(socialLeftPx, -socialPx[i])
    // The whole social composition's extent on screen at SOCIAL_SCALE_PX (social1 and social2 together), for fitting it
    // to a phone screen.
    const socialBox = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
    for (const px of [socialPx, social2Px]) {
      for (let i = 0; i < px.length; i += 3) {
        socialBox.minX = Math.min(socialBox.minX, px[i]); socialBox.maxX = Math.max(socialBox.maxX, px[i])
        socialBox.minY = Math.min(socialBox.minY, px[i + 1]); socialBox.maxY = Math.max(socialBox.maxY, px[i + 1])
      }
    }
    return {
      brain: makePoints(map, brain, { a: BRAIN_PARTICLE_SIZE, b: VLSI_PARTICLE_SIZE, backA: 0.7, foldA: 0.7, backB: 0.6 }, tgt1),
      vlsi: makePoints(map, vlsi, { a: VLSI_PARTICLE_SIZE, backA: 0.6 }),
      vlsiToDna: makePoints(map, vlsi, { a: VLSI_PARTICLE_SIZE, b: DNA_PARTICLE_SIZE, backA: 0.6 }, tgt2),
      dnaToCity: makePoints(map, dna, { a: DNA_PARTICLE_SIZE, b: CITY_PARTICLE_SIZE }, tgt3),
      dna: makePoints(map, dna, { a: DNA_PARTICLE_SIZE }),
      city: makePoints(map, city, { a: CITY_PARTICLE_SIZE }),
      cityToArm: makePoints(map, ex4.src, { a: CITY_PARTICLE_SIZE, b: ARM_PARTICLE_SIZE }, ex4.tgt),
      arm: makePoints(map, arm, { a: ARM_PARTICLE_SIZE }),
      // The arm's change into social1: depth test off like the social clouds themselves (see below), the arm's
      // points reordered to land back-first (orderedMatch). Its camera perspective is flattened to the social
      // cloud's orthographic one as it morphs (uCam, see the frame loop).
      armToSocial: makePoints(map, armToSocialMatch.src, { a: ARM_PARTICLE_SIZE, b: SOCIAL_PARTICLE_SIZE, depthTest: false, depthWrite: false }, armToSocialMatch.tgt),
      // Pure line art now (social-media4.dxf only - per request, the mesh-surface fill that used to
      // come from social-media-light.glb has been removed entirely, for every chip). depthTest:false
      // since this cloud's own real 3D depth isn't reliably camera-accurate for its "...back side" pairs (a
      // hand-authored back-face curve can sit measurably *nearer* the established camera than its
      // front counterpart; confirmed numerically, see this file's own git history), so correctness
      // comes entirely from buildSocialMediaCloud's own reorderBackFirst (back-side points submitted first)
      // - with depth testing off, the later-submitted (front) point simply paints over whatever's
      // already there, regardless of either point's real depth.
      social: makePoints(map, social, { a: SOCIAL_PARTICLE_SIZE, orthographic: true, depthTest: false, depthWrite: false }),
      // `social2`: the next stage/transition to be designed later (see SOCIAL_HOLD_SCREENS) - for now
      // an exact duplicate of `social` (trace network currently disabled), same material options. Its own THREE.Points instance since `social` and `social2` need to be
      // independently shown/hidden and (once there's an actual transition) independently positioned.
      social2: makePoints(map, social2, { a: SOCIAL_PARTICLE_SIZE, orthographic: true, depthTest: false, depthWrite: false }),
      // Model-space points of each stage's pressable logo layer, for the screen-space hit test below.
      socialLogo: logoPoints(social), social2Logo: logoPoints(social2),
      social1To2: makePoints(map, social1To2Match.src, { a: SOCIAL_PARTICLE_SIZE, b: SOCIAL_PARTICLE_SIZE, orthographic: true, depthTest: false, depthWrite: false }, social1To2Match.tgt),
      social1To2Stats: { stay: social1To2Match.stay, total: social1To2Match.total },
      qVlsi, qCity, qArm, qSocial, socialLeftPx, socialBox, cityRot,
    }
  }, [brainGltf, chipsGltf, dnaText, cityText, armGltf, socialText, social2Text])

  // Scroll-scrubbed timelines. Transition 1 runs from the top of the page until the first theme is
  // pinned; transition 2 from when that theme's pin releases until the second theme is pinned. In
  // between (the pin), nothing moves: text and particles hold still.
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)
    const tl1 = brainTimeline(anim1.current, 0, pinStart('vlsi'))
    const tl2 = scatteredTimeline(anim2.current, pinEnd('vlsi'), pinStart('dna'))
    const tl3 = scatteredTimeline(anim3.current, pinEnd('dna'), pinStart('city'))
    const tl4 = scatteredTimeline(anim4.current, pinEnd('city'), pinStart('arm'))
    // Arm -> social1: the same timeline as brain -> VLSI-CAD (turn + slide to the middle, scatter, regather
    // and morph), over ARM_EXIT_SCREENS of scroll.
    const tl5 = brainTimeline(anim5.current, pinEnd('arm'), () => pinEnd('arm')() + ARM_EXIT_SCREENS * window.innerHeight)
    const refresh = () => ScrollTrigger.refresh()
    window.addEventListener('load', refresh)
    return () => {
      window.removeEventListener('load', refresh)
      for (const tl of [tl1, tl2, tl3, tl4, tl5]) { tl.scrollTrigger?.kill(); tl.kill() }
    }
  }, [])

  useEffect(() => {
    const onMove = (e) => {
      if (isMobileView()) { sway.current.tx = 0; sway.current.ty = 0; return } // phone: the clouds don't follow the pointer
      sway.current.tx = (e.clientX / window.innerWidth) * 2 - 1
      sway.current.ty = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  // The pressable logo (social / social2). The canvas sits under the page content and takes no pointer
  // events, so hover/press/click are hit-tested here in screen space: the logo layer's points are
  // projected exactly the way the vertex shader does it and their convex hull is the button.
  useEffect(() => {
    const st = press.current
    const active = () => (scene.social2.visible ? { obj: scene.social2, pts: scene.social2Logo, url: LINKEDIN_URL, label: 'Follow us on LinkedIn ↗' } : scene.social.visible ? { obj: scene.social, pts: scene.socialLogo, url: YOUTUBE_URL, label: 'Discover us on YouTube ↗' } : null)
    const hitTest = (e) => {
      const stage = active()
      if (!stage) return null
      // Not when something opaque or interactive is on top of the canvas at that point.
      let el = document.elementFromPoint(e.clientX, e.clientY)
      if (el?.closest('a,button,input,select,textarea,[role="button"]')) return null
      // Only elements above the canvas can cover it: an ancestor of the canvas (the page wrapper, body) has its
      // own background but sits underneath it, so those are skipped. (Not limited to <main>: the scroll gap after
      // the last section lies outside it.)
      const stageEl = document.querySelector('canvas')
      for (; el; el = el.parentElement) {
        if (stageEl && el.contains(stageEl)) continue
        const bg = getComputedStyle(el).backgroundColor
        if (bg !== 'transparent' && !/^rgba\(.*,\s*0\)$/.test(bg)) return null
      }
      const m = stage.obj.material.uniforms.uModelA.value.elements
      const px = stage.obj.material.uniforms.uScaleA.value
      const off = stage.obj.material.uniforms.uCA.value // the cloud's own screen offset (x right, y up) from the viewport center
      const cx = window.innerWidth / 2 + off.x, cy = window.innerHeight / 2 - off.y
      const pts = []
      for (let i = 0; i < stage.pts.length; i += 3) {
        const x = stage.pts[i], y = stage.pts[i + 1], z = stage.pts[i + 2]
        pts.push([cx + (m[0] * x + m[3] * y + m[6] * z) * px, cy - (m[1] * x + m[4] * y + m[7] * z) * px])
      }
      return insideHull(convexHull(pts), e.clientX, e.clientY) ? stage : null
    }
    // Hover label: a small navy pill that follows the cursor while it's over the logo.
    const tip = document.createElement('div')
    Object.assign(tip.style, {
      position: 'fixed', left: '0', top: '0', zIndex: '60', pointerEvents: 'none', opacity: '0',
      padding: '6px 14px', borderRadius: '999px', background: '#002843', color: '#fff',
      font: '600 14px/1.2 var(--font-body), system-ui, sans-serif', whiteSpace: 'nowrap',
      boxShadow: '0 4px 14px rgba(0,40,67,0.25)', transition: 'opacity 160ms ease, transform 160ms ease',
      transform: 'translate(0,6px)',
    })
    document.body.appendChild(tip)
    const moveTip = (e, stage) => {
      if (stage) tip.textContent = stage.label
      // Beside the cursor, kept on screen.
      const x = Math.max(8, Math.min(e.clientX + 16, window.innerWidth - tip.offsetWidth - 8))
      tip.style.left = `${x}px`
      tip.style.top = `${e.clientY + 18}px`
      tip.style.opacity = stage ? '1' : '0'
      tip.style.transform = stage ? 'translate(0,0)' : 'translate(0,6px)'
    }

    const setCursor = (on) => { document.documentElement.style.cursor = on ? 'pointer' : '' }
    // The last pointer position, and a cheap fingerprint of what is under it (which stage is showing, where it is
    // on screen). The page can change underneath a perfectly still mouse (scrolling swaps social1 for social2, the
    // cloud slides), and no pointermove fires then - so a per-frame check re-runs the hit test whenever the
    // fingerprint changes, keeping hover, cursor and the label's text right.
    let last = null
    let lastKey = ''
    const stageKey = () => {
      const stage = active()
      if (!stage) return 'none'
      const u = stage.obj.material.uniforms
      return `${stage.url}|${u.uCA.value.x.toFixed(1)}|${u.uCA.value.y.toFixed(1)}|${window.scrollY}|${u.uModelA.value.elements[0].toFixed(3)}`
    }
    // On the phone layout the logo is look-only: nothing under the pointer counts as hovered, pressed or clickable.
    const refresh = () => {
      const stage = isMobileView() ? null : hitTest(last)
      st.hover = !!stage
      setCursor(st.hover)
      moveTip(last, stage)
    }
    const onMove = (e) => { if (isMobileView()) return; last = { clientX: e.clientX, clientY: e.clientY }; lastKey = stageKey(); refresh() }
    const onLeave = () => { last = null; st.hover = false; st.down = false; setCursor(false); tip.style.opacity = '0'; tip.style.transform = 'translate(0,6px)' }
    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      if (isMobileView()) { if (last || st.hover || st.down) onLeave(); return } // e.g. the window was narrowed to a phone width
      if (!last) return
      const key = stageKey()
      if (key === lastKey) return
      lastKey = key
      refresh()
    }
    raf = requestAnimationFrame(tick)
    const onDown = (e) => { if (!isMobileView() && e.button === 0 && hitTest(e)) st.down = true }
    const onUp = () => { st.down = false }
    const onClick = (e) => {
      if (isMobileView()) return
      const stage = hitTest(e)
      if (stage) window.open(stage.url, '_blank', 'noopener,noreferrer')
    }
    window.addEventListener('pointermove', onMove)
    document.documentElement.addEventListener('mouseleave', onLeave)
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    window.addEventListener('click', onClick)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('mouseleave', onLeave)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      window.removeEventListener('click', onClick)
      tip.remove()
      setCursor(false)
    }
  }, [scene])

  const anchorEl = (name) => {
    let el = anchors.current[name]
    if (!el || !el.isConnected) el = anchors.current[name] = document.querySelector(`[data-cloud="${name}"]`)
    return el
  }

  useFrame((state, delta) => {
    const vw = state.size.width, vh = state.size.height
    const s = sway.current
    const k = 1 - Math.exp(-SWAY_EASE * delta)
    s.x += (s.tx * SWAY_YAW - s.x) * k
    s.y += (s.ty * SWAY_PITCH - s.y) * k
    if (!brainState.dragging) brainState.yaw += SPIN_SPEED * delta
    const swayQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(s.y, s.x, 0))

    const elBrain = anchorEl('brain'), elVlsi = anchorEl('vlsi'), elDna = anchorEl('dna'), elCity = anchorEl('city'), elArm = anchorEl('arm')
    const sec1 = elVlsi?.closest('section'), sec2 = elDna?.closest('section'), sec3 = elCity?.closest('section'), sec4 = elArm?.closest('section')
    const all = [scene.brain, scene.vlsi, scene.vlsiToDna, scene.dna, scene.dnaToCity, scene.city, scene.cityToArm, scene.arm, scene.armToSocial, scene.social, scene.social1To2, scene.social2]
    if (!elBrain || !elVlsi || !elDna || !elCity || !elArm || !sec4 || !sec1 || !sec2 || !sec3) { for (const o of all) o.visible = false; return }

    // Anchor geometry. The brain (hero, not pinned) is a fixed page coordinate, used at scroll 0. A theme
    // anchor lives inside its pinned content, so its position on screen while pinned is just its offset
    // inside that pinned block - independent of scroll.
    const sy = window.scrollY
    const size = (el) => el.getBoundingClientRect().height * PX_PER_UNIT_PER_ANCHOR_PX
    const hero = elBrain.getBoundingClientRect()
    const A = { x: hero.left + hero.width / 2, y: hero.top + sy + hero.height / 2, scale: size(elBrain), S: hero.height, ...BRAIN_CENTER }
    const pinned = (el) => {
      const r = el.getBoundingClientRect()
      const pin = el.closest('[data-pin]').getBoundingClientRect()
      const f = (name) => parseFloat(el.style.getPropertyValue(name)) || 0 // where the cloud's centre lies (index.css, .phone-cloud)
      return { x: r.left + r.width / 2, y: r.top - pin.top + r.height / 2, scale: r.height * PX_PER_UNIT_PER_ANCHOR_PX, S: r.height, fx: f('--fx'), fy: f('--fy') }
    }
    const B1 = pinned(elVlsi), B2 = pinned(elDna), B3 = pinned(elCity), B4 = pinned(elArm)

    // Screen centers of each cloud (x right, y up, from the viewport center). 
    const scr = (P, up = 0) => ({ x: P.x - vw / 2, y: -(P.y - up - vh / 2) })
    // Phone layout: every cloud sits centred in its box (VLSI's lift is a desktop nudge) and the social stage stacks
    // the cloud above its copy. See phoneSocial.
    const mobile = isMobileView()
    const cA = scr(A), c1 = scr(B1, mobile ? 0 : VLSI_UP_PX), c2 = scr(B2), c3 = scr(B3), c4 = scr(B4)

    // Phone layout: a cloud's origin is not the middle of its silhouette (an anchor is placed so the silhouette is centred in
    // its box, see .phone-cloud). A cloud travelling to the next one's spot is therefore sent to where its OWN silhouette
    // ends up centred on the next cloud's, not to the next cloud's origin - otherwise it lands off-centre there. `off` is
    // the silhouette centre relative to the origin (px, y up); all zero on desktop, where the destination is just c.
    const off = (P) => (mobile ? { x: P.S * P.fx, y: -P.S * P.fy } : { x: 0, y: 0 })
    const oA = off(A), o1 = off(B1), o2 = off(B2), o3 = off(B3), o4 = off(B4)
    // On a phone (below 768px) the Industry 4.0 arm is drawn at ARM_PHONE_SCALE of its box, shrunk about the middle of its own silhouette: scaling it about its origin would
    // move that middle, so the origin moves to make up for it (the silhouette centre c4 + o4 stays where it was), and the offset itself shrinks with the cloud.
    if (vw < 768) {
      c4.x += (1 - ARM_PHONE_SCALE) * o4.x
      c4.y += (1 - ARM_PHONE_SCALE) * o4.y
      o4.x *= ARM_PHONE_SCALE
      o4.y *= ARM_PHONE_SCALE
      B4.scale *= ARM_PHONE_SCALE
    }
    const dest = (cTo, oTo, oFrom) => ({ x: cTo.x + oTo.x - oFrom.x, y: cTo.y + oTo.y - oFrom.y })
    const d2 = dest(c2, o2, o1), d3 = dest(c3, o3, o2), d4 = dest(c4, o4, o3)

    const a1 = anim1.current, a2 = anim2.current, a3 = anim3.current, a4 = anim4.current, a5 = anim5.current
    const done1 = a1.morph >= 0.999 && a1.destruct <= 0.001
    // Where the brain goes and the VLSI-CAD cloud forms: the middle of the screen at the VLSI-CAD cloud's height on desktop;
    // on the phone the very middle of the screen (the VLSI-CAD cloud then slides up/down from there to its place).
    const mid = mobile ? { x: 0, y: 0 } : { x: 0, y: c1.y }
    const midBrain = { x: mid.x - oA.x, y: mid.y - oA.y }
    const midVlsi = { x: mid.x - o1.x, y: mid.y - o1.y }
    // Reaching the next theme's side (a transition's move step done) scatters the cloud on its own;
    // scrolling back regathers it.
    ;[anim2.current, anim3.current, anim4.current].forEach((anim, i) => {
      const sc = scatters.current[i], moveDone = anim.move >= 0.999
      if (sc.moveDone === null) sc.v = moveDone ? 1 : 0
      else if (moveDone && !sc.moveDone) {
        gsap.killTweensOf(sc)
        gsap.to(sc, { v: 1, duration: SCATTER_SECONDS, ease: 'power2.out' })
      } else if (!moveDone && sc.moveDone) {
        gsap.killTweensOf(sc)
        gsap.to(sc, { v: 0, duration: 0.6, ease: 'power2.inOut' })
      }
      sc.moveDone = moveDone
    })
    const started2 = a2.move > 0.001 || a2.collapse > 0.001 || a2.morph > 0.001
    const done2 = a2.morph >= 0.999 && a2.collapse >= 0.999
    const started3 = a3.collapse > 0.001 || a3.morph > 0.001 || a3.move > 0.001
    const done3 = a3.morph >= 0.999 && a3.collapse >= 0.999
    const started4 = a4.collapse > 0.001 || a4.morph > 0.001 || a4.move > 0.001
    const done4 = a4.morph >= 0.999 && a4.collapse >= 0.999
    // Arm -> social1 is a real transition now (anim5, same shape as brain -> VLSI-CAD). After a further
    // SOCIAL_HOLD_SCREENS, social1 just cuts to `social2` (a placeholder copy, see its own comment)
    // outright - no morph there yet.
    const started5 = a5.move > 0.001 || a5.destruct > 0.001 || a5.morph > 0.001
    const done5 = a5.morph >= 0.999 && a5.destruct <= 0.001
    const socialFormed = done4 && done5
    // Its resting spot: the same distance from the screen's left edge as the Smart City cloud's left edge
    // (measured the way the shader places points, perspective included), but at least 16px in from the edge.
    const cityKey = `${B3.scale}:${c3.x}`
    if (cityLeft.current.key !== cityKey) {
      let minX = Infinity
      for (let i = 0; i < scene.cityRot.length; i += 3) {
        const k = CAM / (CAM - scene.cityRot[i + 2])
        minX = Math.min(minX, scene.cityRot[i] * B3.scale * k)
      }
      cityLeft.current = { key: cityKey, edge: vw / 2 + c3.x + minX }
    }
    const socialX = mobile ? 0 : Math.min(0, Math.max(cityLeft.current.edge, 16) - vw / 2 + scene.socialLeftPx)
    // Where the social cloud's origin sits and how big it is: on desktop (0, 0) at SOCIAL_SCALE_PX (plus the slide left
    // by socialX); on the phone shrunk to fit the screen width and the space above the copy, its bounding box centred there.
    const sc = mobile ? phoneSocial(scene.socialBox, vw, vh) : { scale: SOCIAL_SCALE_PX, x: 0, y: 0, cx: 0, cy: 0 }
    // The moment the VLSI-CAD cloud / social1 finishes forming it slides to its left-hand default place (time-based,
    // eased with no rebound, no rotation). Scrolling back un-forms it, so snap `v` home (it is back at the middle).
    // The very first frame just adopts the current state (e.g. a reload deep in the page: already left).
    // (own tween targets: killing tweens on the anim refs would also kill the scroll-scrubbed timelines'.)
    // social1's slide starts a little BEFORE it has fully formed (morph 0.9, while it is still settling), and the
    // forming cloud is carried along (uCB below), so the settle flows straight into the slide instead of coming
    // to a near-stop first.
    const social1Slide = a5.morph >= SOCIAL_SLIDE_FROM_MORPH && a5.destruct <= 0.001
    ;[done1, social1Slide].forEach((done, i) => {
      const sl = slides.current[i]
      if (sl.done === null) sl.v = done ? 1 : 0
      else if (done && !sl.done) {
        gsap.killTweensOf(sl)
        // Same speed for both: the duration scales with how far this cloud has to go, relative to the VLSI one.
        const duration = i === 0 ? VLSI_SLIDE_SECONDS : Math.max(0.4, (VLSI_SLIDE_SECONDS * Math.abs(socialX)) / (Math.abs(c1.x) || 1))
        gsap.to(sl, { v: 1, duration, ease: VLSI_SLIDE_EASE })
      } else if (!done && sl.done) {
        gsap.killTweensOf(sl)
        sl.v = 0
      }
      sl.done = done
    })
    // social1 -> social2 plays by itself: scrolling past the end of social1's hold starts the whole morph, which then runs
    // to the end (no resting half-way, whatever the scrolling does); scrolling back past the point plays it in reverse.
    // The first frame just adopts the current state (e.g. a reload deep in the page: already social2).
    const crossed6 = sy >= pinEnd('arm')() + (ARM_EXIT_SCREENS + SOCIAL_HOLD_SCREENS) * window.innerHeight
    if (social2Crossed.current === null) anim6.current.morph = crossed6 ? 1 : 0
    else if (crossed6 !== social2Crossed.current) {
      gsap.killTweensOf(anim6.current)
      gsap.to(anim6.current, { morph: crossed6 ? 1 : 0, duration: SOCIAL_MORPH_SECONDS, ease: VLSI_SLIDE_EASE })
    }
    social2Crossed.current = crossed6
    const started6 = anim6.current.morph > 0.001, done6 = anim6.current.morph >= 0.999
    const social2Formed = socialFormed && done6
    const R0 = EXPLODE_DIST * 1.98 * A.scale // explosion distance for both transitions (x brain radius on screen)

    // Transition 1: brain -> VLSI-CAD. The brain keeps its own size and shape and its current angle while it
    // turns a full horizontal turn from its current angle while it slides to the middle of the screen, where it scatters and regathers as the VLSI-CAD cloud.
    scene.brain.visible = !done1
    {
      const u = scene.brain.material.uniforms
      _q.setFromAxisAngle(_yAxis, brainState.yaw + a1.spin * SPIN_TURNS * 2 * Math.PI)
      setModel(u.uModelA.value, _q)
      u.uCA.value.set(cA.x + (midBrain.x - cA.x) * a1.move, cA.y + (midBrain.y - cA.y) * a1.move)
      u.uScaleA.value = A.scale
      u.uMorph.value = a1.morph
      u.uCB.value.set(midVlsi.x, midVlsi.y)
      u.uScaleB.value = B1.scale
      _q.copy(swayQ).multiply(scene.qVlsi)
      setModel(u.uModelB.value, _q)
      u.uDestruct.value = a1.destruct
      u.uExplodeDist.value = R0
    }

    // The VLSI-CAD cloud: slides left to its default place (no turning), then holds.
    scene.vlsi.visible = done1 && !started2
    {
      const u = scene.vlsi.material.uniforms
      u.uCA.value.set(midVlsi.x + (c1.x - midVlsi.x) * slides.current[0].v, midVlsi.y + (c1.y - midVlsi.y) * slides.current[0].v)
      u.uScaleA.value = B1.scale
      _q.copy(swayQ).multiply(scene.qVlsi)
      setModel(u.uModelA.value, _q)
    }

    // Transition 2: VLSI-CAD -> DNA.
    scene.vlsiToDna.visible = done1 && started2 && !done2
    {
      const u = scene.vlsiToDna.material.uniforms
      _q.copy(swayQ).multiply(scene.qVlsi)
      _q2.setFromAxisAngle(_yAxis, a2.spin * SPIN_TURNS * 2 * Math.PI).multiply(_q)
      setModel(u.uModelA.value, _q2)
      u.uCA.value.set(c1.x + (d2.x - c1.x) * a2.move, c1.y + (d2.y - c1.y) * a2.move)
      spinAboutCentre(u, o1, B1.scale, a2.spin)
      u.uScaleA.value = B1.scale
      u.uMorph.value = a2.morph
      u.uCB.value.set(c2.x, c2.y)
      u.uScaleB.value = B2.scale
      setModel(u.uModelB.value, swayQ)
      u.uDestruct.value = SCATTER_HOLD * scatters.current[0].v * (1 - a2.collapse) // scattered on arrival, collapses as it morphs
      u.uExplodeDist.value = R0
    }

    // The DNA cloud once it has formed.
    scene.dna.visible = done2 && !started3
    {
      const u = scene.dna.material.uniforms
      u.uCA.value.set(c2.x, c2.y)
      u.uScaleA.value = B2.scale
      setModel(u.uModelA.value, swayQ)
    }

    // Transition 3: DNA -> Smart City. Same recipe as VLSI-CAD -> DNA: spin + slide first, then scatter and regather.
    scene.dnaToCity.visible = done2 && started3 && !done3
    {
      const u = scene.dnaToCity.material.uniforms
      _q2.setFromAxisAngle(_yAxis, a3.spin * SPIN_TURNS * 2 * Math.PI).multiply(swayQ)
      setModel(u.uModelA.value, _q2)
      u.uCA.value.set(c2.x + (d3.x - c2.x) * a3.move, c2.y + (d3.y - c2.y) * a3.move)
      spinAboutCentre(u, o2, B2.scale, a3.spin)
      u.uScaleA.value = B2.scale
      u.uMorph.value = a3.morph
      u.uCB.value.set(c3.x, c3.y)
      u.uScaleB.value = B3.scale
      _q.copy(swayQ).multiply(scene.qCity)
      setModel(u.uModelB.value, _q)
      u.uDestruct.value = SCATTER_HOLD * scatters.current[1].v * (1 - a3.collapse)
      u.uExplodeDist.value = R0
    }

    // The Smart City cloud once it has formed.
    scene.city.visible = done3 && !started4
    {
      const u = scene.city.material.uniforms
      u.uCA.value.set(c3.x, c3.y)
      u.uScaleA.value = B3.scale
      _q.copy(swayQ).multiply(scene.qCity)
      setModel(u.uModelA.value, _q)
    }

    // Transition 4: Smart City -> Industry 4.0. The city spins a full turn about its own vertical axis
    // (view angle unchanged), sliding to the arm's position; then it scatters and regathers as the arm.
    scene.cityToArm.visible = done3 && started4 && !done4
    {
      const u = scene.cityToArm.material.uniforms
      // Model-frame turn about the model's vertical axis through CITY_PIVOT (SmartCityParticles.jsx -
      // the big roundabout's own center on the bright-color road layer), not the cloud's bounding-box center:
      // R0 = swayQ * qCity (resting orientation), R = R0 * Ry(theta) (with the turn); uOffA carries the
      // translation a pivoted rotation needs on top of a pure origin-centered one (R0*P - R*P, so a
      // point at the pivot itself doesn't move).
      _q.copy(swayQ).multiply(scene.qCity) // R0
      _q2.copy(_q).multiply(_q3.setFromAxisAngle(_yAxis, a4.spin * SPIN_TURNS * 2 * Math.PI)) // R
      setModel(u.uModelA.value, _q2)
      u.uOffA.value.copy(CITY_PIVOT_VEC).applyQuaternion(_q).sub(_v.copy(CITY_PIVOT_VEC).applyQuaternion(_q2))
      u.uCA.value.set(c3.x + (d4.x - c3.x) * a4.move, c3.y + (d4.y - c3.y) * a4.move)
      u.uScaleA.value = B3.scale
      u.uMorph.value = a4.morph
      u.uCB.value.set(c4.x, c4.y)
      u.uScaleB.value = B4.scale
      _q.copy(swayQ).multiply(scene.qArm)
      setModel(u.uModelB.value, _q)
      u.uDestruct.value = SCATTER_HOLD * scatters.current[2].v * (1 - a4.collapse)
      u.uExplodeDist.value = R0
    }

    // The Industry 4.0 arm cloud once it has formed.
    scene.arm.visible = done4 && !started5
    {
      const u = scene.arm.material.uniforms
      u.uCA.value.set(c4.x, c4.y)
      u.uScaleA.value = B4.scale
      _q.copy(swayQ).multiply(scene.qArm)
      setModel(u.uModelA.value, _q)
    }

    // Arm -> social1 (like brain -> VLSI-CAD): once the arm's pin releases, it turns a full turn while sliding to
    // the middle of the screen, scatters there and regathers as the social cloud.
    scene.armToSocial.visible = done4 && started5 && !done5
    {
      const u = scene.armToSocial.material.uniforms
      u.uCA.value.set(c4.x + (sc.cx - o4.x - c4.x) * a5.move, c4.y + (sc.cy - o4.y - c4.y) * a5.move)
      spinAboutCentre(u, o4, B4.scale, a5.spin)
      u.uScaleA.value = B4.scale
      _q.copy(swayQ).multiply(scene.qArm)
      _q2.setFromAxisAngle(_yAxis, a5.spin * SPIN_TURNS * 2 * Math.PI).multiply(_q)
      setModel(u.uModelA.value, _q2)
      u.uMorph.value = a5.morph
      u.uCB.value.set(sc.x + socialX * slides.current[1].v, sc.y) // the cloud it is forming into may already be sliding left
      u.uScaleB.value = sc.scale
      _q3.copy(swayQ).multiply(scene.qSocial)
      setMirroredModel(u.uModelB.value, _q3)
      u.uDestruct.value = a5.destruct
      u.uExplodeDist.value = R0
      // Perspective (arm) -> orthographic (social): interpolate 1/uCam so it is exactly CAM at morph 0 and flat at 1.
      u.uCam.value = Math.min(1e6, CAM / Math.max(1 - a5.morph, 1e-6))
    }

    // The social-media chip cluster: takes over from the arm -> social1 morph once it has formed,
    // holds for SOCIAL_HOLD_SCREENS, then itself gets replaced outright by `social2` (a placeholder
    // copy - see its own build-time comment), which holds as the backdrop for the rest of the page.
    // Both share the exact same transform for now, since social2 has no distinct position/orientation
    // of its own yet.
    scene.social.visible = socialFormed && !started6
    scene.social1To2.visible = socialFormed && started6 && !done6
    scene.social2.visible = social2Formed
    {
      _q3.copy(swayQ).multiply(scene.qSocial)
      // social1 forms at the middle, then slides left like the VLSI-CAD cloud; social2 (cut in later, once
      // social1 has long settled) sits at that same spot.
      for (const obj of [scene.social, scene.social2]) {
        const u = obj.material.uniforms
        u.uCA.value.set(sc.x + (obj === scene.social ? socialX * slides.current[1].v : socialX), sc.y)
        u.uScaleA.value = sc.scale
        setMirroredModel(u.uModelA.value, _q3)
      }
      // social1 -> social2, in place: both ends sit at social2's resting spot.
      {
        const u = scene.social1To2.material.uniforms
        u.uCA.value.set(sc.x + socialX, sc.y); u.uCB.value.set(sc.x + socialX, sc.y)
        u.uScaleA.value = sc.scale; u.uScaleB.value = sc.scale
        setMirroredModel(u.uModelA.value, _q3); setMirroredModel(u.uModelB.value, _q3)
        u.uMorph.value = anim6.current.morph
      }
      // Fade the copy beside the clouds: YouTube's with social1, LinkedIn's with social2 (both away while the clouds
      // morph). Written straight onto the SocialCopy elements. (The footer scrolls over it - SocialCopy sits below it.)
      {
        const cp = copyState.current
        const fade = 1 - Math.exp(-7 * delta)
        cp.y += ((socialFormed && anim6.current.morph < 0.25 ? 1 : 0) - cp.y) * fade
        cp.l += ((socialFormed && anim6.current.morph > 0.75 ? 1 : 0) - cp.l) * fade
        for (const [key, v] of [['youtube', cp.y], ['linkedin', cp.l]]) {
          if (!cp.els[key]?.isConnected) cp.els[key] = document.querySelector(`[data-social-copy="${key}"]`)
          const el = cp.els[key]
          if (!el) continue
          const o = Math.round(v * 200) / 200
          const stamp = `${o}|${mobile}`
          if (cp.last[key] === stamp) continue
          cp.last[key] = stamp
          el.style.opacity = String(o)
          el.style.visibility = o < 0.01 ? 'hidden' : 'visible'
          el.style.pointerEvents = o > 0.6 ? 'auto' : 'none'
          el.style.transform = `translateY(calc(${mobile ? '0px' : '-50%'} + ${((1 - o) * 18).toFixed(1)}px))`
        }
      }
      // Ease the press: hover sinks the logo a little, a held press sinks it fully, release springs back.
      const st = press.current
      const target = st.down ? 1 : st.hover ? 0.3 : 0
      st.value += (target - st.value) * (1 - Math.exp(-(target > st.value ? 22 : 12) * delta))
      // Hover reveals the LinkedIn logo's blue fill points (linear ramp so it lands exactly on 1 / 0).
      st.fill = Math.max(0, Math.min(1, st.fill + (st.hover ? 2.2 : -3) * delta))
      for (const obj of [scene.social, scene.social2]) {
        obj.material.uniforms.uPress.value = st.value
        obj.material.uniforms.uFill.value = st.fill
      }
    }
  })

  return (
    <>
      <primitive object={scene.brain} />
      <primitive object={scene.vlsi} />
      <primitive object={scene.vlsiToDna} />
      <primitive object={scene.dna} />
      <primitive object={scene.dnaToCity} />
      <primitive object={scene.city} />
      <primitive object={scene.cityToArm} />
      <primitive object={scene.arm} />
      <primitive object={scene.armToSocial} />
      <primitive object={scene.social} />
      <primitive object={scene.social1To2} />
      <primitive object={scene.social2} />
    </>
  )
}

/** Mounted once on Home: the fixed, viewport-sized stage the particle clouds are drawn on. */
export default function ParticleCanvas() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0">
      <Canvas orthographic camera={{ position: [0, 0, 1000], zoom: 1, near: 1, far: 3000 }} gl={{ alpha: true, antialias: true }}>
        <Suspense fallback={null}>
          <Clouds />
        </Suspense>
      </Canvas>
    </div>
  )
}
