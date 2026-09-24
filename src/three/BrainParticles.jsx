import { useMemo } from 'react'
import * as THREE from 'three'
import { useLoader } from '@react-three/fiber'
import { GLTFLoader } from 'three-stdlib'
import { extractMeshGeometry } from './extractMeshGeometry'
import { colorByAnchors } from './particleColors'
import { computeFoldWeight } from './computeFoldWeight'
import ParticleMesh from './ParticleMesh'

// Largest bounding-box axis of the model, after centering, in world units. 10% larger than the
// model's own natural scale (was 3.6) - the camera/container are unchanged, so this just makes
// the brain fill more of its box.
const TARGET_EXTENT = 3.96
const PARTICLE_SIZE = 0.05
// A particle facing away from the camera, or sitting in a concave fold/crease of the surface,
// blends its color 70% of the way to white - front-facing particles stay their pure zone color
// and are always fully opaque; only color varies, never transparency.
const WHITE_FADE = 0.7

// Four-zone anchor coloring: every particle is colored by whichever of these four positions it's
// closest to (see colorByAnchors). Anchor positions are unchanged from before - only the colors
// themselves are this new palette.
const ANCHORS = [
  { pos: [-0.48, 0.24, 0.13], color: new THREE.Color('#6a6fc4') }, // 紫色
  { pos: [0.48, 0.24, 0.13], color: new THREE.Color('#4a9db3') }, // 另一种蓝绿色
  { pos: [-0.39, -0.3, 0.17], color: new THREE.Color('#3fb0b8') }, // 蓝绿色
  { pos: [0.39, -0.3, 0.17], color: new THREE.Color('#4ab47a') }, // 绿色
]

/**
 * Static particle-cloud rendering of the brain GLB model: the mesh's own vertices become points -
 * no connecting edges, no random sampling, so the result directly shows the model's own vertex
 * distribution. Circular point sprites with a perspective-correct point-size shader.
 */
export default function BrainParticles() {
  const gltf = useLoader(GLTFLoader, '/models/brain.glb')

  const { positions, sizes, normals, colors, foldWeights } = useMemo(() => {
    const geo = extractMeshGeometry(gltf.scene, { targetExtent: TARGET_EXTENT, includeEdges: false })
    const colors = colorByAnchors(geo.positions, ANCHORS, TARGET_EXTENT)
    const foldWeights = computeFoldWeight(geo.positions, geo.normals, geo.edgePairs)
    return { ...geo, colors, foldWeights }
  }, [gltf])

  return (
    <ParticleMesh
      positions={positions}
      sizes={sizes}
      colors={colors}
      normals={normals}
      foldWeights={foldWeights}
      particleSize={PARTICLE_SIZE}
      backWhiteFade={WHITE_FADE}
      foldWhiteFade={WHITE_FADE}
      depthWrite
    />
  )
}
