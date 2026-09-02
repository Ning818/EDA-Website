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
// Opacity for particles on the model's far side (surface normal facing away from the camera).
const BACK_OPACITY = 0.35
// Roll (camera-facing tilt) applied to the whole model: 45deg down-and-right, clockwise.
const ROLL = -Math.PI / 4

/**
 * Particle-cloud rendering of the Industry 4.0 robotic-arm model: points only (no connecting
 * edges), evenly resampled along the mesh's own edges rather than using its native vertices, one
 * flat theme color (this model represents a single research direction, not four zones).
 * Far-side particles fade to BACK_OPACITY for a sense of depth; the whole cloud is tilted 45deg
 * (down-right roll) to face the camera at an angle instead of dead-on.
 */
export default function IndustryArmParticles() {
  const gltf = useLoader(GLTFLoader, '/models/industry-arm.glb')

  const { positions, sizes, colors, normals } = useMemo(() => {
    const geo = sampleEdgePoints(gltf.scene, { targetExtent: TARGET_EXTENT, spacing: EDGE_SPACING })
    const colors = flatColor(geo.positions.length / 3, PARTICLE_COLOR)
    return { ...geo, colors }
  }, [gltf])

  return (
    <group rotation={[0, 0, ROLL]}>
      <ParticleMesh
        positions={positions}
        sizes={sizes}
        colors={colors}
        normals={normals}
        particleSize={PARTICLE_SIZE}
        backOpacity={BACK_OPACITY}
        hollow
      />
    </group>
  )
}
