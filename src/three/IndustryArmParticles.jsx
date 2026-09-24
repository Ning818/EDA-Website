import { useMemo } from 'react'
import { useLoader } from '@react-three/fiber'
import { GLTFLoader } from 'three-stdlib'
import { sampleGLBLines } from './parseGLBLines'
import { colorByGroup } from './particleColors'
import ParticleMesh from './ParticleMesh'

// Largest bounding-box axis of the model, after centering, in world units. Two successive 5%
// shrinks from the other DXF-sourced scenes' 3.6 (3.6 -> 3.42 -> 3.249), per request -
// resampleChains centers the model on its own bounding-box center first, so this scales it down
// toward that center rather than shifting it.
const TARGET_EXTENT = 3.249
// Target distance between consecutive points along a line segment (same units as TARGET_EXTENT).
// Most of this GLB's ~800 line meshes are already just 2-point segments (Rhino exported every
// curve pre-split); resampleChains (sampleLineStrips.js) represents each one shorter than this
// spacing with a single well-centered point, so density stays even instead of depending on how
// the source app happened to split its curves. Tuned to land in the same point-count range as the
// other scenes (4337 here, vs. Smart City's 3678 and DNA's ~4900).
const EDGE_SPACING = 0.035
const PARTICLE_SIZE = 0.03
// Industry 4.0's theme accent from particle_brain_demo_logo_24.html's anchor set (lab3), for the
// plain "需要的边界" (needed boundary) layer. The "亮色的机械臂" (bright-color robotic arm) layer
// reuses Smart City's ROAD_COLOR, same as DNA's "亮色DNA" layer does, so a highlighted arm section
// reads as a distinct accent the same way across every scene.
const ARM_COLOR = '#6a6fc4'
const HIGHLIGHT_COLOR = '#e0a94a'
// Default orientation, matched by eye to a Rhino Perspective-viewport reference screenshot (drag
// the live OrbitControls view via a temporary window.__cam debug hook until the disc's ellipse
// openness and all three legs' layout - claw arm left, highlighted leg centered, plain leg right -
// line up with the reference, read out the resulting camera quaternion, invert it for use as the
// model's own rotation), then further adjusted +15deg pitch down / +10deg yaw left, then +10deg
// pitch down / +10deg yaw left, then +5deg yaw left on top of that, per request - same technique
// each time, dragging that same live view by the target amount from a fresh (camera-identity)
// load and composing the resulting quaternion onto the current base. Last step (+5deg yaw right,
// +5deg pitch down, then another +5deg pitch down, then +2deg yaw left) computed directly as extra = Ry(-5deg)*Rx(-5deg) (OrbitControls' own camera
// composition order, checked against a measured drag), model' = extra^-1 * model.
const ORIENTATION = [0.5690063158835369, -0.17270130000163825, 0.036188769670391675, 0.8031789628794647]

/**
 * Particle-cloud rendering of the Industry 4.0 robotic-arm model, from a line-strip GLB export
 * (industry-arm.glb: ~800 THREE.Line meshes grouped under two named top-level nodes, "需要的边界"
 * and "亮色的机械臂", matching the DXF layer split this scene used previously). Exploding the
 * source model's blocks for a clean DXF export caused new problems, so this went back to the GLB
 * pipeline - parseGLBLines.js's chain extraction + sampleLineStrips.js's resampleChains for even
 * point spacing, colored by layer the same way as the DXF version was.
 */
export default function IndustryArmParticles() {
  const gltf = useLoader(GLTFLoader, '/models/industry-arm.glb')

  const { positions, sizes, colors } = useMemo(() => {
    const geo = sampleGLBLines(gltf.scene, { targetExtent: TARGET_EXTENT, spacing: EDGE_SPACING })
    const colors = colorByGroup(geo.groups, { '亮色的机械臂': HIGHLIGHT_COLOR, '需要的边界': ARM_COLOR }, ARM_COLOR)
    return { ...geo, colors }
  }, [gltf])

  return (
    <group quaternion={ORIENTATION}>
      <ParticleMesh positions={positions} sizes={sizes} colors={colors} particleSize={PARTICLE_SIZE} />
    </group>
  )
}
