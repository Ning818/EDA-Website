import { useMemo } from 'react'
import { useLoader } from '@react-three/fiber'
import { GLTFLoader } from 'three-stdlib'
import { sampleEdgePoints } from './sampleEdgePoints'
import { flatColor } from './particleColors'
import ParticleMesh from './ParticleMesh'

// Largest bounding-box axis of the model, after centering, in world units.
const TARGET_EXTENT = 3.6
// Target distance between consecutive points along an edge (same units as TARGET_EXTENT) -
// this is what makes density even across the model instead of following its native, uneven
// vertex spacing.
const EDGE_SPACING = 0.05
const PARTICLE_SIZE = 0.03
// Industry 4.0's theme accent from particle_brain_demo_logo_24.html's anchor set (lab3).
const PARTICLE_COLOR = '#6a6fc4'

/**
 * Particle-cloud rendering of the Industry 4.0 robotic-arm model: points only (no connecting
 * edges), evenly resampled along the mesh's own edges rather than using its native vertices, one
 * flat theme color (this model represents a single research direction, not four zones).
 */
export default function IndustryArmParticles() {
  const gltf = useLoader(GLTFLoader, '/models/industry-arm.glb')

  const { positions, sizes, colors } = useMemo(() => {
    const geo = sampleEdgePoints(gltf.scene, { targetExtent: TARGET_EXTENT, spacing: EDGE_SPACING })
    const colors = flatColor(geo.positions.length / 3, PARTICLE_COLOR)
    return { ...geo, colors }
  }, [gltf])

  return <ParticleMesh positions={positions} sizes={sizes} colors={colors} particleSize={PARTICLE_SIZE} />
}
