import { extractMeshTopology, centerAndScale } from './extractMeshTopology'

/**
 * Resamples a loaded model's triangle-edge wireframe at even spacing, instead of using the
 * mesh's own vertices directly - a dense area of the mesh (lots of small triangles) and a sparse
 * area (a few big ones) end up with the same particle density per unit length, rather than the
 * uneven density you'd get from just plotting native vertices. Points only, no line segments -
 * used for the four Home page theme backgrounds (as opposed to extractMeshGeometry.js, which the
 * brain uses to render its own vertices+edges directly as a wireframe).
 *
 * @param {THREE.Object3D} object - loaded model scene graph.
 * @param {object} opts
 * @param {number} opts.targetExtent - the model is centered and uniformly scaled so its largest
 *   bounding-box axis equals this many world units.
 * @param {number} opts.spacing - target distance between consecutive points along an edge, in
 *   the same (post-scale) world units as targetExtent.
 * @returns {{ positions: Float32Array, sizes: Float32Array }}
 */
export function sampleEdgePoints(object, opts) {
  const { targetExtent, spacing } = opts
  const { rawPositions, edgePairs } = extractMeshTopology(object)
  const positions = centerAndScale(rawPositions, targetExtent)
  const vertexCount = positions.length / 3

  // Every unique vertex once, plus evenly-spaced interior points along every edge (excluding
  // both endpoints, since those are already covered by the vertex pass above) - this way a
  // vertex shared by many edges is never emitted more than once.
  const points = []
  for (let i = 0; i < vertexCount; i++) {
    points.push(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2])
  }
  for (let e = 0; e < edgePairs.length; e += 2) {
    const ai = edgePairs[e] * 3, bi = edgePairs[e + 1] * 3
    const ax = positions[ai], ay = positions[ai + 1], az = positions[ai + 2]
    const bx = positions[bi], by = positions[bi + 1], bz = positions[bi + 2]
    const dx = bx - ax, dy = by - ay, dz = bz - az
    const length = Math.sqrt(dx * dx + dy * dy + dz * dz)
    const steps = Math.round(length / spacing)
    for (let s = 1; s < steps; s++) {
      const t = s / steps
      points.push(ax + dx * t, ay + dy * t, az + dz * t)
    }
  }

  const finalPositions = new Float32Array(points)
  const finalCount = finalPositions.length / 3

  const sizes = new Float32Array(finalCount)
  let seed = 20260729
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
  for (let i = 0; i < finalCount; i++) sizes[i] = 0.82 + rnd() * 0.36

  return { positions: finalPositions, sizes }
}
