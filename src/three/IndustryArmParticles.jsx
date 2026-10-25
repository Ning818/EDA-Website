import { useMemo } from 'react'
import { useLoader } from '@react-three/fiber'
import { GLTFLoader } from 'three-stdlib'
import { sampleGLBLines } from './parseGLBLines'
import { colorByGroup } from './particleColors'
import ParticleMesh from './ParticleMesh'

// Largest bounding-box axis of the model, after centering, in world units. Two successive 5%
// shrinks from the other DXF-sourced scenes' 3.6 (3.6 -> 3.42 -> 3.249 -> 2.924, the last a further 10%), per request -
// resampleChains centers the model on its own bounding-box center first, so this scales it down
// toward that center rather than shifting it.
const TARGET_EXTENT = 2.924
// Target distance between consecutive points along a line segment (same units as TARGET_EXTENT).
// Most of this GLB's ~800 line meshes are already just 2-point segments (Rhino exported every
// curve pre-split); resampleChains (sampleLineStrips.js) represents each one shorter than this
// spacing with a single well-centered point, so density stays even instead of depending on how
// the source app happened to split its curves. Tuned to land in the same point-count range as the
// other scenes (4337 here, vs. Smart City's 3678 and DNA's ~4900).
const EDGE_SPACING = 0.035
export const ARM_PARTICLE_SIZE = 0.03
const PARTICLE_SIZE = ARM_PARTICLE_SIZE
// Industry 4.0's theme accent from particle_brain_demo_logo_24.html's anchor set (lab3), for the
// plain "needed boundary" layer. The "bright-color robotic arm" layer
// reuses Smart City's ROAD_COLOR, same as DNA's "bright-color DNA" layer does, so a highlighted arm section
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
// composition order, checked against a measured drag), model' = extra^-1 * model. For machinehandline4
// the disc had to flatten out to match the new reference screenshot: a further 16deg rotation about X
// (found by rendering candidates offline and comparing to the reference).
export const ARM_ORIENTATION = [0.6752496924215704, -0.17605708611673884, 0.01180120759056973, 0.7161721069771305]

/** The robotic-arm particle data, shared by the scene and the page-wide shared canvas. */
export function buildArmCloud(gltf) {
    const geo = sampleGLBLines(gltf.scene, { targetExtent: TARGET_EXTENT, spacing: EDGE_SPACING })
    const colors = colorByGroup(geo.groups, { 'Bright-robotic-arm': HIGHLIGHT_COLOR, 'Needed-boundary': ARM_COLOR }, ARM_COLOR) // layers: bright-color robotic arm / needed boundary
    return { ...geo, colors }
}

/**
 * Particle-cloud rendering of the Industry 4.0 robotic-arm model, from a line-strip GLB export
 * (industry-arm.glb: ~800 THREE.Line meshes grouped under two named top-level nodes, "needed boundary"
 * and "bright-color robotic arm", matching the DXF layer split this scene used previously). Exploding the
 * source model's blocks for a clean DXF export caused new problems, so this went back to the GLB
 * pipeline - parseGLBLines.js's chain extraction + sampleLineStrips.js's resampleChains for even
 * point spacing, colored by layer the same way as the DXF version was.
 */
export default function IndustryArmParticles() {
  const gltf = useLoader(GLTFLoader, '/models/industry-arm.glb')

  const { positions, sizes, colors } = useMemo(() => buildArmCloud(gltf), [gltf])

  return (
    <group quaternion={ARM_ORIENTATION}>
      <ParticleMesh positions={positions} sizes={sizes} colors={colors} particleSize={PARTICLE_SIZE} />
    </group>
  )
}
