import { useMemo } from 'react'
import { useLoader } from '@react-three/fiber'
import { FileLoader } from 'three'
import { sampleDXF } from './parseDXF'
import { colorByGroup } from './particleColors'
import ParticleMesh from './ParticleMesh'

// Largest bounding-box axis of the model, after centering, in world units. 40% smaller than the
// other DXF scenes' 3.6, then 20% bigger again, per request.
const TARGET_EXTENT = 3.6 * 0.6 * 1.2
// Target distance between consecutive points along a curve segment (same units as
// TARGET_EXTENT) - this is what makes density even across the model instead of following its
// native, uneven vertex spacing. Same 0.035 smart-city9.dxf used (kept back at that value per
// request - a wider spacing had been tried, to dodge a real point-count constraint: see the one
// below about DNAParticles.jsx). At the current (smaller) TARGET_EXTENT this lands at 3024 points -
// under DNAParticles.jsx's 3697, so ParticleCanvas.jsx's matchClouds (DNA -> Smart City needs DNA,
// listed first, to have at least as many points as the city it turns into) still holds; it wouldn't
// have at TARGET_EXTENT's original, pre-shrink value (4168 points), which is why that wider spacing
// existed in the first place.
const EDGE_SPACING = 0.035
// Tessellation resolution for ARC/CIRCLE/SPLINE entities (points per full 360deg sweep, or per
// the spline's whole parameter domain) - see parseDXF.js.
const CURVE_SEGMENTS = 48
export const CITY_PARTICLE_SIZE = 0.03
const PARTICLE_SIZE = CITY_PARTICLE_SIZE

// smart-city11.dxf's two named layers (same as smart-city10.dxf's): the bright-color road layer and the theme-color buildings layer
// (theme-color buildings).
// Anything on the bright-color road layer gets ROAD_COLOR; everything else (including layer "0"/unnamed) gets
// BUILDING_COLOR. BUILDING_COLOR is Smart City's own accent (it was a blue-teal, '#4a9db3', too close to
// the VLSI-CAD cloud's teal; a plain blue was then too close to Industry 4.0's purple and an orchid didn't fit the
// palette, so it is a deeper, greener ocean blue now - darker and bluer than the VLSI teal, clear of the purple - it also
// colors the brain's top-right anchor, see BrainParticles.jsx); ROAD_COLOR is a warm amber so the street network reads as a clearly distinct layer
// even though it's a small fraction of the total points.
export const SMART_CITY_COLOR = '#2f86b3'
const BUILDING_COLOR = SMART_CITY_COLOR
const ROAD_COLOR = '#e0a94a'
// Matched by eye to the user's Rhino Perspective-viewport reference screenshot for smart-city10.dxf,
// same technique as this file's other models: pitch 25deg, yaw 25deg about (Y then X, i.e.
// THREE.Euler(pitch, yaw, 0, 'YXZ')) - checked by rendering the sampled point cloud through the same
// place()-style perspective projection this scene's shader uses (onto a plain <canvas>, colored by
// layer) and comparing the result to the reference: the roundabout sits flat along the bottom (the
// road layer *is* the ground plane) with the buildings rising from it, matching the reference's
// composition and camera height/angle. Composed with a further ~11.15deg screen-space roll (about the
// view/Z axis, applied after the pitch+yaw above) so the roundabout's disk reads level left-to-right
// instead of tilted - the pitch+yaw alone left local Y's own screen-space direction slightly
// off-vertical (a small sideways lean), which tilts anything flat on the ground plane (the disk) by
// that same amount even though it doesn't visibly flip the buildings; the roll angle was solved for
// numerically (search over roll, keeping the solution where "up" stays pointing up rather than the
// other one 180deg away that flips it down) rather than picked by eye. Further turned 35deg to the
// left per request (30deg, then another 5deg the same way), as a *local*-space spin about the model's
// own vertical axis composed on the right (model' = model * Ry(-35deg) - applied before the
// calibrated pitch/yaw/roll above, like turning the physical model on a turntable rather than moving
// the camera) - two earlier sign guesses (+10deg, then +30deg) both turned out backwards per user
// feedback, so this sign is confirmed by feedback rather than assumed. This leaves the roundabout
// exactly as level as it was (a local spin about Y can't change how "up" itself eventually projects
// to screen, only what's currently facing the camera), so no further roll correction was needed.
export const CITY_ORIENTATION = [0.19482193940602194, -0.06647756366764312, -0.013223001801092357, 0.9784938925094315]
// The center of the one big closed loop on the bright-color road layer (a roundabout) - found by loading
// smart-city10.dxf, walking every bright-color road chain, keeping the closed ones (first vertex ~= last)
// and picking the one with the largest average distance from its own centroid to that centroid
// (radius 34.46 raw units, near-perfectly circular: (max-min radius)/avg radius = 0.031). Converted
// into this model's centered/scaled local-unit space the same way buildCityCloud's own points are
// (subtract sampleDXF's own transform.center, multiply by transform.scale, both taken with
// rejectOutliers matching buildCityCloud below) - this is ParticleCanvas.jsx's rotation pivot for the
// Smart City -> Industry 4.0 turn, in place of that turn's default (the cloud's own bounding-box
// center).
export const CITY_PIVOT = [-0.019938461538462467, -0.4699020494628277, 0]

/** The Smart City particle data, shared by the scene and the page-wide shared canvas. */
export function buildCityCloud(text) {
    // rejectOutliers: smart-city10.dxf carried one stray bright-color road chain ~570 units from the rest of
    // the model (and outside the file's own $EXTMIN/$EXTMAX) - a leftover from the source CAD file,
    // not part of the city itself. Left in, it alone stretched the model's bounding box 6x+ over what
    // the real content needs, so the real content - everything actually meant to be here - got scaled
    // down into a small corner of the display. smart-city11.dxf/smart-city12.dxf/smart-city13.dxf are the same model
    // with that one chain fixed at the source (confirmed: identical $EXTMIN/$EXTMAX, identical
    // bounding box/transform with this flag on, and the roundabout used for CITY_PIVOT below sits at
    // the exact same raw coordinates) - rejectOutliers has nothing left to drop for either, so this is
    // a no-op now, kept on rather than removed in case a future re-export reintroduces something like it.
    // dedupeChains: smart-city11.dxf carried 4 building-layer chains that were exact duplicates of
    // another chain already in the file (same endpoints/length/midpoint) - each one silently doubled
    // the point density right along that one edge, with no visible reason why (found while tracking
    // down why some buildings read as denser than others). smart-city12.dxf/smart-city13.dxf have that fixed at the
    // source too, for all but one remaining duplicate - dedupeChains still catches that last one, so
    // this stays on.
    const geo = sampleDXF(text, { targetExtent: TARGET_EXTENT, spacing: EDGE_SPACING, curveSegments: CURVE_SEGMENTS, rejectOutliers: true, dedupeChains: true })
    const colors = colorByGroup(geo.groups, { 'Bright-road': ROAD_COLOR, 'Theme-color-buildings': BUILDING_COLOR }, BUILDING_COLOR) // layers: bright-color road / theme-color buildings
    return { ...geo, colors }
}

/**
 * Particle-cloud rendering of the Smart City model, from a genuine-curve DXF source rather than
 * the GLB this scene started with: Rhino's glTF exporter was found to tessellate ARC/CIRCLE/SPLINE
 * curves down to as few as 2-15 points regardless of their real shape (confirmed by inspecting the
 * exported file directly), so round/curved buildings came out unrecognizable. smart-city13.dxf is a
 * "Standard" DXF export instead - real ARC/CIRCLE/SPLINE/POLYLINE/LINE entities - and
 * parseDXF.js evaluates those curves itself at CURVE_SEGMENTS resolution, then resamples every
 * curve at even spacing same as the line-art GLB path (sampleLineStrips.js's resampleChains,
 * shared by both). Road points and building points are colored differently by DXF layer so the
 * street network reads as a distinct layer from the buildings themselves.
 */
export default function SmartCityParticles() {
  const text = useLoader(FileLoader, '/models/smart-city13.dxf', (loader) => loader.setResponseType('text'))

  const { positions, sizes, colors } = useMemo(() => buildCityCloud(text), [text])

  return (
    <group quaternion={CITY_ORIENTATION}>
      <ParticleMesh positions={positions} sizes={sizes} colors={colors} particleSize={PARTICLE_SIZE} />
    </group>
  )
}
