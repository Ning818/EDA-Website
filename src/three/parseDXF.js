// Parses an ASCII DXF file's ENTITIES into flat point chains, evaluating real curve geometry
// (ARC/CIRCLE/SPLINE) rather than relying on the exporter to have already tessellated them.
// Rhino's GLB exporter was found to tessellate curves down to as few as 2-15 points regardless of
// the source curve's real shape; a DXF "Standard" export (as opposed to "Polyline") keeps
// LINE/POLYLINE/ARC/CIRCLE/SPLINE as their real entity types instead, so we do the tessellation
// ourselves at whatever resolution we want.
//
// Pure JS, no dependencies - runs the same in the browser (fetched as text) or Node (this file's
// own dev-time checks).

import { resampleChains } from './sampleLineStrips'

/** Parses raw DXF text into a flat [{code, value}] array (odd/even line pairs). */
function parseDXFPairs(text) {
  const rawLines = text.split(/\r\n|\r|\n/)
  const pairs = []
  for (let i = 0; i + 1 < rawLines.length; i += 2) {
    const code = parseInt(rawLines[i].trim(), 10)
    pairs.push({ code, value: rawLines[i + 1].trim() })
  }
  return pairs
}

/**
 * Walks the pairs and extracts entities from every ENTITIES/BLOCK section in the file (DXF
 * doesn't nest ENTITIES inside anything else meaningful for our purposes, so we don't bother
 * scoping to a single SECTION - entity records are self-delimiting via their own 0-code markers).
 * @returns {object[]} normalized entities: { type, layer, ...type-specific fields (raw units, not centered/scaled) }
 */
function parseDXFEntities(pairs) {
  const entities = []
  let i = 0
  while (i < pairs.length) {
    const p = pairs[i]
    if (p.code !== 0) { i++; continue }
    const type = p.value

    if (type === 'LINE') {
      const e = { type: 'LINE', layer: null, start: [0, 0, 0], end: [0, 0, 0] }
      i++
      while (i < pairs.length && pairs[i].code !== 0) {
        const c = pairs[i]
        if (c.code === 8) e.layer = c.value
        else if (c.code === 10) e.start[0] = parseFloat(c.value)
        else if (c.code === 20) e.start[1] = parseFloat(c.value)
        else if (c.code === 30) e.start[2] = parseFloat(c.value)
        else if (c.code === 11) e.end[0] = parseFloat(c.value)
        else if (c.code === 21) e.end[1] = parseFloat(c.value)
        else if (c.code === 31) e.end[2] = parseFloat(c.value)
        i++
      }
      entities.push(e)
    } else if (type === 'ARC' || type === 'CIRCLE') {
      const e = { type, layer: null, center: [0, 0, 0], radius: 0, normal: [0, 0, 1], startAngle: 0, endAngle: 360 }
      i++
      while (i < pairs.length && pairs[i].code !== 0) {
        const c = pairs[i]
        if (c.code === 8) e.layer = c.value
        else if (c.code === 10) e.center[0] = parseFloat(c.value)
        else if (c.code === 20) e.center[1] = parseFloat(c.value)
        else if (c.code === 30) e.center[2] = parseFloat(c.value)
        else if (c.code === 40) e.radius = parseFloat(c.value)
        else if (c.code === 50) e.startAngle = parseFloat(c.value)
        else if (c.code === 51) e.endAngle = parseFloat(c.value)
        else if (c.code === 210) e.normal[0] = parseFloat(c.value)
        else if (c.code === 220) e.normal[1] = parseFloat(c.value)
        else if (c.code === 230) e.normal[2] = parseFloat(c.value)
        i++
      }
      entities.push(e)
    } else if (type === 'POLYLINE') {
      const e = { type: 'POLYLINE', layer: null, closed: false, points: [] }
      let flags = 0
      i++
      while (i < pairs.length && pairs[i].code !== 0) {
        const c = pairs[i]
        if (c.code === 8) e.layer = c.value
        else if (c.code === 70) flags = parseInt(c.value, 10)
        i++
      }
      e.closed = (flags & 1) !== 0
      // VERTEX entities (and any nested sub-records) follow, up to SEQEND.
      while (i < pairs.length && !(pairs[i].code === 0 && pairs[i].value === 'SEQEND')) {
        if (pairs[i].code === 0 && pairs[i].value === 'VERTEX') {
          const v = [0, 0, 0]
          i++
          while (i < pairs.length && pairs[i].code !== 0) {
            const c = pairs[i]
            if (c.code === 10) v[0] = parseFloat(c.value)
            else if (c.code === 20) v[1] = parseFloat(c.value)
            else if (c.code === 30) v[2] = parseFloat(c.value)
            i++
          }
          e.points.push(v)
        } else {
          i++
        }
      }
      if (i < pairs.length && pairs[i].code === 0 && pairs[i].value === 'SEQEND') i++
      entities.push(e)
    } else if (type === 'SPLINE') {
      const e = { type: 'SPLINE', layer: null, degree: 3, knots: [], controlPoints: [], weights: [] }
      i++
      while (i < pairs.length && pairs[i].code !== 0) {
        const c = pairs[i]
        if (c.code === 8) e.layer = c.value
        else if (c.code === 71) e.degree = parseInt(c.value, 10)
        else if (c.code === 40) e.knots.push(parseFloat(c.value))
        else if (c.code === 41) e.weights.push(parseFloat(c.value))
        else if (c.code === 10) e.controlPoints.push([parseFloat(c.value), 0, 0])
        else if (c.code === 20) e.controlPoints[e.controlPoints.length - 1][1] = parseFloat(c.value)
        else if (c.code === 30) e.controlPoints[e.controlPoints.length - 1][2] = parseFloat(c.value)
        i++
      }
      entities.push(e)
    } else {
      i++
    }
  }
  return entities
}

/** DXF's "Arbitrary Axis Algorithm" - derives a consistent local (X,Y) basis for an entity's
 * plane from its extrusion/normal direction, so ARC/CIRCLE angles (always defined in that local
 * plane) can be turned into world-space points. See the Autodesk DXF reference for this exact
 * derivation - it's a fixed, specified algorithm, not an arbitrary choice of our own. */
function arbitraryAxis(normal) {
  const [nx, ny, nz] = normal
  let ax
  if (Math.abs(nx) < 1 / 64 && Math.abs(ny) < 1 / 64) {
    // World Y (0,1,0) x N
    ax = [1 * nz - 0 * ny, 0 * nx - 0 * nz, 0 * ny - 1 * nx]
  } else {
    // World Z (0,0,1) x N
    ax = [0 * nz - 1 * ny, 1 * nx - 0 * nz, 0 * ny - 0 * nx]
  }
  const axLen = Math.hypot(ax[0], ax[1], ax[2]) || 1
  const xAxis = [ax[0] / axLen, ax[1] / axLen, ax[2] / axLen]
  // Y = N x X
  const ay = [ny * xAxis[2] - nz * xAxis[1], nz * xAxis[0] - nx * xAxis[2], nx * xAxis[1] - ny * xAxis[0]]
  const ayLen = Math.hypot(ay[0], ay[1], ay[2]) || 1
  const yAxis = [ay[0] / ayLen, ay[1] / ayLen, ay[2] / ayLen]
  return { xAxis, yAxis }
}

/** Non-rational B-spline evaluation via de Boor's algorithm (no weights => not a full NURBS
 * division needed - this file's SPLINE entities carry no group-41 weights, confirmed by
 * inspection, so every control point is implicitly weight 1). */
function deBoor(u, degree, knots, controlPoints) {
  const n = controlPoints.length - 1
  let k = degree
  while (k < n && !(u >= knots[k] && u < knots[k + 1])) k++
  if (u >= knots[n + 1]) k = n // clamp at the very end of the domain
  const d = []
  for (let j = 0; j <= degree; j++) d.push(controlPoints[k - degree + j].slice())
  for (let r = 1; r <= degree; r++) {
    for (let j = degree; j >= r; j--) {
      const denom = knots[j + k - r + 1] - knots[j + k - degree]
      const alpha = denom === 0 ? 0 : (u - knots[j + k - degree]) / denom
      d[j] = [
        (1 - alpha) * d[j - 1][0] + alpha * d[j][0],
        (1 - alpha) * d[j - 1][1] + alpha * d[j][1],
        (1 - alpha) * d[j - 1][2] + alpha * d[j][2],
      ]
    }
  }
  return d[degree]
}

/**
 * Converts a parsed DXF entity into a flat [x0,y0,z0, x1,y1,z1, ...] point chain, evaluating real
 * curve geometry at `segments` steps for ARC/CIRCLE/SPLINE (LINE and POLYLINE need no evaluation -
 * they're already exact).
 */
function entityToChain(entity, segments = 48) {
  if (entity.type === 'LINE') {
    return [...entity.start, ...entity.end]
  }
  if (entity.type === 'POLYLINE') {
    const pts = entity.closed ? [...entity.points, entity.points[0]] : entity.points
    return pts.flat()
  }
  if (entity.type === 'ARC' || entity.type === 'CIRCLE') {
    const { xAxis, yAxis } = arbitraryAxis(entity.normal)
    // DXF group codes 10/20/30 for ARC/CIRCLE's center are in the entity's own OCS (the local
    // 2D plane defined by its extrusion/normal via the Arbitrary Axis Algorithm), not world
    // coordinates directly - only entities with the default normal (0,0,1) have OCS == WCS. Found
    // by comparing an ARC's raw center against the rest of the model's bounding box: for a
    // non-default normal, the raw center landed far outside the model (e.g. world-scale units off
    // on two axes) while transforming it through the same xAxis/yAxis/normal basis used for the
    // curve's own points put it right back inside.
    const [ex, ey, ez] = entity.center
    const cx = ex * xAxis[0] + ey * yAxis[0] + ez * entity.normal[0]
    const cy = ex * xAxis[1] + ey * yAxis[1] + ez * entity.normal[1]
    const cz = ex * xAxis[2] + ey * yAxis[2] + ez * entity.normal[2]
    const r = entity.radius
    let startDeg = entity.type === 'CIRCLE' ? 0 : entity.startAngle
    let endDeg = entity.type === 'CIRCLE' ? 360 : entity.endAngle
    if (endDeg <= startDeg) endDeg += 360 // arcs can wrap through 0deg
    const pts = []
    const n = entity.type === 'CIRCLE' ? segments : Math.max(4, Math.round(segments * (endDeg - startDeg) / 360))
    for (let s = 0; s <= n; s++) {
      const deg = startDeg + ((endDeg - startDeg) * s) / n
      const rad = (deg * Math.PI) / 180
      const cos = Math.cos(rad) * r, sin = Math.sin(rad) * r
      pts.push(
        cx + cos * xAxis[0] + sin * yAxis[0],
        cy + cos * xAxis[1] + sin * yAxis[1],
        cz + cos * xAxis[2] + sin * yAxis[2],
      )
    }
    return pts
  }
  if (entity.type === 'SPLINE') {
    const { degree, knots, controlPoints } = entity
    if (controlPoints.length <= degree) return controlPoints.flat() // degenerate, just pass through
    const uMin = knots[degree], uMax = knots[knots.length - 1 - degree]
    const pts = []
    for (let s = 0; s <= segments; s++) {
      const u = uMin + ((uMax - uMin) * s) / segments
      pts.push(...deBoor(Math.min(u, uMax - 1e-9), degree, knots, controlPoints))
    }
    return pts
  }
  return []
}

/**
 * Parses a DXF file's text into per-entity point chains ready for the same centering/scaling/
 * resampling pipeline sampleLineStrips.js uses for GLB line-art (see resampleChains there).
 * @param {string} text - raw .dxf file contents.
 * @param {object} [opts]
 * @param {number} [opts.curveSegments] - tessellation resolution for ARC/CIRCLE/SPLINE entities.
 * @returns {{ chains: number[][], chainGroups: (string|null)[] }}
 */
export function parseDXFToChains(text, opts = {}) {
  const { curveSegments = 48 } = opts
  const pairs = parseDXFPairs(text)
  const entities = parseDXFEntities(pairs)
  const chains = []
  const chainGroups = []
  for (const entity of entities) {
    const chain = entityToChain(entity, curveSegments)
    if (chain.length >= 6) { // at least 2 points
      chains.push(chain)
      chainGroups.push(entity.layer)
    }
  }
  return { chains, chainGroups }
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  const n = sorted.length
  return n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2
}

function chainCentroid(chain) {
  const n = chain.length / 3
  let sx = 0, sy = 0, sz = 0
  for (let i = 0; i < n; i++) { sx += chain[i * 3]; sy += chain[i * 3 + 1]; sz += chain[i * 3 + 2] }
  return [sx / n, sy / n, sz / n]
}

/**
 * Drops chains whose centroid sits far outside the model's main cluster - opt-in (see
 * `rejectOutliers` on sampleDXF/parseDXFToChains), not run automatically, because this heuristic
 * has no reliable way to tell "genuinely disconnected stray geometry" (e.g. a leftover duplicate
 * from a past design iteration) apart from "a real design detail that's just far from the rest of
 * an elongated model" (e.g. a cable-guard ring near the far end of a robotic arm) - it previously
 * ran unconditionally and wrongly dropped legitimate closed curves for exactly that second reason.
 * Call it only for a specific file where the excluded content has been manually confirmed as
 * genuinely unwanted (see IndustryArmParticles.jsx's own comment for that confirmation).
 *
 * Finds the split by comparing each chain's centroid to the whole set's median centroid (median
 * rather than mean so the far chains themselves can't drag the reference point toward them),
 * sorting those distances, and locating the largest relative (ratio) jump anywhere in that sorted
 * list. Chains beyond that gap are dropped; if no jump exceeds 3x, nothing is rejected.
 */
export function rejectOutlierChains(chains, chainGroups) {
  if (chains.length < 10) return { chains, chainGroups } // too few to meaningfully judge a "cluster"
  const centroids = chains.map(chainCentroid)
  const mx = median(centroids.map((c) => c[0]))
  const my = median(centroids.map((c) => c[1]))
  const mz = median(centroids.map((c) => c[2]))
  const dists = centroids.map((c) => Math.hypot(c[0] - mx, c[1] - my, c[2] - mz))
  const sortedDists = [...dists].sort((a, b) => a - b)
  const n = sortedDists.length

  let cutoff = Infinity
  let bestRatio = 1
  const minCoreSize = Math.max(5, Math.floor(n * 0.1)) // ignore noise among the closest handful
  for (let i = minCoreSize; i < n; i++) {
    if (sortedDists[i - 1] <= 0) continue
    const ratio = sortedDists[i] / sortedDists[i - 1]
    if (ratio > bestRatio) { bestRatio = ratio; cutoff = (sortedDists[i - 1] + sortedDists[i]) / 2 }
  }
  if (bestRatio < 3) return { chains, chainGroups }
  const keptChains = [], keptGroups = []
  for (let i = 0; i < chains.length; i++) {
    if (dists[i] <= cutoff) { keptChains.push(chains[i]); keptGroups.push(chainGroups[i]) }
  }
  return { chains: keptChains, chainGroups: keptGroups }
}

/**
 * Drops chains that are geometric duplicates of an earlier one - the same curve traced twice (e.g. a
 * copy-paste slip, or two layers' worth of the same detail line) in the source CAD file. Unlike
 * resampleChains' own dedup pass (which only merges individual sampled *points* that land on top of
 * each other, e.g. two chains sharing an endpoint), this runs on the raw chains *before* sampling:
 * two duplicate chains each get independently sampled at even spacing along their own length, so
 * unless the two copies' sample phases happen to coincide exactly, their points *don't* collide and
 * the point-level dedup can't catch them - the curve just silently gets roughly double the point
 * density of every other curve of the same length, which is what actually flagged this (some
 * buildings reading as noticeably denser than others with no visible reason).
 *
 * A chain is a duplicate of an earlier one when they have the same length and the same endpoints
 * (in either direction) and midpoint, each within `tol` - cheap and exact for the straight LINE
 * entities this has been found on; a duplicated curved entity would need a closer-than-endpoints
 * check, not implemented here since it hasn't come up.
 */
export function dedupeChains(chains, chainGroups, tol = 0.05) {
  const sig = (c) => {
    const n = c.length / 3
    const mi = Math.floor(n / 2)
    let len = 0
    for (let k = 0; k + 1 < n; k++) len += Math.hypot(c[(k + 1) * 3] - c[k * 3], c[(k + 1) * 3 + 1] - c[k * 3 + 1], c[(k + 1) * 3 + 2] - c[k * 3 + 2])
    return { p0: [c[0], c[1], c[2]], p1: [c[(n - 1) * 3], c[(n - 1) * 3 + 1], c[(n - 1) * 3 + 2]], mid: [c[mi * 3], c[mi * 3 + 1], c[mi * 3 + 2]], len }
  }
  const near = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < tol
  const sigs = chains.map(sig)
  const keptChains = [], keptGroups = [], keptSigs = []
  let dropped = 0
  for (let i = 0; i < chains.length; i++) {
    const s = sigs[i]
    const isDup = keptSigs.some((k) => Math.abs(k.len - s.len) < tol && near(k.mid, s.mid) &&
      ((near(k.p0, s.p0) && near(k.p1, s.p1)) || (near(k.p0, s.p1) && near(k.p1, s.p0))))
    if (isDup) { dropped++; continue }
    keptChains.push(chains[i]); keptGroups.push(chainGroups[i]); keptSigs.push(s)
  }
  return { chains: keptChains, chainGroups: keptGroups, dropped }
}

/**
 * One-call convenience: parses a DXF file's text straight into a resampled particle cloud - the
 * DXF counterpart to sampleLineStrips.js's GLB path, sharing its resampleChains() core.
 * @param {string} text - raw .dxf file contents.
 * @param {object} opts
 * @param {number} opts.targetExtent - see resampleChains in sampleLineStrips.js.
 * @param {number} opts.spacing - see resampleChains in sampleLineStrips.js.
 * @param {number} [opts.curveSegments] - see parseDXFToChains.
 * @param {boolean} [opts.rejectOutliers] - see rejectOutlierChains. Off by default.
 * @param {boolean} [opts.dedupeChains] - see dedupeChains above. Off by default.
 * @returns {{ positions: Float32Array, sizes: Float32Array, groups: (string|null)[] }}
 */
export function sampleDXF(text, opts) {
  const { targetExtent, spacing, curveSegments, rejectOutliers = false, dedupeChains: dedupe = false } = opts
  let { chains, chainGroups } = parseDXFToChains(text, { curveSegments })
  if (rejectOutliers) ({ chains, chainGroups } = rejectOutlierChains(chains, chainGroups))
  if (dedupe) ({ chains, chainGroups } = dedupeChains(chains, chainGroups))
  return resampleChains(chains, chainGroups, { targetExtent, spacing })
}
