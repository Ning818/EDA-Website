import { useMemo } from 'react'
import * as THREE from 'three'
import { useLoader, useThree } from '@react-three/fiber'
import { FBXLoader } from 'three-stdlib'
import { extractFbxWireframe } from './extractFbxWireframe'
import { makeCircleTexture } from './makeCircleTexture'

// Largest bounding-box axis of the model, after centering, in world units.
const TARGET_EXTENT = 3.6

const PARTICLE_SIZE = 0.05
const EDGE_COLOR = new THREE.Color('#4a9db3')
const EDGE_OPACITY = 0.5

// The four research-theme anchor colors from particle_brain_demo_logo_24.html (positions there
// were hand-placed for that specific STL-sourced brain; here they're expressed as fractions of
// targetExtent so the same front-upper-left/front-upper-right/back-lower-left/back-lower-right
// zone pattern carries over to this differently-proportioned model).
const ANCHORS = [
  { pos: [-0.48, 0.24, 0.13], color: new THREE.Color('#4bb47b') }, // lab0 VLSI-CAD
  { pos: [0.48, 0.24, 0.13], color: new THREE.Color('#3fb0b8') }, // lab1 Bioinformatics
  { pos: [-0.39, -0.3, 0.17], color: new THREE.Color('#4a9db3') }, // lab2 Smart City
  { pos: [0.39, -0.3, 0.17], color: new THREE.Color('#6a6fc4') }, // lab3 Industry 4.0
]

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
 * Static particle-cloud rendering of the brain FBX model: the mesh's own vertices become points,
 * its own triangle edges become connecting lines - no random sampling, so the result directly
 * shows the model's low-poly faceted structure. Colors and sizing ported from
 * particle_brain_demo_logo_24.html's brain state (four-zone anchor coloring, circular point
 * sprites, perspective-correct point-size shader).
 */
export default function BrainParticles() {
  const fbx = useLoader(FBXLoader, '/models/brain.fbx')
  const { size, camera } = useThree()

  const { positions, colors, sizes, edgePositions } = useMemo(
    () => extractFbxWireframe(fbx, { targetExtent: TARGET_EXTENT, anchors: ANCHORS }),
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
