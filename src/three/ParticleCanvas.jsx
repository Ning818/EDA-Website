import { Suspense, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { FileLoader } from 'three'
import { GLTFLoader } from 'three-stdlib'
import { buildBrainCloud, BRAIN_PARTICLE_SIZE } from './BrainParticles'
import { buildVLSICloud, VLSI_ORIENTATION, VLSI_PARTICLE_SIZE } from './VLSICADParticles'
import { buildDNACloud, DNA_PARTICLE_SIZE } from './DNAParticles'
import { buildCityCloud, CITY_ORIENTATION, CITY_PARTICLE_SIZE } from './SmartCityParticles'
import { buildArmCloud, ARM_ORIENTATION, ARM_PARTICLE_SIZE } from './IndustryArmParticles'
import { matchClouds } from './morphMatch'
import { makeCircleTexture } from './makeCircleTexture'
import { brainState } from './cloudState'

/*
 * One page-wide, fixed WebGL canvas that draws every section's particle cloud, so a cloud can
 * travel between sections (the brain scatters and regathers into the first theme's cloud) instead
 * of each section being its own canvas. Each cloud is placed on screen from a DOM "anchor" element
 * (data-cloud="...", the same box its old per-section canvas filled), and text/layout scrolls
 * normally on top of this canvas.
 *
 * Each cloud is drawn as if seen by the old per-section camera (position z=CAM looking at the
 * origin, 45deg fov): the vertex shader does that perspective itself in unit space, then places the
 * result in pixels around the anchor's center, so every cloud looks the same as before.
 */

const CAM = 6
const FOV = 45
const PX_PER_UNIT_PER_ANCHOR_PX = 1 / (2 * CAM * Math.tan((FOV * Math.PI) / 360))
const SPIN_SPEED = 0.6 * ((2 * Math.PI) / 60) // rad/s: OrbitControls' autoRotateSpeed 0.6 (about 0.063 rad/s)
const SWAY_YAW = 0.12, SWAY_PITCH = 0.09, SWAY_EASE = 14 // mouse sway of the four themes

// Brain -> first-theme morph, learned from particle_brain_demo_logo_24.html: straight interpolation
// plus a curl-noise displacement whose strength follows sin(pi * t) over progress 0.2..0.8 -
// zero at both ends, so the start is the plain brain and the end lands exactly on the target,
// but in between the cloud disperses along organic flow lines and regathers.
const WAVE_LO = 0.2, WAVE_HI = 0.8
const WAVE_AMP = 3.0 // x the brain's on-screen radius
const WAVE_SCALE = 2.5 // noise feature size, x the brain's radius (bigger = lower frequency = smoother streams)
// The cloud scatters in place around the brain, travels to the theme while scattered, and regathers
// there: position/size/color follow smoothstep(TRAVEL_LO, TRAVEL_HI, progress), not progress itself.
const TRAVEL_LO = 0.35, TRAVEL_HI = 0.65
const NOISE_FLOW_SPEED = 0.12

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
  uniform float uTime;
  uniform float uWaveAmp;
  uniform float uWaveScale;
  uniform float uCam;
  varying vec3 vColor;

  vec3 hash3(vec3 p) {
    p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
  }
  float gnoise(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(dot(hash3(i + vec3(0,0,0)), f - vec3(0,0,0)), dot(hash3(i + vec3(1,0,0)), f - vec3(1,0,0)), u.x),
          mix(dot(hash3(i + vec3(0,1,0)), f - vec3(0,1,0)), dot(hash3(i + vec3(1,1,0)), f - vec3(1,1,0)), u.x), u.y),
      mix(mix(dot(hash3(i + vec3(0,0,1)), f - vec3(0,0,1)), dot(hash3(i + vec3(1,0,1)), f - vec3(1,0,1)), u.x),
          mix(dot(hash3(i + vec3(0,1,1)), f - vec3(0,1,1)), dot(hash3(i + vec3(1,1,1)), f - vec3(1,1,1)), u.x), u.y), u.z);
  }
  vec3 potential(vec3 p) {
    return vec3(gnoise(p), gnoise(p + vec3(31.4, 17.7, 53.1)), gnoise(p + vec3(73.9, 11.3, 29.5)));
  }
  // Curl of a 3D noise potential: a divergence-free flow field (organic swirling streams).
  vec3 curl(vec3 p) {
    float e = 0.06;
    vec3 dx = potential(p + vec3(e, 0, 0)) - potential(p - vec3(e, 0, 0));
    vec3 dy = potential(p + vec3(0, e, 0)) - potential(p - vec3(0, e, 0));
    vec3 dz = potential(p + vec3(0, 0, e)) - potential(p - vec3(0, 0, e));
    return vec3(dy.z - dz.y, dz.x - dx.z, dx.y - dy.x) / (2.0 * e);
  }
  // x,y = pixel offset from the viewport center, z = depth in pixels, w = point size in pixels.
  vec4 place(vec3 p, mat3 M, vec2 c, float sc, float base, float size) {
    vec3 r = M * p;
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
    vec4 a = place(position, uModelA, uCA, uScaleA, uBaseA, aSize);
    vec3 col = mix(aCol, vec3(1.0), whiteFade(position, aNormal, aMask, aFold, uModelA, uBackA, uFoldA));
    vec3 pos = a.xyz;
    float size = a.w;
    if (uMorph > 0.0) {
      vec4 b = place(aPosB, uModelB, uCB, uScaleB, uBaseB, aSizeB);
      vec3 colB = mix(aColB, vec3(1.0), whiteFade(aPosB, aNormalB, aMaskB, 0.0, uModelB, uBackB, 0.0));
      float travel = smoothstep(${TRAVEL_LO.toFixed(2)}, ${TRAVEL_HI.toFixed(2)}, uMorph);
      pos = mix(a.xyz, b.xyz, travel);
      size = mix(a.w, b.w, travel);
      col = mix(col, colB, travel);
      float wave = sin(clamp((uMorph - ${WAVE_LO.toFixed(2)}) / ${(WAVE_HI - WAVE_LO).toFixed(2)}, 0.0, 1.0) * 3.14159265);
      pos += curl(pos / uWaveScale + vec3(0.0, 0.0, uTime * ${NOISE_FLOW_SPEED.toFixed(2)})) * uWaveAmp * wave;
    }
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
      uMorph: { value: 0 }, uTime: { value: 0 }, uWaveAmp: { value: 0 }, uWaveScale: { value: 1 }, uCam: { value: CAM },
    },
  })
  const obj = new THREE.Points(g, m)
  obj.frustumCulled = false
  return obj
}

const _q = new THREE.Quaternion(), _m4 = new THREE.Matrix4(), _yAxis = new THREE.Vector3(0, 1, 0)
function setModel(mat3, q) {
  _m4.makeRotationFromQuaternion(q)
  mat3.setFromMatrix4(_m4)
}

function Clouds() {
  const brainGltf = useLoader(GLTFLoader, '/models/brain.glb')
  const chipsGltf = useLoader(GLTFLoader, '/models/chips.glb')
  const armGltf = useLoader(GLTFLoader, '/models/industry-arm.glb')
  const dnaText = useLoader(FileLoader, '/models/dna6.dxf', (l) => l.setResponseType('text'))
  const cityText = useLoader(FileLoader, '/models/smart-city9.dxf', (l) => l.setResponseType('text'))
  const sway = useRef({ tx: 0, ty: 0, x: 0, y: 0 })
  const anchors = useRef({})

  const scene = useMemo(() => {
    const map = makeCircleTexture()
    const brain = buildBrainCloud(brainGltf)
    const vlsi = buildVLSICloud(chipsGltf)
    const qVlsi = new THREE.Quaternion(...VLSI_ORIENTATION)

    // Match brain points to VLSI points 1:1 (brain has more; its surplus shrinks away at the end).
    const vlsiPos = rotated(vlsi.positions, qVlsi)
    const { target, extra } = matchClouds(brain.positions.map((v) => v * 140), vlsiPos.map((v) => v * 260))
    const nA = brain.positions.length / 3
    const tgt = {
      positions: new Float32Array(nA * 3), colors: new Float32Array(nA * 3), sizes: new Float32Array(nA),
      normals: new Float32Array(nA * 3), mask: new Float32Array(nA),
    }
    for (let i = 0; i < nA; i++) {
      const j = target[i]
      tgt.positions.set(vlsi.positions.subarray(j * 3, j * 3 + 3), i * 3) // unrotated; uModelB rotates it live
      tgt.colors.set(vlsi.colors.subarray(j * 3, j * 3 + 3), i * 3)
      tgt.sizes[i] = extra[i] ? 0 : vlsi.sizes[j]
      if (vlsi.normals) tgt.normals.set(vlsi.normals.subarray(j * 3, j * 3 + 3), i * 3)
      tgt.mask[i] = vlsi.normalMask ? vlsi.normalMask[j] : 0
    }
    const list = [
      { key: 'brain', obj: makePoints(map, brain, { a: BRAIN_PARTICLE_SIZE, b: VLSI_PARTICLE_SIZE, backA: 0.7, foldA: 0.7, backB: 0.6 }, tgt) },
      { key: 'vlsi', obj: makePoints(map, vlsi, { a: VLSI_PARTICLE_SIZE, backA: 0.6 }), orient: VLSI_ORIENTATION, sway: true },
      { key: 'dna', obj: makePoints(map, buildDNACloud(dnaText), { a: DNA_PARTICLE_SIZE }), sway: true },
      { key: 'city', obj: makePoints(map, buildCityCloud(cityText), { a: CITY_PARTICLE_SIZE }), orient: CITY_ORIENTATION, sway: true },
      { key: 'arm', obj: makePoints(map, buildArmCloud(armGltf), { a: ARM_PARTICLE_SIZE }), orient: ARM_ORIENTATION, sway: true },
    ]
    for (const c of list) if (c.orient) c.q = new THREE.Quaternion(...c.orient)
    return { list, qVlsi }
  }, [brainGltf, chipsGltf, armGltf, dnaText, cityText])

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

    const rect = (name) => {
      const el = anchorEl(name)
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { cx: r.left + r.width / 2 - vw / 2, cy: -(r.top + r.height / 2 - vh / 2), y: r.top + r.height / 2, scale: r.height * PX_PER_UNIT_PER_ANCHOR_PX }
    }
    const rBrain = rect('brain'), rVlsi = rect('vlsi')
    // 0 while the brain is centered in the viewport, 1 once the first theme is.
    let p = 0
    if (rBrain && rVlsi) p = THREE.MathUtils.clamp((vh / 2 - rBrain.y) / (rVlsi.y - rBrain.y), 0, 1)

    for (const c of scene.list) {
      const r = rect(c.key)
      const u = c.obj.material.uniforms
      if (!r) { c.obj.visible = false; continue }
      u.uTime.value = state.clock.elapsedTime
      u.uCA.value.set(r.cx, r.cy)
      u.uScaleA.value = r.scale
      if (c.key === 'brain') {
        c.obj.visible = p < 0.999
        _q.setFromAxisAngle(_yAxis, brainState.yaw)
        setModel(u.uModelA.value, _q)
        if (!rVlsi) { u.uMorph.value = 0; continue }
        u.uMorph.value = p
        u.uCB.value.set(rVlsi.cx, rVlsi.cy)
        u.uScaleB.value = rVlsi.scale
        _q.copy(swayQ).multiply(scene.qVlsi)
        setModel(u.uModelB.value, _q)
        const brainR = 1.98 * r.scale // model radius on screen (TARGET_EXTENT 3.96 / 2 units)
        u.uWaveAmp.value = WAVE_AMP * brainR
        u.uWaveScale.value = WAVE_SCALE * brainR
      } else {
        c.obj.visible = c.key === 'vlsi' ? p >= 0.999 : true
        if (c.sway) _q.copy(swayQ)
        else _q.identity()
        if (c.q) _q.multiply(c.q)
        setModel(u.uModelA.value, _q)
      }
    }
  })

  return (
    <>
      {scene.list.map((c) => (
        <primitive key={c.key} object={c.obj} />
      ))}
    </>
  )
}

/** Mounted once on Home: the single fixed canvas all the section clouds are drawn on. */
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
