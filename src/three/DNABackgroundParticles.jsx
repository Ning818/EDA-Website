import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useLoader, useThree } from '@react-three/fiber'
import { AdditiveBlending, FileLoader } from 'three'
import { parseDXFToChains } from './parseDXF'
import { sampleChainsExact } from './sampleChainsExact'

const PARTICLE_COUNT = 4000
// Same as DNAParticles.jsx - each backbone SPLINE is a full multi-turn helix, so it needs far more
// than the default 48 evaluation steps to not look faceted.
const CURVE_SEGMENTS = 1000
// Model length along its principal axis in local units; the group is rescaled to the viewport.
const MODEL_LENGTH = 10
// Fraction of the viewport diagonal the model spans.
const FIT = 0.92
// Rough half-thickness of the model across its axis, in the same local units (from sampling).
const MODEL_DEPTH = 4
const INTRO_SECONDS = 3.2
const SPIN_SPEED = 0.12 // rad/s around the model's own axis

// sRGB components written straight to gl_FragColor (no linear conversion - see the fragment
// shader), so these come out exactly as the hex reads.
const DNA_COLOR = '#4fd8a4'
const DNA_COLOR_DEEP = '#2a8fd6'
const HIGHLIGHT_COLOR = '#ffbf5e'

const VERTEX_SHADER = /* glsl */ `
  attribute vec3 aColor;
  attribute vec3 aScatter;   // start position for the intro "assemble" animation
  attribute vec4 aRandom;    // per-particle seeds in 0..1
  attribute float aAxisT;    // 0..1 along the model's long axis
  attribute float aChainT;   // 0..1 along the particle's own curve

  uniform float uTime;
  uniform float uIntro;      // 0..1 overall intro progress
  uniform float uSize;
  uniform float uPixelScale;
  uniform vec2 uMouse;       // NDC, -1..1
  uniform float uAspect;
  uniform float uMouseStrength;
  uniform float uDepthRange; // half the model's depth, in view units

  varying vec3 vColor;
  varying float vAlpha;
  varying float vGlow;

  float easeOutCubic(float x) { return 1.0 - pow(1.0 - x, 3.0); }

  void main() {
    // Staggered assemble: each particle starts at its own delay and flies in from aScatter.
    float delay = aRandom.x * 0.55 + aAxisT * 0.25;
    float p = easeOutCubic(clamp((uIntro - delay) / 0.45, 0.0, 1.0));
    vec3 pos = mix(aScatter, position, p);

    // Idle drift - small independent wobble per particle so the strands feel alive.
    float t = uTime * (0.35 + aRandom.y * 0.4);
    pos += vec3(
      sin(t + aRandom.z * 6.2831),
      cos(t * 0.9 + aRandom.w * 6.2831),
      sin(t * 1.1 + aRandom.x * 6.2831)
    ) * 0.03;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);

    // Mouse repulsion, measured in screen space so it matches what the cursor visually covers.
    vec4 clip = projectionMatrix * mv;
    vec2 ndc = clip.xy / clip.w;
    vec2 d = (ndc - uMouse) * vec2(uAspect, 1.0);
    float dist = length(d);
    float push = smoothstep(0.32, 0.0, dist) * uMouseStrength;
    mv.xy += normalize(d + 1e-5) * push * 0.9;

    // A pulse of light travelling along the helix, plus per-particle twinkle.
    float wave = sin(aAxisT * 9.0 - uTime * 1.6);
    float pulse = smoothstep(0.82, 1.0, wave);
    float flow = smoothstep(0.9, 1.0, sin(aChainT * 40.0 - uTime * 3.0 + aRandom.w * 2.0));
    float twinkle = 0.7 + 0.3 * sin(uTime * (1.5 + aRandom.y * 2.5) + aRandom.z * 30.0);

    vGlow = pulse + flow * 0.6 + push * 1.5;
    vColor = aColor;
    // Depth cue: the far side of the helix sits dimmer.
    float centerZ = (modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).z;
    float depth = clamp((mv.z - centerZ) / uDepthRange * 0.5 + 0.5, 0.0, 1.0);
    vAlpha = (0.35 + 0.65 * depth) * twinkle * mix(0.0, 1.0, smoothstep(0.0, 0.15, p + 0.05));

    gl_PointSize = uSize * (0.6 + aRandom.w * 0.8) * (1.0 + vGlow * 0.8) * (uPixelScale / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`

const FRAGMENT_SHADER = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  varying float vGlow;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    // Bright core + soft halo, drawn procedurally (no sprite texture needed).
    float core = smoothstep(0.22, 0.0, d);
    float halo = pow(smoothstep(0.5, 0.0, d), 2.2);
    vec3 color = mix(vColor, vec3(1.0), core * 0.55 + vGlow * 0.35);
    float alpha = (core + halo * 0.6) * vAlpha * (1.0 + vGlow * 0.6);
    gl_FragColor = vec4(color, alpha); // additive: src * alpha + dst
  }
`

function hexToRGB(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

/**
 * Full-viewport particle background built from dna6.dxf: exactly 4000 points sampled evenly along
 * the model's curves (sampleChainsExact.js), rendered with a custom shader that assembles them
 * from a scattered cloud on load, keeps them gently drifting and twinkling, runs light pulses
 * along the strands, and pushes them away from the cursor. The model is laid along the screen
 * diagonal, rescaled on resize, and slowly spins around its own axis.
 */
export default function DNABackgroundParticles({ reducedMotion = false }) {
  const text = useLoader(FileLoader, `${import.meta.env.BASE_URL}models/dna6.dxf`, (loader) => loader.setResponseType('text'))
  const { size, camera, viewport } = useThree()
  const fitGroup = useRef()
  const spinGroup = useRef()
  const material = useRef()
  const mouse = useRef({ x: 0, y: 0, active: 0 })
  const mouseSmoothed = useRef({ x: 0, y: 0, strength: 0 })

  const attributes = useMemo(() => {
    const { chains, chainGroups } = parseDXFToChains(text, { curveSegments: CURVE_SEGMENTS })
    const { positions, groups, chainT, axisT } = sampleChainsExact(chains, chainGroups, {
      count: PARTICLE_COUNT,
      targetLength: MODEL_LENGTH,
    })

    let s = 7
    const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
    const colors = new Float32Array(PARTICLE_COUNT * 3)
    const scatter = new Float32Array(PARTICLE_COUNT * 3)
    const random = new Float32Array(PARTICLE_COUNT * 4)
    const dna = hexToRGB(DNA_COLOR), deep = hexToRGB(DNA_COLOR_DEEP), hi = hexToRGB(HIGHLIGHT_COLOR)
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Main strands shade from green to blue along the axis; the "亮色DNA" layer stays amber.
      const c = groups[i] === '亮色DNA' ? hi : dna.map((v, k) => v + (deep[k] - v) * axisT[i])
      colors.set(c, i * 3)
      // Scatter on a wide shell around the model.
      const u = rnd() * 2 - 1, phi = rnd() * Math.PI * 2, r = 6 + rnd() * 8
      const q = Math.sqrt(1 - u * u)
      scatter.set([q * Math.cos(phi) * r, u * r, q * Math.sin(phi) * r], i * 3)
      random.set([rnd(), rnd(), rnd(), rnd()], i * 4)
    }
    return { positions, colors, scatter, random, axisT, chainT }
  }, [text])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uIntro: { value: reducedMotion ? 1.5 : 0 },
      uSize: { value: 0.11 },
      uPixelScale: { value: 1 },
      uMouse: { value: [0, 0] },
      uAspect: { value: 1 },
      uMouseStrength: { value: 0 },
      uDepthRange: { value: 1 },
    }),
    [reducedMotion],
  )

  useEffect(() => {
    const onMove = (e) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1
      mouse.current.y = -((e.clientY / window.innerHeight) * 2 - 1)
      mouse.current.active = 1
    }
    const onLeave = () => { mouse.current.active = 0 }
    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerleave', onLeave)
    return () => {
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  useFrame((state, delta) => {
    const u = material.current?.uniforms
    if (!u) return
    const dt = Math.min(delta, 0.05)
    u.uTime.value = reducedMotion ? 0 : state.clock.elapsedTime
    if (u.uIntro.value < 1.5) u.uIntro.value += dt / INTRO_SECONDS
    u.uPixelScale.value = (size.height * state.gl.getPixelRatio()) / (2 * Math.tan((camera.fov * Math.PI) / 360))
    u.uAspect.value = size.width / size.height

    const k = 1 - Math.exp(-6 * dt)
    const m = mouseSmoothed.current
    m.x += (mouse.current.x - m.x) * k
    m.y += (mouse.current.y - m.y) * k
    m.strength += (mouse.current.active - m.strength) * k
    u.uMouse.value = [m.x, m.y]
    u.uMouseStrength.value = m.strength

    // Lay the helix along the screen diagonal at a size that fills the viewport.
    const { width, height } = viewport.getCurrentViewport(camera, [0, 0, 0])
    const g = fitGroup.current
    const fitScale = (Math.hypot(width, height) * FIT) / MODEL_LENGTH
    g.scale.setScalar(fitScale)
    u.uDepthRange.value = fitScale * MODEL_DEPTH
    g.rotation.z = Math.atan2(height, width) * 0.85
    // Slight parallax toward the cursor.
    g.rotation.x += (-m.y * 0.12 - g.rotation.x) * k
    g.rotation.y += (m.x * 0.15 - g.rotation.y) * k

    if (!reducedMotion) spinGroup.current.rotation.x += dt * SPIN_SPEED
  })

  return (
    <group ref={fitGroup}>
      <group ref={spinGroup}>
        <points frustumCulled={false}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[attributes.positions, 3]} />
            <bufferAttribute attach="attributes-aColor" args={[attributes.colors, 3]} />
            <bufferAttribute attach="attributes-aScatter" args={[attributes.scatter, 3]} />
            <bufferAttribute attach="attributes-aRandom" args={[attributes.random, 4]} />
            <bufferAttribute attach="attributes-aAxisT" args={[attributes.axisT, 1]} />
            <bufferAttribute attach="attributes-aChainT" args={[attributes.chainT, 1]} />
          </bufferGeometry>
          <shaderMaterial
            ref={material}
            vertexShader={VERTEX_SHADER}
            fragmentShader={FRAGMENT_SHADER}
            uniforms={uniforms}
            transparent
            depthWrite={false}
            blending={AdditiveBlending}
          />
        </points>
      </group>
    </group>
  )
}
