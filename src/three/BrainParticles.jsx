import { useMemo } from 'react'
import * as THREE from 'three'
import { useLoader } from '@react-three/fiber'
import { FBXLoader } from 'three-stdlib'
import { extractMeshGeometry } from './extractMeshGeometry'
import { colorByAnchors } from './particleColors'
import ParticleMesh from './ParticleMesh'

// Largest bounding-box axis of the model, after centering, in world units.
const TARGET_EXTENT = 3.6
const PARTICLE_SIZE = 0.05
const EDGE_COLOR = '#4a9db3'
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

/**
 * Static particle-cloud rendering of the brain FBX model: the mesh's own vertices become points,
 * its own triangle edges become connecting lines - no random sampling, so the result directly
 * shows the model's low-poly faceted structure. Colors and sizing ported from
 * particle_brain_demo_logo_24.html's brain state (four-zone anchor coloring, circular point
 * sprites, perspective-correct point-size shader).
 */
export default function BrainParticles() {
  const fbx = useLoader(FBXLoader, '/models/brain.fbx')

  const { positions, sizes, edgePositions, colors } = useMemo(() => {
    const geo = extractMeshGeometry(fbx, { targetExtent: TARGET_EXTENT, includeEdges: true })
    const colors = colorByAnchors(geo.positions, ANCHORS, TARGET_EXTENT)
    return { ...geo, colors }
  }, [fbx])

  return (
    <ParticleMesh
      positions={positions}
      sizes={sizes}
      colors={colors}
      edgePositions={edgePositions}
      particleSize={PARTICLE_SIZE}
      edgeColor={EDGE_COLOR}
      edgeOpacity={EDGE_OPACITY}
    />
  )
}
