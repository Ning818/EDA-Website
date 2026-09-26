import { useMemo } from 'react'
import { useLoader } from '@react-three/fiber'
import { FileLoader } from 'three'
import { sampleDXF } from './parseDXF'
import { colorByGroup } from './particleColors'
import ParticleMesh from './ParticleMesh'

// Largest bounding-box axis of the model, after centering, in world units.
const TARGET_EXTENT = 3.24 // 10% smaller than the other DXF scenes' 3.6
// Target distance between consecutive points along a curve segment (same units as
// TARGET_EXTENT) - see parseDXF.js / sampleLineStrips.js. Picked to land in the same point-count
// range as the other scenes (~4900 here, vs. Industry Arm's 3720 and Brain's 4996).
const EDGE_SPACING = 0.02
// Tessellation resolution for SPLINE entities (points per the spline's whole parameter domain) -
// see parseDXF.js. Much higher than every other scene's (48): each backbone spline here has
// 52-70 control points (a full multi-turn helix, not a single gentle arc like Smart City's), so
// 48 evaluated points across the whole curve was badly under-tessellating it - visibly faceted,
// "looks like a polyline" instead of a smooth helix. Raising this is effectively free: the
// resampling step downstream (sampleLineStrips.js's resampleChains) walks the evaluated curve at
// even arc-length spacing regardless of how many raw points it started from, so the final point
// count barely moves (4942 at 48 segments vs. 4978 at 1000) - only the curve's own shape fidelity
// improves.
const CURVE_SEGMENTS = 1000
const PARTICLE_SIZE = 0.028
// Bioinformatics' theme accent from particle_brain_demo_logo_24.html's anchor set - the one
// remaining anchor color not already claimed by Smart City ('#4a9db3') or Industry 4.0
// ('#6a6fc4'). Used for the plain "DNA" layer; the "亮色DNA" (bright-color DNA) layer reuses
// Smart City's ROAD_COLOR so a highlighted strand reads as a distinct accent the same way Smart
// City's road network does.
const DNA_COLOR = '#4ab47a'
const HIGHLIGHT_COLOR = '#e0a94a'

/**
 * Particle-cloud rendering of the DNA double-helix model, from a genuine-curve DXF source
 * (dna6.dxf: 14 SPLINE entities for the backbone strands + 197 LINE entities for the base-pair
 * rungs, split across two layers - "DNA" (171 entities) and "亮色DNA"/bright-color DNA (40
 * entities, one strand singled out) - rather than the dna.fbx mesh this scene started with. Same
 * DXF pipeline as Smart City's (parseDXF.js's curve evaluation + sampleLineStrips.js's
 * resampleChains for even point spacing), reused as-is since it's already format-agnostic, colored
 * by layer the same way Smart City colors road vs. building points. Unlike the FBX version, these
 * points carry no real surface normals (it's line art, not a mesh), so there's no front/back-
 * facing fade here - same as Smart City/Industry Arm.
 */
export default function DNAParticles() {
  const text = useLoader(FileLoader, '/models/dna6.dxf', (loader) => loader.setResponseType('text'))

  const { positions, sizes, colors } = useMemo(() => {
    const geo = sampleDXF(text, { targetExtent: TARGET_EXTENT, spacing: EDGE_SPACING, curveSegments: CURVE_SEGMENTS })
    const colors = colorByGroup(geo.groups, { '亮色DNA': HIGHLIGHT_COLOR, DNA: DNA_COLOR }, DNA_COLOR)
    return { ...geo, colors }
  }, [text])

  return <ParticleMesh positions={positions} sizes={sizes} colors={colors} particleSize={PARTICLE_SIZE} />
}
