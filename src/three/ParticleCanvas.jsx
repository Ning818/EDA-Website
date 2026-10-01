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
import { buildSocialMediaCloud, SOCIAL_ORIENTATION, SOCIAL_PARTICLE_SIZE } from './SocialMediaParticles'
import { FileLoader } from 'three'
import { matchClouds } from './morphMatch'
import { makeCircleTexture } from './makeCircleTexture'
import { brainState } from './cloudState'

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
// Brain -> VLSI-CAD: the brain slides to the middle of the screen (turning a full turn from wherever it currently faces),
// scatters and regathers there as the VLSI-CAD cloud, then that cloud turns VLSI_TURNS full turns
// while sliding left to its default place. It ends at its default angle, so at the moment it forms it
// is already turned back by VLSI_TURNS turns (worked out backwards from the end pose).
const VLSI_TURNS = 1
export const ARM_EXIT_SCREENS = 2 // scroll length (in screens) of the arm's closing turn
// Industry 4.0 arm -> social-media chip cluster: once the arm's closing turn ends and scroll passes
// this point, the social-media cloud (SocialMediaParticles.js) just replaces it outright - no
// scatter/regather morph into it (per request, to skip the extra matchClouds/transition work) - and
// holds as the page's final backdrop for everything below it (YoutubeSpotlight, LinkedInSection).
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
    vec4 a = place(position, uModelA, uOffA, uCA, uScaleA, uBaseA, aSize);
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
 * Brain -> VLSI-CAD (see VLSI_TURNS): `move` = brain turns a full turn (from its current angle) and slides to the screen middle; `destruct`/`morph`
 * = scatter and regather there; `slide` (0->1) = the VLSI-CAD cloud slides to its own place while its
 * `turn` (0->1, same timing) undoes its backwards-turned start angle.
 */
function brainTimeline(anim, start, end) {
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: document.documentElement, start, end, scrub: SCRUB, invalidateOnRefresh: true },
  })
  tl.to(anim, { move: 1, spin: 1, duration: 0.32, ease: 'power2.inOut' }, 0)
  tl.to(anim, { destruct: 1, duration: 0.16 }, 0.32)
  tl.to(anim, { destruct: 0, duration: 0.14 }, 0.48)
  tl.to(anim, { morph: 1, duration: 0.18 }, 0.48)
  tl.to(anim, { slide: 1, turn: 1, duration: 0.28, ease: 'power2.inOut' }, 0.66)
  tl.to({}, { duration: 0.06 }, 0.94)
  return tl
}

// Scroll positions for a theme section, whose content is pinned (sticky) for its whole dwell:
// pinStart = the section's top reaches the top of the screen (its text is now centered and stays put),
// pinEnd = the pin releases. A transition into a theme ends at its pinStart; the next one starts at pinEnd.
const themeSection = (anchorName) => document.querySelector(`[data-cloud="${anchorName}"]`)?.closest('section')
const pinStart = (anchorName) => () => {
  const sec = themeSection(anchorName)
  return sec ? Math.max(1, sec.getBoundingClientRect().top + window.scrollY) : 1
}
export const pinEnd = (anchorName) => () => {
  const sec = themeSection(anchorName)
  return sec ? Math.max(1, sec.getBoundingClientRect().bottom + window.scrollY - window.innerHeight) : 1
}

function Clouds() {
  const brainGltf = useLoader(GLTFLoader, '/models/brain.glb')
  const chipsGltf = useLoader(GLTFLoader, '/models/chips.glb')
  const dnaText = useLoader(FileLoader, '/models/dna6.dxf', (l) => l.setResponseType('text'))
  const armGltf = useLoader(GLTFLoader, '/models/industry-arm.glb')
  const cityText = useLoader(FileLoader, '/models/smart-city13.dxf', (l) => l.setResponseType('text'))
  const socialText = useLoader(FileLoader, '/models/social-media3.dxf', (l) => l.setResponseType('text'))
  const socialGltf = useLoader(GLTFLoader, '/models/social-media-light.glb')
  const sway = useRef({ tx: 0, ty: 0, x: 0, y: 0 })
  const anchors = useRef({})
  // Animated by the ScrollTrigger timelines below; read every frame. One per transition.
  const anim1 = useRef({ move: 0, spin: 0, slide: 0, turn: 0, destruct: 0, morph: 0 }) // brain -> VLSI-CAD
  const anim2 = useRef({ move: 0, spin: 0, destruct: 0, morph: 0 }) // VLSI-CAD -> DNA
  const anim3 = useRef({ move: 0, spin: 0, destruct: 0, morph: 0 }) // DNA -> Smart City
  const anim5 = useRef({ move: 0, spin: 0 }) // Industry 4.0 arm's closing turn (slides left while turning)
  const anim4 = useRef({ move: 0, spin: 0, destruct: 0, morph: 0 }) // Smart City -> Industry 4.0

  const scene = useMemo(() => {
    const map = makeCircleTexture()
    const brain = buildBrainCloud(brainGltf)
    const vlsi = buildVLSICloud(chipsGltf)
    const dna = buildDNACloud(dnaText)
    const city = buildCityCloud(cityText)
    const qCity = new THREE.Quaternion(...CITY_ORIENTATION)
    const cityStage = rotated(city.positions, qCity).map((v) => v * 260)
    const arm = buildArmCloud(armGltf)
    const qArm = new THREE.Quaternion(...ARM_ORIENTATION)
    const armStage = rotated(arm.positions, qArm).map((v) => v * 260)
    // The arm has more points than the city: match the arm to the city and grow the extras out of it.
    const ex4 = expandedSource(city, arm, matchClouds(armStage, cityStage))
    const social = buildSocialMediaCloud(socialText, socialGltf)
    const qSocial = new THREE.Quaternion(...SOCIAL_ORIENTATION)
    const qVlsi = new THREE.Quaternion(...VLSI_ORIENTATION)
    const vlsiStage = rotated(vlsi.positions, qVlsi).map((v) => v * 260)
    // Each transition matches the earlier cloud's points 1:1 to the next one's (the earlier one has
    // more; its surplus shrinks away at the end).
    const tgt1 = matchedTarget(brain.positions.map((v) => v * 140), vlsi, vlsiStage)
    const tgt2 = matchedTarget(vlsiStage, dna, dna.positions.map((v) => v * 260))
    const tgt3 = matchedTarget(dna.positions.map((v) => v * 260), city, cityStage)
    return {
      brain: makePoints(map, brain, { a: BRAIN_PARTICLE_SIZE, b: VLSI_PARTICLE_SIZE, backA: 0.7, foldA: 0.7, backB: 0.6 }, tgt1),
      vlsi: makePoints(map, vlsi, { a: VLSI_PARTICLE_SIZE, backA: 0.6 }),
      vlsiToDna: makePoints(map, vlsi, { a: VLSI_PARTICLE_SIZE, b: DNA_PARTICLE_SIZE, backA: 0.6 }, tgt2),
      dnaToCity: makePoints(map, dna, { a: DNA_PARTICLE_SIZE, b: CITY_PARTICLE_SIZE }, tgt3),
      dna: makePoints(map, dna, { a: DNA_PARTICLE_SIZE }),
      city: makePoints(map, city, { a: CITY_PARTICLE_SIZE }),
      cityToArm: makePoints(map, ex4.src, { a: CITY_PARTICLE_SIZE, b: ARM_PARTICLE_SIZE }, ex4.tgt),
      arm: makePoints(map, arm, { a: ARM_PARTICLE_SIZE }),
      // backA: social-media-light.glb's 5 chip boxes (SocialMediaParticles.js's mesh-surface fill
      // points, real normals, normalMask=1) fade toward white when facing away from the camera -
      // same backA/whiteFade mechanism as VLSI-CAD's own hand mesh (backA:0.6 there too); the curve
      // points (molecule/avatar/pin-hatch lines, normalMask=0) are unaffected regardless of facing.
      social: makePoints(map, social, { a: SOCIAL_PARTICLE_SIZE, orthographic: true, backA: 0.6 }),
      qVlsi, qCity, qArm, qSocial,
    }
  }, [brainGltf, chipsGltf, dnaText, cityText, armGltf, socialText, socialGltf])

  // Scroll-scrubbed timelines. Transition 1 runs from the top of the page until the first theme is
  // pinned; transition 2 from when that theme's pin releases until the second theme is pinned. In
  // between (the pin), nothing moves: text and particles hold still.
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)
    const tl1 = brainTimeline(anim1.current, 0, pinStart('vlsi'))
    const tl2 = transitionTimeline(anim2.current, pinEnd('vlsi'), pinStart('dna'))
    const tl3 = transitionTimeline(anim3.current, pinEnd('dna'), pinStart('city'))
    const tl4 = transitionTimeline(anim4.current, pinEnd('city'), pinStart('arm'))
    const tl5 = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: document.documentElement, start: pinEnd('arm'), end: () => pinEnd('arm')() + ARM_EXIT_SCREENS * window.innerHeight, scrub: SCRUB, invalidateOnRefresh: true },
    })
    tl5.to(anim5.current, { move: 1, spin: 1, duration: 0.92, ease: 'power2.inOut' })
    tl5.to({}, { duration: 0.08 })
    const refresh = () => ScrollTrigger.refresh()
    window.addEventListener('load', refresh)
    return () => {
      window.removeEventListener('load', refresh)
      for (const tl of [tl1, tl2, tl3, tl4, tl5]) { tl.scrollTrigger?.kill(); tl.kill() }
    }
  }, [])

  useEffect(() => {
    const onMove = (e) => {
      sway.current.tx = (e.clientX / window.innerWidth) * 2 - 1
      sway.current.ty = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

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
    const all = [scene.brain, scene.vlsi, scene.vlsiToDna, scene.dna, scene.dnaToCity, scene.city, scene.cityToArm, scene.arm, scene.social]
    if (!elBrain || !elVlsi || !elDna || !elCity || !elArm || !sec4 || !sec1 || !sec2 || !sec3) { for (const o of all) o.visible = false; return }

    // Anchor geometry. The brain (hero, not pinned) is a fixed page coordinate, used at scroll 0. A theme
    // anchor lives inside its pinned content, so its position on screen while pinned is just its offset
    // inside that pinned block - independent of scroll.
    const sy = window.scrollY
    const size = (el) => el.getBoundingClientRect().height * PX_PER_UNIT_PER_ANCHOR_PX
    const hero = elBrain.getBoundingClientRect()
    const A = { x: hero.left + hero.width / 2, y: hero.top + sy + hero.height / 2, scale: size(elBrain) }
    const pinned = (el) => {
      const r = el.getBoundingClientRect()
      const pin = el.closest('[data-pin]').getBoundingClientRect()
      return { x: r.left + r.width / 2, y: r.top - pin.top + r.height / 2, scale: r.height * PX_PER_UNIT_PER_ANCHOR_PX }
    }
    const B1 = pinned(elVlsi), B2 = pinned(elDna), B3 = pinned(elCity), B4 = pinned(elArm)

    // Screen centers of each cloud (x right, y up, from the viewport center). 
    const scr = (P, up = 0) => ({ x: P.x - vw / 2, y: -(P.y - up - vh / 2) })
    const cA = scr(A), c1 = scr(B1), c2 = scr(B2), c3 = scr(B3), c4 = scr(B4)

    const a1 = anim1.current, a2 = anim2.current, a3 = anim3.current, a4 = anim4.current, a5 = anim5.current
    const done1 = a1.morph >= 0.999 && a1.destruct <= 0.001
    const mid = { x: 0, y: c1.y } // middle of the screen, at the VLSI-CAD cloud's height
    // VLSI-CAD's angle on the way in: default angle turned back by the turns still to come.
    const vlsiYaw = (a1.turn - 1) * VLSI_TURNS * 2 * Math.PI
    const started2 = a2.move > 0.001 || a2.destruct > 0.001 || a2.morph > 0.001
    const done2 = a2.morph >= 0.999 && a2.destruct <= 0.001
    const started3 = a3.destruct > 0.001 || a3.morph > 0.001 || a3.move > 0.001
    const done3 = a3.morph >= 0.999 && a3.destruct <= 0.001
    const started4 = a4.destruct > 0.001 || a4.morph > 0.001 || a4.move > 0.001
    const done4 = a4.morph >= 0.999 && a4.destruct <= 0.001
    // No morph into the social-media cloud (per request, to skip the extra matchClouds/transition
    // work) - it just replaces the arm outright once scroll passes the same point the arm's old
    // exit transition used to start at.
    const socialFormed = done4 && sy >= pinEnd('arm')() + ARM_EXIT_SCREENS * vh
    const R0 = EXPLODE_DIST * 1.98 * A.scale // explosion distance for both transitions (x brain radius on screen)

    // Transition 1: brain -> VLSI-CAD. The brain keeps its own size and shape and its current angle while it
    // turns a full horizontal turn from its current angle while it slides to the middle of the screen, where it scatters and regathers as the VLSI-CAD cloud.
    scene.brain.visible = !done1
    {
      const u = scene.brain.material.uniforms
      _q.setFromAxisAngle(_yAxis, brainState.yaw + a1.spin * SPIN_TURNS * 2 * Math.PI)
      setModel(u.uModelA.value, _q)
      u.uCA.value.set(cA.x + (mid.x - cA.x) * a1.move, cA.y + (mid.y - cA.y) * a1.move)
      u.uScaleA.value = A.scale
      u.uMorph.value = a1.morph
      u.uCB.value.set(mid.x, mid.y)
      u.uScaleB.value = B1.scale
      _q.copy(swayQ).multiply(scene.qVlsi)
      _q2.setFromAxisAngle(_yAxis, vlsiYaw).multiply(_q)
      setModel(u.uModelB.value, _q2)
      u.uDestruct.value = a1.destruct
      u.uExplodeDist.value = R0
    }

    // The VLSI-CAD cloud: turns while sliding left to its default place, then holds.
    scene.vlsi.visible = done1 && !started2
    {
      const u = scene.vlsi.material.uniforms
      u.uCA.value.set(mid.x + (c1.x - mid.x) * a1.slide, c1.y)
      u.uScaleA.value = B1.scale
      _q.copy(swayQ).multiply(scene.qVlsi)
      _q2.setFromAxisAngle(_yAxis, vlsiYaw).multiply(_q)
      setModel(u.uModelA.value, _q2)
    }

    // Transition 2: VLSI-CAD -> DNA.
    scene.vlsiToDna.visible = done1 && started2 && !done2
    {
      const u = scene.vlsiToDna.material.uniforms
      _q.copy(swayQ).multiply(scene.qVlsi)
      _q2.setFromAxisAngle(_yAxis, a2.spin * SPIN_TURNS * 2 * Math.PI).multiply(_q)
      setModel(u.uModelA.value, _q2)
      u.uCA.value.set(c1.x + (c2.x - c1.x) * a2.move, c1.y + (c2.y - c1.y) * a2.move)
      u.uScaleA.value = B1.scale
      u.uMorph.value = a2.morph
      u.uCB.value.set(c2.x, c2.y)
      u.uScaleB.value = B2.scale
      setModel(u.uModelB.value, swayQ)
      u.uDestruct.value = a2.destruct
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
      u.uCA.value.set(c2.x + (c3.x - c2.x) * a3.move, c2.y + (c3.y - c2.y) * a3.move)
      u.uScaleA.value = B2.scale
      u.uMorph.value = a3.morph
      u.uCB.value.set(c3.x, c3.y)
      u.uScaleB.value = B3.scale
      _q.copy(swayQ).multiply(scene.qCity)
      setModel(u.uModelB.value, _q)
      u.uDestruct.value = a3.destruct
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
      // the big roundabout's own center on the "亮色road" layer), not the cloud's bounding-box center:
      // R0 = swayQ * qCity (resting orientation), R = R0 * Ry(theta) (with the turn); uOffA carries the
      // translation a pivoted rotation needs on top of a pure origin-centered one (R0*P - R*P, so a
      // point at the pivot itself doesn't move).
      _q.copy(swayQ).multiply(scene.qCity) // R0
      _q2.copy(_q).multiply(_q3.setFromAxisAngle(_yAxis, a4.spin * SPIN_TURNS * 2 * Math.PI)) // R
      setModel(u.uModelA.value, _q2)
      u.uOffA.value.copy(CITY_PIVOT_VEC).applyQuaternion(_q).sub(_v.copy(CITY_PIVOT_VEC).applyQuaternion(_q2))
      u.uCA.value.set(c3.x + (c4.x - c3.x) * a4.move, c3.y + (c4.y - c3.y) * a4.move)
      u.uScaleA.value = B3.scale
      u.uMorph.value = a4.morph
      u.uCB.value.set(c4.x, c4.y)
      u.uScaleB.value = B4.scale
      _q.copy(swayQ).multiply(scene.qArm)
      setModel(u.uModelB.value, _q)
      u.uDestruct.value = a4.destruct
      u.uExplodeDist.value = R0
    }

    // The Industry 4.0 arm cloud once it has formed.
    scene.arm.visible = done4 && !socialFormed
    {
      const u = scene.arm.material.uniforms
      // Closing turn: once the arm's pin releases, it turns a full turn while sliding to the middle of the screen.
      u.uCA.value.set(c4.x + (0 - c4.x) * a5.move, c4.y)
      u.uScaleA.value = B4.scale
      _q.copy(swayQ).multiply(scene.qArm)
      _q2.setFromAxisAngle(_yAxis, a5.spin * SPIN_TURNS * 2 * Math.PI).multiply(_q)
      setModel(u.uModelA.value, _q2)
    }

    // The social-media chip cluster: replaces the arm outright (no morph - see socialFormed above),
    // holds in place as the backdrop for the rest of the page.
    scene.social.visible = socialFormed
    {
      _q3.copy(swayQ).multiply(scene.qSocial)
      const u = scene.social.material.uniforms
      u.uCA.value.set(0, 0)
      u.uScaleA.value = SOCIAL_SCALE_PX
      setMirroredModel(u.uModelA.value, _q3)
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
      <primitive object={scene.social} />
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
