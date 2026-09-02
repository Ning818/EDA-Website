import * as THREE from 'three'

/**
 * Area-weighted uniform surface sampling of a loaded FBX model, plus a k-nearest-neighbor
 * "network" edge graph over a subset of the sampled points.
 *
 * Ported from the original vanilla Three.js particle-brain demo (particle_brain_demo_logo_24.html,
 * the "State 2" FBX-loading path): sampling density depends only on triangle surface area, never on
 * how finely a region happens to be subdivided into vertices — so a sparse, big triangle gets exactly
 * as many points per unit area as a dense, small one. Points are generated *inside* triangles (not
 * snapped to vertices), so the model's actual poly density never limits how many points we can take.
 *
 * @param {THREE.Object3D} fbxObject - the loaded FBX scene graph (already has matrixWorld baked in
 *   after `updateMatrixWorld(true)`, so multi-mesh / transformed FBX files sample correctly).
 * @param {object} opts
 * @param {number} opts.count - total particles to sample across the whole surface.
 * @param {number} opts.meshCount - how many of those particles (from the start of the array) also
 *   participate in the k-NN edge graph. Edge building is O(meshCount^2), so this is kept far smaller
 *   than `count` - the point cloud itself is unaffected by this limit, only the "wireframe" overlay.
 * @param {number} opts.targetExtent - the model is centered and uniformly scaled so its largest
 *   bounding-box axis equals this many world units.
 * @param {number} opts.edgeK - number of nearest neighbors considered per node.
 * @param {number} opts.edgeRelativeFactor - a candidate neighbor is only kept if its distance is within
 *   (nearest-neighbor distance * this factor), which prunes long, "crosses-the-gap" connections.
 * @param {number} [opts.seed] - LCG seed, kept deterministic so reloads don't jitter the layout.
 * @returns {{ positions: Float32Array, sizes: Float32Array, edgePositions: Float32Array }}
 */
export function sampleFbxSurface(fbxObject, opts) {
  const { count, meshCount, targetExtent, edgeK, edgeRelativeFactor, seed = 20260729 } = opts

  fbxObject.updateMatrixWorld(true)

  // ---- 1. Collect every triangle (world-space) across all meshes, plus its area ----
  const rawA = [], rawB = [], rawC = [], rawArea = []
  let minX = Infinity, minY = Infinity, minZ = Infinity
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
  const vA = new THREE.Vector3(), vB = new THREE.Vector3(), vC = new THREE.Vector3()
  const eAB = new THREE.Vector3(), eAC = new THREE.Vector3(), cross = new THREE.Vector3()

  function accumBBox(v) {
    if (v.x < minX) minX = v.x; if (v.x > maxX) maxX = v.x
    if (v.y < minY) minY = v.y; if (v.y > maxY) maxY = v.y
    if (v.z < minZ) minZ = v.z; if (v.z > maxZ) maxZ = v.z
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
      vA.fromBufferAttribute(posAttr, ia).applyMatrix4(child.matrixWorld)
      vB.fromBufferAttribute(posAttr, ib).applyMatrix4(child.matrixWorld)
      vC.fromBufferAttribute(posAttr, ic).applyMatrix4(child.matrixWorld)
      accumBBox(vA); accumBBox(vB); accumBBox(vC)
      eAB.subVectors(vB, vA)
      eAC.subVectors(vC, vA)
      cross.crossVectors(eAB, eAC)
      const area = cross.length() * 0.5
      if (area <= 0) continue
      rawArea.push(area)
      rawA.push(vA.x, vA.y, vA.z)
      rawB.push(vB.x, vB.y, vB.z)
      rawC.push(vC.x, vC.y, vC.z)
    }
  })
  if (rawArea.length === 0) throw new Error('sampleFbxSurface: no triangles found in FBX model')

  // ---- 2. Center + uniformly scale to targetExtent ----
  const centerX = (minX + maxX) / 2, centerY = (minY + maxY) / 2, centerZ = (minZ + maxZ) / 2
  const extent = Math.max(maxX - minX, maxY - minY, maxZ - minZ) || 1
  const scale = targetExtent / extent

  // ---- 3. Cumulative-area prefix sum for weighted triangle picking ----
  const cumArea = new Float64Array(rawArea.length)
  let totalArea = 0
  for (let f = 0; f < rawArea.length; f++) {
    totalArea += rawArea[f]
    cumArea[f] = totalArea
  }
  function pickFaceIndex(r) {
    let lo = 0, hi = cumArea.length - 1
    while (lo < hi) {
      const mid = (lo + hi) >>> 1
      if (cumArea[mid] < r) lo = mid + 1; else hi = mid
    }
    return lo
  }

  // ---- 4. Sample `count` points, uniformly distributed by surface area ----
  let s = seed
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }

  const positions = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    const fi = pickFaceIndex(rnd() * totalArea)
    // Standard uniform-point-in-triangle formula (sqrt on r1 avoids clustering toward vertex C)
    const r1 = rnd(), r2 = rnd()
    const sqrtR1 = Math.sqrt(r1)
    const wA = 1 - sqrtR1, wB = sqrtR1 * (1 - r2), wC = sqrtR1 * r2
    const ax = fi * 3
    const px = wA * rawA[ax] + wB * rawB[ax] + wC * rawC[ax]
    const py = wA * rawA[ax + 1] + wB * rawB[ax + 1] + wC * rawC[ax + 1]
    const pz = wA * rawA[ax + 2] + wB * rawB[ax + 2] + wC * rawC[ax + 2]
    positions[i * 3] = (px - centerX) * scale
    positions[i * 3 + 1] = (py - centerY) * scale
    positions[i * 3 + 2] = (pz - centerZ) * scale
    sizes[i] = 0.82 + rnd() * 0.36 // soft per-particle size variance, matches the reference demo
  }

  // ---- 5. k-NN edge graph over the first `meshCount` points ----
  const edgePositions = buildEdgePositions(positions, meshCount, edgeK, edgeRelativeFactor)

  return { positions, sizes, edgePositions }
}

function buildEdgePositions(positions, count, k, relativeFactor) {
  const edgeSet = new Set()
  const pairs = []
  for (let i = 0; i < count; i++) {
    const ix = i * 3
    const best = [] // kept sorted ascending by squared distance, length <= k
    for (let j = 0; j < count; j++) {
      if (i === j) continue
      const jx = j * 3
      const dx = positions[ix] - positions[jx]
      const dy = positions[ix + 1] - positions[jx + 1]
      const dz = positions[ix + 2] - positions[jx + 2]
      const d2 = dx * dx + dy * dy + dz * dz
      if (best.length < k) {
        best.push([d2, j])
        best.sort((a, b) => a[0] - b[0])
      } else if (d2 < best[k - 1][0]) {
        best[k - 1] = [d2, j]
        best.sort((a, b) => a[0] - b[0])
      }
    }
    // Only keep neighbors within (nearest-neighbor distance * relativeFactor), so the graph doesn't
    // stretch long connections across gaps (e.g. between the two halves of a folded shape).
    const nearestD2 = best.length ? best[0][0] : 0
    const maxAllowedD2 = nearestD2 * relativeFactor * relativeFactor
    for (const [d2, j] of best) {
      if (d2 > maxAllowedD2) continue
      const key = i < j ? `${i}_${j}` : `${j}_${i}`
      if (edgeSet.has(key)) continue
      edgeSet.add(key)
      pairs.push(i, j)
    }
  }

  const edgePositions = new Float32Array(pairs.length * 3)
  for (let e = 0; e < pairs.length; e++) {
    const p = pairs[e] * 3
    edgePositions[e * 3] = positions[p]
    edgePositions[e * 3 + 1] = positions[p + 1]
    edgePositions[e * 3 + 2] = positions[p + 2]
  }
  return edgePositions
}
