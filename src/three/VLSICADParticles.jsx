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
// Density eases up toward the chip the hand reaches for: spacing goes from MESH_SPACING (far, at the
// wrist) down to this at the fingertips.
const MESH_TIP_SPACING = 0.03
export const VLSI_PARTICLE_SIZE = 0.03
const PARTICLE_SIZE = VLSI_PARTICLE_SIZE
// Hand points on its far side (surface facing away from the camera - the part occluded by the
// hand itself) blend this far toward white, so the near side reads clearly in front of it.
const HAND_BACK_WHITE_FADE = 0.6
// VLSI-CAD's theme accent - the remaining anchor color from particle_brain_demo_logo_24.html's
// set not already used by another scene. the "bright-color chip" layer reuses the shared highlight.
const CHIP_COLOR = '#3fb0b8'
const HIGHLIGHT_COLOR = '#e0a94a'
// Matched to the user's latest (chips8) Rhino perspective screenshot: the GLB's +z is the board's
// underside (hand sits on the -z side), so flip 180deg about X first, then yaw 145deg about the board
// normal and tilt 65deg from straight-down. Found by rendering candidates offline and comparing to
// the reference (board edge slopes, hand pose).
export const VLSI_ORIENTATION = [0.2536126990082286, -0.8043567179878038, 0.5124317441107494, 0.1615691083012645]

/** The VLSI-CAD particle data, shared by the scene below and the scroll-driven morph overlay. */
export function buildVLSICloud(gltf) {
  const geo = sampleGLBLinesAndMesh(gltf.scene, { targetExtent: TARGET_EXTENT, spacing: EDGE_SPACING, meshSpacing: MESH_SPACING, meshTipSpacing: MESH_TIP_SPACING, tipGroup: '亮色的芯片' }) // tip group: the bright-color chip layer
  const colors = colorByGroup(geo.groups, { '亮色的芯片': HIGHLIGHT_COLOR, '亮色的手': HIGHLIGHT_COLOR, '线框': CHIP_COLOR }, CHIP_COLOR) // layers: bright-color chip / bright-color hand / wireframe
  return { ...geo, colors }
}

/**
 * Particle-cloud rendering of the VLSI-CAD scene (chips.glb): a line-art motherboard/chips
 * wireframe (the "wireframe" and "bright-color chip" layers) plus a triangulated hand mesh (the "bright-color hand" layer) reaching
 * toward it. Lines are resampled at even arc-length spacing; the hand becomes an evenly spread
 * surface point cloud (parseGLBLines.js's sampleGLBLinesAndMesh), both sharing one transform.
 */
export default function VLSICADParticles() {
  const gltf = useLoader(GLTFLoader, '/models/chips.glb')

  const { positions, sizes, colors, normals, normalMask } = useMemo(() => buildVLSICloud(gltf), [gltf])

  return (
    <group quaternion={VLSI_ORIENTATION}>
      <ParticleMesh
        positions={positions}
        sizes={sizes}
        colors={colors}
        normals={normals}
        normalMask={normalMask}
        particleSize={PARTICLE_SIZE}
        backWhiteFade={HAND_BACK_WHITE_FADE}
        depthWrite
      />
    </group>
  )
}
