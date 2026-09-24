import { useMemo } from 'react'
import { useLoader } from '@react-three/fiber'
import { GLTFLoader } from 'three-stdlib'
import { sampleGLBLinesAndMesh } from './parseGLBLines'
import { colorByGroup } from './particleColors'
import ParticleMesh from './ParticleMesh'

// Bounding-box max axis of the chips wireframe PLUS the hand, sharing one center/scale.
const TARGET_EXTENT = 2.9
const EDGE_SPACING = 0.045
// Minimum distance between the hand's surface points (blue-noise thinned, see parseGLBLines.js).
const MESH_SPACING = 0.04
const PARTICLE_SIZE = 0.03
// Hand points on its far side (surface facing away from the camera - the part occluded by the
// hand itself) blend this far toward white, so the near side reads clearly in front of it.
const HAND_BACK_WHITE_FADE = 0.6
// VLSI-CAD's theme accent - the remaining anchor color from particle_brain_demo_logo_24.html's
// set not already used by another scene. "亮色的芯片" (bright chip) reuses the shared highlight.
const CHIP_COLOR = '#3fb0b8'
const HIGHLIGHT_COLOR = '#e0a94a'
// Matched to the user's fourth (chips7) Rhino perspective screenshot: the GLB's +z is the board's underside (hand sits
// on the -z side), so flip 180deg about X first, then yaw 121deg about the board normal and tilt 50deg
// from straight-down. Found by rendering candidates offline and comparing to the reference.
const ORIENTATION = [0.4462873070420821, -0.7888101447220338, 0.3678282113142371, 0.20810718901109412]

/**
 * Particle-cloud rendering of the VLSI-CAD scene (chips.glb): a line-art motherboard/chips
 * wireframe ("线框", "亮色的芯片" bright chip) plus a triangulated hand mesh ("亮色的手") reaching
 * toward it. Lines are resampled at even arc-length spacing; the hand becomes an evenly spread
 * surface point cloud (parseGLBLines.js's sampleGLBLinesAndMesh), both sharing one transform.
 */
export default function VLSICADParticles() {
  const gltf = useLoader(GLTFLoader, '/models/chips.glb')

  const { positions, sizes, colors, normals, normalMask } = useMemo(() => {
    const geo = sampleGLBLinesAndMesh(gltf.scene, { targetExtent: TARGET_EXTENT, spacing: EDGE_SPACING, meshSpacing: MESH_SPACING })
    const colors = colorByGroup(geo.groups, { '亮色的芯片': HIGHLIGHT_COLOR, '亮色的手': HIGHLIGHT_COLOR, '线框': CHIP_COLOR }, CHIP_COLOR)
    return { ...geo, colors }
  }, [gltf])

  return (
    <group quaternion={ORIENTATION}>
      <ParticleMesh
        positions={positions}
        sizes={sizes}
        colors={colors}
        normals={normals}
        normalMask={normalMask}
        particleSize={PARTICLE_SIZE}
        backWhiteFade={HAND_BACK_WHITE_FADE}
      />
    </group>
  )
}
