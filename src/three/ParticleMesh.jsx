import { useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { makeCircleTexture } from './makeCircleTexture'

const VERTEX_SHADER = `
  attribute float size;
  attribute vec3 color;
  varying vec3 vColor;
  uniform float uBaseSize;
  uniform float uPixelScale;
  void main() {
    vColor = color;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * uBaseSize * (uPixelScale / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const FRAGMENT_SHADER = `
  uniform sampler2D uMap;
  varying vec3 vColor;
  void main() {
    vec4 tex = texture2D(uMap, gl_PointCoord);
    if (tex.a < 0.5) discard; // hard cutoff keeps the circle edge clean instead of blurry
    gl_FragColor = vec4(vColor, 1.0);
  }
`

/**
 * Shared renderer for a mesh-derived particle cloud: circular point sprites with
 * perspective-correct sizing (mirrors THREE.PointsMaterial's sizeAttenuation, done by hand since
 * a custom ShaderMaterial doesn't get that for free), plus an optional line-segments overlay.
 *
 * Purely presentational - `positions`/`sizes`/`colors`/`edgePositions` come from
 * extractMeshGeometry.js + particleColors.js.
 */
export default function ParticleMesh({ positions, sizes, colors, edgePositions, particleSize, edgeColor, edgeOpacity = 0.5 }) {
  const { size, camera } = useThree()
  const circleTexture = useMemo(() => makeCircleTexture(), [])
  const pixelScale = size.height / (2 * Math.tan((camera.fov * Math.PI) / 360))

  return (
    <group>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
          <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
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
