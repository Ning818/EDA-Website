import { useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { makeCircleTexture, makeRingTexture } from './makeCircleTexture'

const VERTEX_SHADER = `
  attribute float size;
  attribute vec3 color;
  // Named aNormal (not "normal") - THREE.ShaderMaterial auto-injects its own "attribute vec3
  // normal" declaration, and redeclaring that name breaks shader compilation.
  attribute vec3 aNormal;
  varying vec3 vColor;
  varying float vFacing;
  uniform float uBaseSize;
  uniform float uPixelScale;
  void main() {
    vColor = color;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    // dot of the (view-space) surface normal with the direction back to the camera: positive
    // means this point faces the camera, negative means it's on the model's far side.
    vec3 viewNormal = normalize(normalMatrix * aNormal);
    vec3 viewDir = normalize(-mvPosition.xyz);
    vFacing = dot(viewNormal, viewDir);
    gl_PointSize = size * uBaseSize * (uPixelScale / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const FRAGMENT_SHADER = `
  uniform sampler2D uMap;
  uniform float uBackOpacity;
  varying vec3 vColor;
  varying float vFacing;
  void main() {
    vec4 tex = texture2D(uMap, gl_PointCoord);
    if (tex.a < 0.5) discard; // hard cutoff keeps the circle edge clean instead of blurry
    float alpha = vFacing >= 0.0 ? 1.0 : uBackOpacity;
    gl_FragColor = vec4(vColor, alpha);
  }
`

/**
 * Shared renderer for a mesh-derived particle cloud: circular point sprites with
 * perspective-correct sizing (mirrors THREE.PointsMaterial's sizeAttenuation, done by hand since
 * a custom ShaderMaterial doesn't get that for free), plus an optional line-segments overlay.
 * Points facing away from the camera (per their surface normal) render at `backOpacity` instead
 * of fully opaque, for a sense of depth/see-through on the model's far side - pass a real
 * `normals` buffer to use this; omit it (defaults to all-camera-facing) to disable the effect.
 *
 * Purely presentational - `positions`/`sizes`/`colors`/`normals`/`edgePositions` come from
 * extractMeshGeometry.js / sampleEdgePoints.js + particleColors.js.
 *
 * `hollow` swaps each particle's sprite from a filled disc to a stroked ring (transparent
 * center) - the color still comes from the `colors` attribute either way, this only changes the
 * dot's shape/mask.
 */
export default function ParticleMesh({
  positions,
  sizes,
  colors,
  normals,
  edgePositions,
  particleSize,
  edgeColor,
  edgeOpacity = 0.5,
  backOpacity = 1,
  hollow = false,
}) {
  const { size, camera } = useThree()
  const circleTexture = useMemo(() => (hollow ? makeRingTexture() : makeCircleTexture()), [hollow])
  const pixelScale = size.height / (2 * Math.tan((camera.fov * Math.PI) / 360))

  // Default: every point "faces the camera", so the back-fade effect is a no-op unless the
  // caller supplies real normals.
  const effectiveNormals = useMemo(() => {
    if (normals) return normals
    const n = new Float32Array(positions.length)
    for (let i = 2; i < n.length; i += 3) n[i] = 1
    return n
  }, [normals, positions])

  return (
    <group>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
          <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
          <bufferAttribute attach="attributes-aNormal" args={[effectiveNormals, 3]} />
        </bufferGeometry>
        <shaderMaterial
          transparent
          depthWrite={false}
          vertexShader={VERTEX_SHADER}
          fragmentShader={FRAGMENT_SHADER}
          uniforms={{
            uMap: { value: circleTexture },
            uBaseSize: { value: particleSize },
            uPixelScale: { value: pixelScale },
            uBackOpacity: { value: backOpacity },
          }}
        />
      </points>

      {edgePositions && edgePositions.length > 0 && (
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[edgePositions, 3]} />
          </bufferGeometry>
          <lineBasicMaterial color={edgeColor} transparent opacity={edgeOpacity} depthWrite={false} />
        </lineSegments>
      )}
    </group>
  )
}
