import { useMemo } from 'react'
import { useLoader } from '@react-three/fiber'
import { GLTFLoader } from 'three-stdlib'
import { extractMeshGeometry } from './extractMeshGeometry'
import { flatColor } from './particleColors'
import ParticleMesh from './ParticleMesh'

// Largest bounding-box axis of the model, after centering, in world units.
const TARGET_EXTENT = 3.6
const PARTICLE_SIZE = 0.03
// Industry 4.0's theme accent from particle_brain_demo_logo_24.html's anchor set (lab3).
const PARTICLE_COLOR = '#6a6fc4'

/**
 * Static particle-cloud rendering of the Industry 4.0 robotic-arm model: the mesh's own vertices
 * become points, one flat theme color (no zones - this model only represents one research
 * direction), no connecting edges (points only, per the brief).
 */
export default function IndustryArmParticles() {
  const gltf = useLoader(GLTFLoader, '/models/industry-arm.glb')

  const { positions, sizes, colors } = useMemo(() => {
    const geo = extractMeshGeometry(gltf.scene, { targetExtent: TARGET_EXTENT, includeEdges: false })
    const colors = flatColor(geo.positions.length / 3, PARTICLE_COLOR)
    return { ...geo, colors }
  }, [gltf])

  return <ParticleMesh positions={positions} sizes={sizes} colors={colors} particleSize={PARTICLE_SIZE} />
}
