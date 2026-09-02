import { useMemo } from 'react'
import * as THREE from 'three'
import { useLoader, useThree } from '@react-three/fiber'
import { FBXLoader } from 'three-stdlib'
import { sampleFbxSurface } from './sampleFbxSurface'
import { makeCircleTexture } from './makeCircleTexture'

// Total particles sampled across the whole brain surface. Rendering cost is a shader draw call
// on a single Points object, so this can stay generous - it's the edge graph below that's the
// actual cost driver, which is why it only runs over a much smaller subset.
const COUNT = 2800
// How many of those particles also participate in the k-NN "network" edge graph (O(n^2) to build).
const MESH_COUNT = 700
// Largest bounding-box axis of the model, after centering, in world units.
const TARGET_EXTENT = 3.6
const EDGE_K = 4
const EDGE_RELATIVE_FACTOR = 2.6

const PARTICLE_SIZE = 0.05
const PARTICLE_COLOR = new THREE.Color('#00284b')
const EDGE_COLOR = new THREE.Color('#4a9db3')
const EDGE_OPACITY = 0.6

const VERTEX_SHADER = `
  attribute float size;
  uniform float uBaseSize;
  uniform float uPixelScale;
  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * uBaseSize * (uPixelScale / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const FRAGMENT_SHADER = `
  uniform sampler2D uMap;
  uniform vec3 uColor;
  void main() {
    vec4 tex = texture2D(uMap, gl_PointCoord);
    if (tex.a < 0.5) discard; // hard cutoff keeps the circle edge clean instead of blurry
    gl_FragColor = vec4(uColor, 1.0);
  }
`

/**
 * Static particle-cloud rendering of the brain FBX model: an area-weighted sample of points
 * across its surface, rendered as soft circular dots, plus a sparse nearest-neighbor "network"
 * of connecting lines over a subset of them for a neural-network texture.
 *
 * Ported style-wise from particle_brain_demo_logo_24.html - see sampleFbxSurface.js for the
 * sampling algorithm itself.
 */
export default function BrainParticles() {
  const fbx = useLoader(FBXLoader, '/models/brain.fbx')
  const { size, camera } = useThree()

  const { positions, sizes, edgePositions } = useMemo(
    () =>
      sampleFbxSurface(fbx, {
        count: COUNT,
        meshCount: MESH_COUNT,
        targetExtent: TARGET_EXTENT,
        edgeK: EDGE_K,
        edgeRelativeFactor: EDGE_RELATIVE_FACTOR,
      }),
    [fbx],
  )

  const circleTexture = useMemo(() => makeCircleTexture(), [])

  // Matches THREE.PointsMaterial's built-in sizeAttenuation math, done by hand in the vertex
  // shader since a custom ShaderMaterial doesn't get that behavior for free.
  const pixelScale = size.height / (2 * Math.tan((camera.fov * Math.PI) / 360))

  return (
    <group>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
        </bufferGeometry>
        <shaderMaterial
          transparent
          depthWrite={false}
          vertexShader={VERTEX_SHADER}
          fragmentShader={FRAGMENT_SHADER}
          uniforms={{
            uMap: { value: circleTexture },
            uColor: { value: PARTICLE_COLOR },
            uBaseSize: { value: PARTICLE_SIZE },
            uPixelScale: { value: pixelScale },
          }}
        />
      </points>

      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[edgePositions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color={EDGE_COLOR} transparent opacity={EDGE_OPACITY} depthWrite={false} />
      </lineSegments>
    </group>
  )
}
