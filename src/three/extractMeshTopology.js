import * as THREE from 'three'

/**
 * Low-level shared step: walks a loaded model's meshes, deduplicates vertices by world-space
 * position, and deduplicates triangle edges. No centering/scaling, no particle sampling -
 * just the raw topology, reused by extractMeshGeometry.js (native-vertex wireframe, the brain)
 * and sampleEdgePoints.js (equidistant edge sampling, the theme backgrounds).
 *
 * @param {THREE.Object3D} object - loaded model scene graph.
 * @returns {{ rawPositions: number[], edgePairs: number[] }} rawPositions is flat xyz triples in
 *   original (un-centered/un-scaled) world space; edgePairs is flat pairs of indices into it.
 */
export function extractMeshTopology(object) {
  object.updateMatrixWorld(true)

  const vertexIndex = new Map() // "x,y,z" -> index into rawPositions
  const rawPositions = []
  const edgeSet = new Set()
  const edgePairs = []

  const v = new THREE.Vector3()
  function vertexAt(posAttr, i, matrixWorld) {
    v.fromBufferAttribute(posAttr, i).applyMatrix4(matrixWorld)
    const key = `${v.x.toFixed(5)},${v.y.toFixed(5)},${v.z.toFixed(5)}`
    let idx = vertexIndex.get(key)
    if (idx === undefined) {
      idx = rawPositions.length / 3
      rawPositions.push(v.x, v.y, v.z)
      vertexIndex.set(key, idx)
    }
    return idx
  }
  function addEdge(a, b) {
    if (a === b) return
    const key = a < b ? `${a}_${b}` : `${b}_${a}`
    if (edgeSet.has(key)) return
    edgeSet.add(key)
    edgePairs.push(a, b)
  }

  object.traverse((child) => {
    if (!child.isMesh || !child.geometry?.attributes?.position) return
    const posAttr = child.geometry.attributes.position
    const idxAttr = child.geometry.index
    const faceCount = idxAttr ? idxAttr.count / 3 : posAttr.count / 3
    for (let f = 0; f < faceCount; f++) {
      const ia = idxAttr ? idxAttr.getX(f * 3) : f * 3
      const ib = idxAttr ? idxAttr.getX(f * 3 + 1) : f * 3 + 1
      const ic = idxAttr ? idxAttr.getX(f * 3 + 2) : f * 3 + 2
      const via = vertexAt(posAttr, ia, child.matrixWorld)
      const vib = vertexAt(posAttr, ib, child.matrixWorld)
      const vic = vertexAt(posAttr, ic, child.matrixWorld)
      addEdge(via, vib)
      addEdge(vib, vic)
      addEdge(vic, via)
    }
  })
  if (rawPositions.length === 0) throw new Error('extractMeshTopology: no triangles found in model')

  return { rawPositions, edgePairs }
}

/** Shared centering/scaling step: centers rawPositions on its bbox and uniformly scales so the
 * largest axis equals targetExtent. Returns a new Float32Array, same length as the input. */
export function centerAndScale(rawPositions, targetExtent) {
  let minX = Infinity, minY = Infinity, minZ = Infinity
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
  for (let i = 0; i < rawPositions.length; i += 3) {
    const x = rawPositions[i], y = rawPositions[i + 1], z = rawPositions[i + 2]
    if (x < minX) minX = x; if (x > maxX) maxX = x
    if (y < minY) minY = y; if (y > maxY) maxY = y
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z
  }
  const centerX = (minX + maxX) / 2, centerY = (minY + maxY) / 2, centerZ = (minZ + maxZ) / 2
  const extent = Math.max(maxX - minX, maxY - minY, maxZ - minZ) || 1
  const scale = targetExtent / extent

  const positions = new Float32Array(rawPositions.length)
  for (let i = 0; i < rawPositions.length; i += 3) {
    positions[i] = (rawPositions[i] - centerX) * scale
    positions[i + 1] = (rawPositions[i + 1] - centerY) * scale
    positions[i + 2] = (rawPositions[i + 2] - centerZ) * scale
  }
  return positions
}
