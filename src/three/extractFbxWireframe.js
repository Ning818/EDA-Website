import * as THREE from 'three'

/**
 * Uses an FBX model's own triangle mesh directly as the particle cloud: every unique vertex
 * becomes a point, every unique triangle edge becomes a connecting line. No random sampling -
 * this reproduces the model's actual low-poly faceted structure (matches how
 * particle_brain_demo_logo_24.html's brain state is built from a fixed point set, just sourced
 * live from the mesh instead of a server-precomputed array).
 *
 * @param {THREE.Object3D} fbxObject - loaded FBX scene graph.
 * @param {object} opts
 * @param {number} opts.targetExtent - the model is centered and uniformly scaled so its largest
 *   bounding-box axis equals this many world units.
 * @param {{ pos: [number, number, number], color: THREE.Color }[]} opts.anchors - each vertex is
 *   colored by whichever anchor it's closest to (positions given as fractions of targetExtent),
 *   reproducing the reference demo's four-zone coloring.
 * @returns {{ positions: Float32Array, colors: Float32Array, sizes: Float32Array, edgePositions: Float32Array }}
 */
export function extractFbxWireframe(fbxObject, opts) {
  const { targetExtent, anchors } = opts

  fbxObject.updateMatrixWorld(true)

  // ---- 1. Collect unique vertices (dedup by rounded world-space position) and unique edges ----
  const vertexIndex = new Map() // "x,y,z" -> index into rawPositions
  const rawPositions = [] // flat, un-centered/un-scaled
  const edgeSet = new Set()
  const edgePairs = [] // flat pairs of vertex indices

  const v = new THREE.Vector3()
  function vertexAt(posAttr, i, matrixWorld) {
    v.fromBufferAttribute(posAttr, i).applyMatrix4(matrixWorld)
    const key = `${v.x.toFixed(5)},${v.y.toFixed(5)},${v.z.toFixed(5)}`
    let vi = vertexIndex.get(key)
    if (vi === undefined) {
      vi = rawPositions.length / 3
      rawPositions.push(v.x, v.y, v.z)
      vertexIndex.set(key, vi)
    }
    return vi
  }
  function addEdge(a, b) {
    if (a === b) return
    const key = a < b ? `${a}_${b}` : `${b}_${a}`
    if (edgeSet.has(key)) return
    edgeSet.add(key)
    edgePairs.push(a, b)
  }

  fbxObject.traverse((child) => {
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
  if (rawPositions.length === 0) throw new Error('extractFbxWireframe: no triangles found in FBX model')

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

  // ---- 3. Per-vertex color by nearest anchor (reproduces the four-zone brain coloring) ----
  const colors = new Float32Array(vertexCount * 3)
  const sizes = new Float32Array(vertexCount)
  let seed = 20260729
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
  for (let i = 0; i < vertexCount; i++) {
    const x = positions[i * 3], y = positions[i * 3 + 1], z = positions[i * 3 + 2]
    let bestK = 0, bestD2 = Infinity
    for (let k = 0; k < anchors.length; k++) {
      const [ax, ay, az] = anchors[k].pos
      const dx = x - ax * targetExtent, dy = y - ay * targetExtent, dz = z - az * targetExtent
      const d2 = dx * dx + dy * dy + dz * dz
      if (d2 < bestD2) { bestD2 = d2; bestK = k }
    }
    const c = anchors[bestK].color
    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
    sizes[i] = 0.82 + rnd() * 0.36 // soft per-particle size variance, matches the reference demo
  }

  // ---- 4. Edge line-segment positions, from the same centered/scaled vertices ----
  const edgePositions = new Float32Array(edgePairs.length * 3)
  for (let e = 0; e < edgePairs.length; e++) {
    const p = edgePairs[e] * 3
    edgePositions[e * 3] = positions[p]
    edgePositions[e * 3 + 1] = positions[p + 1]
    edgePositions[e * 3 + 2] = positions[p + 2]
  }

  return { positions, colors, sizes, edgePositions }
}
