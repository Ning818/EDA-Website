import { extractMeshTopology, centerAndScale } from './extractMeshTopology'

/**
 * Uses a loaded model's own triangle mesh directly as a particle cloud: every unique vertex
 * becomes a point, every unique triangle edge becomes a connecting line (when includeEdges).
 * Used by the brain (BrainParticles.jsx) - for the four theme backgrounds, see
 * sampleEdgePoints.js instead, which resamples edges at even spacing rather than just using
 * the mesh's own (unevenly distributed) vertices.
 *
 * @param {THREE.Object3D} object - loaded model scene graph.
 * @param {object} opts
 * @param {number} opts.targetExtent - the model is centered and uniformly scaled so its largest
 *   bounding-box axis equals this many world units.
 * @param {boolean} [opts.includeEdges=true] - set false to skip building the edge list entirely.
 * @returns {{ positions: Float32Array, sizes: Float32Array, edgePositions: Float32Array }}
 */
export function extractMeshGeometry(object, opts) {
  const { targetExtent, includeEdges = true } = opts
  const { rawPositions, edgePairs } = extractMeshTopology(object)
  const positions = centerAndScale(rawPositions, targetExtent)
  const vertexCount = positions.length / 3

  // Soft per-particle size variance (deterministic, matches the reference demo).
  const sizes = new Float32Array(vertexCount)
  let seed = 20260729
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
  for (let i = 0; i < vertexCount; i++) sizes[i] = 0.82 + rnd() * 0.36

  const edgePositions = new Float32Array(includeEdges ? edgePairs.length * 3 : 0)
  if (includeEdges) {
    for (let e = 0; e < edgePairs.length; e++) {
      const p = edgePairs[e] * 3
      edgePositions[e * 3] = positions[p]
      edgePositions[e * 3 + 1] = positions[p + 1]
      edgePositions[e * 3 + 2] = positions[p + 2]
    }
  }

  return { positions, sizes, edgePositions }
}
