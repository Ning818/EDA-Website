import { useMemo } from 'react'
import { useLoader } from '@react-three/fiber'
import { FileLoader } from 'three'
import { sampleDXF } from './parseDXF'
import { colorByGroup } from './particleColors'
import ParticleMesh from './ParticleMesh'

// Largest bounding-box axis of the model, after centering, in world units.
const TARGET_EXTENT = 3.6
// Target distance between consecutive points along a curve segment (same units as
// TARGET_EXTENT) - this is what makes density even across the model instead of following its
// native, uneven vertex spacing. 0.035 rather than Industry Arm's 0.05: this model's overall curve
// length is shorter relative to its own TARGET_EXTENT-normalized size, so the same 0.05 spacing
// produced a visibly sparser cloud (2644 points vs. Industry Arm's 3720) - tuned down until the
// point count matched Industry Arm's (3678 at this value) instead of matching the spacing constant
// itself, since it's the resulting density that should look consistent across scenes.
const EDGE_SPACING = 0.035
// Tessellation resolution for ARC/CIRCLE/SPLINE entities (points per full 360deg sweep, or per
// the spline's whole parameter domain) - see parseDXF.js.
const CURVE_SEGMENTS = 48
const PARTICLE_SIZE = 0.03

// smart-city9.dxf carries the same two named layers the earlier GLB attempt did: "road" and
// "主题色建筑" (theme-color buildings). Anything on "road" gets ROAD_COLOR; everything else
// (including layer "0"/unnamed) gets BUILDING_COLOR. BUILDING_COLOR is Smart City's own accent
// from particle_brain_demo_logo_24.html's anchor set; ROAD_COLOR is a warm amber deliberately far
// from it on the color wheel (a cool teal vs. a warm gold) so the street network reads as a
// clearly distinct layer even though it's a small fraction of the total points.
const BUILDING_COLOR = '#4a9db3'
const ROAD_COLOR = '#e0a94a'
// Matched by eye to the user's Rhino Perspective-viewport reference screenshot, same technique as
// Industry Arm's: computed as the inverse of a candidate camera pitch/yaw via THREE.Quaternion,
// rendered, and compared against the reference, iterating on the two angles (pitch 38deg, yaw
// 33deg). This DXF's own coordinate convention already has Y as up (confirmed by rendering with an
// identity orientation first and seeing buildings stand upright), unlike the Z-up assumption that
// held for the earlier GLB export - no separate up-axis correction is needed here. Composed with two
// further camera-azimuth adjustments on top of that reference angle (rotate the view to the right),
// each computed via THREE.Quaternion as camera' = Ry(-deg) * camera, model' = camera'^-1: +15deg,
// then +10deg more.
const ORIENTATION = [0.3247750867958973, -0.06595604169337653, -0.022710486418313972, 0.9432153398707543]

/**
 * Particle-cloud rendering of the Smart City model, from a genuine-curve DXF source rather than
 * the GLB this scene started with: Rhino's glTF exporter was found to tessellate ARC/CIRCLE/SPLINE
 * curves down to as few as 2-15 points regardless of their real shape (confirmed by inspecting the
 * exported file directly), so round/curved buildings came out unrecognizable. smart-city9.dxf is a
 * "Standard" DXF export instead - real ARC/CIRCLE/SPLINE/POLYLINE/LINE entities - and
 * parseDXF.js evaluates those curves itself at CURVE_SEGMENTS resolution, then resamples every
 * curve at even spacing same as the line-art GLB path (sampleLineStrips.js's resampleChains,
 * shared by both). Road points and building points are colored differently by DXF layer so the
 * street network reads as a distinct layer from the buildings themselves.
 */
export default function SmartCityParticles() {
  const text = useLoader(FileLoader, '/models/smart-city9.dxf', (loader) => loader.setResponseType('text'))

  const { positions, sizes, colors } = useMemo(() => {
    const geo = sampleDXF(text, { targetExtent: TARGET_EXTENT, spacing: EDGE_SPACING, curveSegments: CURVE_SEGMENTS })
    const colors = colorByGroup(geo.groups, { road: ROAD_COLOR, '主题色建筑': BUILDING_COLOR }, BUILDING_COLOR)
    return { ...geo, colors }
  }, [text])

  return (
    <group quaternion={ORIENTATION}>
      <ParticleMesh positions={positions} sizes={sizes} colors={colors} particleSize={PARTICLE_SIZE} />
    </group>
  )
}
