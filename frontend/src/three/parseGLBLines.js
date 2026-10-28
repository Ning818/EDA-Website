// Extracts point chains from a loaded GLB's THREE.Line/LineSegments/LineLoop objects (a model
// exported as genuine line-strip primitives, not a triangulated mesh) - the GLB counterpart to
// parseDXF.js's DXF path, sharing sampleLineStrips.js's resampleChains() core. Each top-level
// child of the scene is treated as a named layer/group (matching how the source app - Rhino -
// grouped the model), and every descendant line's own world-space vertices become one chain.
import * as THREE from 'three'
import { resampleChains } from './sampleLineStrips'

function collectLineChains(root, groupName, chains, chainGroups) {
  const v = new THREE.Vector3()
  root.traverse((obj) => {
    if (!obj.isLine) return
    const pos = obj.geometry?.attributes?.position
    if (!pos || pos.count < 2) return
    const chain = new Array(pos.count * 3)
    for (let i = 0; i < pos.count; i++) {
      v.set(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(obj.matrixWorld)
      chain[i * 3] = v.x
      chain[i * 3 + 1] = v.y
      chain[i * 3 + 2] = v.z
    }
    chains.push(chain)
    chainGroups.push(groupName)
  })
}

/**
 * @param {THREE.Object3D} scene - loaded GLB scene graph (gltf.scene).
 * @returns {{ chains: number[][], chainGroups: (string|null)[] }}
 */
export function chainsFromGLBScene(scene) {
  scene.updateWorldMatrix(true, true)
  const chains = []
  const chainGroups = []
  for (const child of scene.children) {
    collectLineChains(child, child.name || null, chains, chainGroups)
  }
  return { chains, chainGroups }
}

/**
 * One-call convenience: extracts a loaded GLB's line chains straight into a resampled particle
 * cloud.
 * @param {THREE.Object3D} scene - loaded GLB scene graph (gltf.scene).
 * @param {object} opts
 * @param {number} opts.targetExtent - see resampleChains in sampleLineStrips.js.
 * @param {number} opts.spacing - see resampleChains in sampleLineStrips.js.
 * @returns {{ positions: Float32Array, sizes: Float32Array, groups: (string|null)[] }}
 */
export function sampleGLBLines(scene, opts) {
  const { targetExtent, spacing } = opts
  const { chains, chainGroups } = chainsFromGLBScene(scene)
  return resampleChains(chains, chainGroups, { targetExtent, spacing })
}

export function collectTriangles(scene) {
  scene.updateWorldMatrix(true, true)
  const tris = [] // { group, a:[x,y,z], b, c }
  const va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3()
  const na = new THREE.Vector3(), nb = new THREE.Vector3(), nc = new THREE.Vector3()
  const nMat = new THREE.Matrix3()
  for (const child of scene.children) {
    const group = child.name || null
    child.traverse((obj) => {
      if (!obj.isMesh || obj.isLine) return
      const pos = obj.geometry?.attributes?.position
      if (!pos) return
      const index = obj.geometry.index
      const nor = obj.geometry.attributes.normal
      nMat.getNormalMatrix(obj.matrixWorld)
      const n = (index ? index.count : pos.count) / 3
      for (let t = 0; t < n; t++) {
        const ids = [0, 1, 2].map((k) => (index ? index.getX(t * 3 + k) : t * 3 + k))
        va.fromBufferAttribute(pos, ids[0]).applyMatrix4(obj.matrixWorld)
        vb.fromBufferAttribute(pos, ids[1]).applyMatrix4(obj.matrixWorld)
        vc.fromBufferAttribute(pos, ids[2]).applyMatrix4(obj.matrixWorld)
        const tri = { group, a: va.toArray(), b: vb.toArray(), c: vc.toArray() }
        if (nor) {
          na.fromBufferAttribute(nor, ids[0]).applyMatrix3(nMat).normalize()
          nb.fromBufferAttribute(nor, ids[1]).applyMatrix3(nMat).normalize()
          nc.fromBufferAttribute(nor, ids[2]).applyMatrix3(nMat).normalize()
          tri.na = na.toArray(); tri.nb = nb.toArray(); tri.nc = nc.toArray()
        }
        tris.push(tri)
      }
    })
  }
  return tris
}

/**
 * Line art plus triangle meshes in one GLB, sharing one center/scale: lines go through
 * resampleChains (even arc-length spacing); meshes become an evenly-spread surface point cloud
 * (area-weighted random candidates thinned to a minimum distance of `meshSpacing`, i.e. blue-noise
 * rather than clumpy pure-random sampling). Each top-level child is a named group.
 * @param {THREE.Object3D} scene
 * @param {object} opts
 * @param {number} opts.targetExtent
 * @param {number} opts.spacing - point spacing along lines.
 * @param {number} opts.meshSpacing - minimum distance between mesh surface points (at its sparsest).
 * @param {number} [opts.meshTipSpacing] - if set (< meshSpacing), the mesh gets denser toward
 *   `opts.tipGroup` (a line group, e.g. the chip a hand reaches for): spacing eases from
 *   meshSpacing far away down to this right at the group, so fingertips read densest.
 * @param {string} [opts.tipGroup]
 */
export function sampleGLBLinesAndMesh(scene, opts) {
  const { targetExtent, spacing, meshSpacing, meshTipSpacing = meshSpacing, tipGroup } = opts
  const { chains, chainGroups } = chainsFromGLBScene(scene)
  const tris = collectTriangles(scene)

  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity]
  const grow = (p) => { for (let k = 0; k < 3; k++) { if (p[k] < min[k]) min[k] = p[k]; if (p[k] > max[k]) max[k] = p[k] } }
  for (const ch of chains) for (let i = 0; i < ch.length; i += 3) grow([ch[i], ch[i + 1], ch[i + 2]])
  for (const t of tris) { grow(t.a); grow(t.b); grow(t.c) }

  const lines = resampleChains(chains, chainGroups, { targetExtent, spacing, bounds: { min, max } })
  const { center, scale } = lines.transform
  const toScaled = (p) => [(p[0] - center[0]) * scale, (p[1] - center[1]) * scale, (p[2] - center[2]) * scale]

  const st = tris.map((t) => ({ group: t.group, a: toScaled(t.a), b: toScaled(t.b), c: toScaled(t.c), na: t.na, nb: t.nb, nc: t.nc }))
  // Face orientation must be geometric (which way the surface really faces). Neither the mesh's
  // stored normals nor its winding can be trusted as-is (this hand's are inconsistent), so recover
  // orientation from topology: weld vertices, flood-fill the winding across shared edges so every
  // neighbor agrees, then flip each connected piece so its signed volume is positive (outward).
  const weld = new Map()
  const wid = (p) => {
    const k = `${Math.round(p[0] * 1e4)},${Math.round(p[1] * 1e4)},${Math.round(p[2] * 1e4)}`
    let id = weld.get(k)
    if (id === undefined) { id = weld.size; weld.set(k, id) }
    return id
  }
  const corner = st.map((t) => [wid(t.a), wid(t.b), wid(t.c)])
  const edgeTris = new Map() // "lo,hi" -> triangle indices
  corner.forEach((c, ti) => {
    for (let e = 0; e < 3; e++) {
      const x = c[e], y = c[(e + 1) % 3]
      const key = x < y ? `${x},${y}` : `${y},${x}`
      let l = edgeTris.get(key)
      if (!l) { l = []; edgeTris.set(key, l) }
      l.push(ti)
    }
  })
  const flipped = new Array(st.length).fill(null) // null = unvisited
  const dirOf = (ti, x, y) => { // does triangle ti (after flip) run x->y ?
    const c = corner[ti]
    const [p0, p1, p2] = flipped[ti] ? [c[0], c[2], c[1]] : c
    return (p0 === x && p1 === y) || (p1 === x && p2 === y) || (p2 === x && p0 === y)
  }
  for (let seedTri = 0; seedTri < st.length; seedTri++) {
    if (flipped[seedTri] !== null) continue
    flipped[seedTri] = false
    const comp = [seedTri], stack = [seedTri]
    while (stack.length) {
      const ti = stack.pop()
      const c = corner[ti]
      for (let e = 0; e < 3; e++) {
        const x = c[e], y = c[(e + 1) % 3]
        const key = x < y ? `${x},${y}` : `${y},${x}`
        for (const nj of edgeTris.get(key)) {
          if (nj === ti || flipped[nj] !== null) continue
          const [fx, fy] = flipped[ti] ? [y, x] : [x, y] // direction ti actually runs along this edge
          flipped[nj] = false
          if (dirOf(nj, fx, fy)) flipped[nj] = true // neighbor must run the opposite way
          comp.push(nj); stack.push(nj)
        }
      }
    }
    let vol = 0
    for (const ti of comp) {
      const t = st[ti]
      const [p0, p1, p2] = flipped[ti] ? [t.a, t.c, t.b] : [t.a, t.b, t.c]
      vol += p0[0] * (p1[1] * p2[2] - p1[2] * p2[1]) - p0[1] * (p1[0] * p2[2] - p1[2] * p2[0]) + p0[2] * (p1[0] * p2[1] - p1[1] * p2[0])
    }
    if (vol < 0) for (const ti of comp) flipped[ti] = !flipped[ti]
  }
  for (let ti = 0; ti < st.length; ti++) {
    const t = st[ti]
    const [p0, p1, p2] = flipped[ti] ? [t.a, t.c, t.b] : [t.a, t.b, t.c]
    const ux = p1[0] - p0[0], uy = p1[1] - p0[1], uz = p1[2] - p0[2]
    const vx = p2[0] - p0[0], vy = p2[1] - p0[1], vz = p2[2] - p0[2]
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx
    const len = Math.hypot(nx, ny, nz) || 1
    t.na = t.nb = t.nc = [nx / len, ny / len, nz / len]
  }
  const areas = st.map((t) => {
    const ux = t.b[0] - t.a[0], uy = t.b[1] - t.a[1], uz = t.b[2] - t.a[2]
    const vx = t.c[0] - t.a[0], vy = t.c[1] - t.a[1], vz = t.c[2] - t.a[2]
    return 0.5 * Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx)
  })
  const cumulative = []
  let total = 0
  for (const a of areas) { total += a; cumulative.push(total) }

  let seed = 20260924
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
  const minSpacing = Math.min(meshSpacing, meshTipSpacing)
  const candidates = Math.ceil((6 * total) / (minSpacing * minSpacing))
  const cell = meshSpacing

  // Local spacing: eases from meshSpacing (far from the tip group) to meshTipSpacing (at it).
  // "Near" is measured on the scaled tip-group points, normalized over the mesh's own extent.
  let radiusAt = () => meshSpacing
  if (tipGroup && meshTipSpacing < meshSpacing) {
    const tip = []
    for (let i = 0; i < lines.positions.length / 3; i++) if (lines.groups[i] === tipGroup) tip.push([lines.positions[i * 3], lines.positions[i * 3 + 1], lines.positions[i * 3 + 2]])
    if (tip.length) {
      const c = [0, 1, 2].map((k) => tip.reduce((a, q) => a + q[k], 0) / tip.length)
      let dMin = Infinity, dMax = 0
      for (const t of st) for (const q of [t.a, t.b, t.c]) {
        const d = Math.hypot(q[0] - c[0], q[1] - c[1], q[2] - c[2])
        if (d < dMin) dMin = d
        if (d > dMax) dMax = d
      }
      radiusAt = (p) => {
        const d = Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2])
        const x = Math.min(1, Math.max(0, (d - dMin) / (dMax - dMin || 1)))
        const w = x * x * (3 - 2 * x) // smoothstep: 0 at the tip, 1 far away
        return meshTipSpacing + (meshSpacing - meshTipSpacing) * w
      }
    }
  }
  const grid = new Map()
  const meshPts = [], meshGroups = [], meshNormals = []
  for (let n = 0; n < candidates && total > 0; n++) {
    const r = rnd() * total
    let lo = 0, hi = cumulative.length - 1
    while (lo < hi) { const mid = (lo + hi) >> 1; if (cumulative[mid] < r) lo = mid + 1; else hi = mid }
    const t = st[lo]
    let u = rnd(), v = rnd()
    if (u + v > 1) { u = 1 - u; v = 1 - v }
    const p = [0, 1, 2].map((k) => t.a[k] + u * (t.b[k] - t.a[k]) + v * (t.c[k] - t.a[k]))
    const cx = Math.floor(p[0] / cell), cy = Math.floor(p[1] / cell), cz = Math.floor(p[2] / cell)
    const rp = radiusAt(p)
    let ok = true
    for (let dx = -1; dx <= 1 && ok; dx++) for (let dy = -1; dy <= 1 && ok; dy++) for (let dz = -1; dz <= 1 && ok; dz++) {
      const list = grid.get(`${cx + dx},${cy + dy},${cz + dz}`)
      if (!list) continue
      for (const q of list) {
        const need = (rp + q[3]) / 2
        if ((q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2 + (q[2] - p[2]) ** 2 < need * need) { ok = false; break }
      }
    }
    if (!ok) continue
    const key = `${cx},${cy},${cz}`
    if (!grid.has(key)) grid.set(key, [])
    grid.get(key).push([p[0], p[1], p[2], rp])
    meshPts.push(p[0], p[1], p[2])
    meshGroups.push(t.group)
    const w = 1 - u - v
    const nx = w * t.na[0] + u * t.nb[0] + v * t.nc[0], ny = w * t.na[1] + u * t.nb[1] + v * t.nc[1], nz = w * t.na[2] + u * t.nb[2] + v * t.nc[2]
    const nl = Math.hypot(nx, ny, nz) || 1
    meshNormals.push(nx / nl, ny / nl, nz / nl)
  }

  const nLine = lines.positions.length / 3, nMesh = meshPts.length / 3
  const positions = new Float32Array((nLine + nMesh) * 3)
  positions.set(lines.positions, 0)
  positions.set(meshPts, nLine * 3)
  const sizes = new Float32Array(nLine + nMesh)
  sizes.set(lines.sizes, 0)
  for (let i = 0; i < nMesh; i++) sizes[nLine + i] = 0.82 + rnd() * 0.36
  // Mesh points carry real outward normals and are back-face aware; line points have neither.
  const normals = new Float32Array((nLine + nMesh) * 3)
  normals.set(meshNormals, nLine * 3)
  const normalMask = new Float32Array(nLine + nMesh)
  normalMask.fill(1, nLine)
  return { positions, sizes, normals, normalMask, groups: [...lines.groups, ...meshGroups], counts: { lines: nLine, mesh: nMesh }, transform: lines.transform }
}
