// Estimates how "folded inward" (concave, e.g. a sulcus/crease between two ridges) each vertex is,
// relative to its direct mesh neighbors - a cheap discrete-Laplacian curvature estimate, not a
// real curvature tensor. For a vertex sitting behind the average of its neighbors along its own
// outward normal, that's a concave fold; sitting ahead of them is a convex ridge - only the fold
// side is kept and normalized against this model's own distribution, so the effect scales with
// whatever this particular mesh's fold depth actually looks like.

/**
 * @param {Float32Array} positions - centered/scaled vertex positions.
 * @param {Float32Array} normals - unit per-vertex normals, same layout as positions.
 * @param {number[]} edgePairs - flat pairs of vertex indices (from extractMeshGeometry).
 * @returns {Float32Array} per-vertex fold weight in [0, 1] - 0 = flat/convex, 1 = a deep fold.
 */
export function computeFoldWeight(positions, normals, edgePairs) {
  const vertexCount = positions.length / 3
  const neighborSum = new Float64Array(vertexCount * 3)
  const neighborCount = new Int32Array(vertexCount)

  for (let e = 0; e < edgePairs.length; e += 2) {
    const a = edgePairs[e], b = edgePairs[e + 1]
    neighborSum[a * 3] += positions[b * 3]
    neighborSum[a * 3 + 1] += positions[b * 3 + 1]
    neighborSum[a * 3 + 2] += positions[b * 3 + 2]
    neighborCount[a]++
    neighborSum[b * 3] += positions[a * 3]
    neighborSum[b * 3 + 1] += positions[a * 3 + 1]
    neighborSum[b * 3 + 2] += positions[a * 3 + 2]
    neighborCount[b]++
  }

  const foldRaw = new Float32Array(vertexCount)
  for (let i = 0; i < vertexCount; i++) {
    const n = neighborCount[i]
    if (n === 0) continue
    const avgX = neighborSum[i * 3] / n, avgY = neighborSum[i * 3 + 1] / n, avgZ = neighborSum[i * 3 + 2] / n
    const lapX = positions[i * 3] - avgX, lapY = positions[i * 3 + 1] - avgY, lapZ = positions[i * 3 + 2] - avgZ
    const signedCurvature = lapX * normals[i * 3] + lapY * normals[i * 3 + 1] + lapZ * normals[i * 3 + 2]
    foldRaw[i] = Math.max(0, -signedCurvature) // keep only the concave (fold) side
  }

  // Normalize against this model's own distribution: the least-folded 60% of points get weight 0,
  // the most-folded ~8% get weight 1, smoothly in between - so the effect highlights genuine
  // sulci/creases rather than every minor dip, regardless of this mesh's own scale/density.
  const sorted = Float32Array.from(foldRaw).sort()
  const lo = sorted[Math.floor(sorted.length * 0.6)]
  const hi = sorted[Math.floor(sorted.length * 0.92)] || lo + 1e-6

  const fold = new Float32Array(vertexCount)
  for (let i = 0; i < vertexCount; i++) {
    const t = Math.min(1, Math.max(0, (foldRaw[i] - lo) / (hi - lo || 1e-6)))
    fold[i] = t * t * (3 - 2 * t) // smoothstep, for a soft-edged transition instead of a hard cutoff
  }
  return fold
}
