import * as THREE from 'three'

/**
 * Extracts a loaded 3D model's own triangle mesh directly as a particle cloud: every unique
 * vertex becomes a point, and (optionally) every unique triangle edge becomes a connecting line.
 * No random sampling - this reproduces the model's actual faceted structure. Works on any loaded
 * Object3D regardless of source format (FBX, GLTF/GLB, ...) since it only reads
 * `mesh.geometry.attributes.position` via traverse().
 *
 * @param {THREE.Object3D} object - loaded model scene graph, with matrixWorld already current
 *   (call `object.updateMatrixWorld(true)` first if it was just loaded/attached).
 * @param {object} opts
 * @param {number} opts.targetExtent - the model is centered and uniformly scaled so its largest
 *   bounding-box axis equals this many world units.
 * @param {boolean} [opts.includeEdges=true] - set false to skip building the edge list entirely
 *   (cheaper, and pointless when the caller only wants a bare point cloud).
 * @returns {{ positions: Float32Array, sizes: Float32Array, edgePositions: Float32Array }}
 */
export function extractMeshGeometry(object, opts) {
  const { targetExtent, includeEdges = true } = opts

  object.updateMatrixWorld(true)

  // ---- 1. Collect unique vertices (dedup by rounded world-space position) and unique edges ----
  const vertexIndex = new Map() // "x,y,z" -> index into rawPositions
  const rawPositions = [] // flat, un-centered/un-scaled
  const edgeSet = includeEdges ? new Set() : null
  const edgePairs = [] // flat pairs of vertex indices

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
      if (includeEdges) {
        addEdge(via, vib)
        addEdge(vib, vic)
        addEdge(vic, via)
      }
    }
  })
  if (rawPositions.length === 0) throw new Error('extractMeshGeometry: no triangles found in model')

  // ---- 2. Center + uniformly scale to targetExtent ----
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

  const vertexCount = rawPositions.length / 3
  const positions = new Float32Array(rawPositions.length)
  for (let i = 0; i < rawPositions.length; i += 3) {
    positions[i] = (rawPositions[i] - centerX) * scale
    positions[i + 1] = (rawPositions[i + 1] - centerY) * scale
    positions[i + 2] = (rawPositions[i + 2] - centerZ) * scale
  }

  // ---- 3. Soft per-particle size variance (deterministic, matches the reference demo) ----
  const sizes = new Float32Array(vertexCount)
  let seed = 20260729
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
  for (let i = 0; i < vertexCount; i++) sizes[i] = 0.82 + rnd() * 0.36

  // ---- 4. Edge line-segment positions, from the same centered/scaled vertices ----
  const edgePositions = new Float32Array(edgePairs.length * 3)
  for (let e = 0; e < edgePairs.length; e++) {
    const p = edgePairs[e] * 3
    edgePositions[e * 3] = positions[p]
    edgePositions[e * 3 + 1] = positions[p + 1]
    edgePositions[e * 3 + 2] = positions[p + 2]
  }

  return { positions, sizes, edgePositions }
}
