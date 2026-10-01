/**
 * Centers/scales a set of point chains and resamples each at even spacing - the shared core
 * serving both parseGLBLines.js's GLB path (chains walked from a loaded model's THREE.Line
 * objects) and parseDXF.js's DXF path (chains evaluated from real ARC/CIRCLE/SPLINE/POLYLINE
 * entities).
 *
 * @param {number[][]} chains - each entry a flat [x0,y0,z0, x1,y1,z1, ...] world-space polyline.
 * @param {(string|null|undefined)[]} chainGroups - one group key per chain, same length as `chains`.
 * @param {object} opts
 * @param {number} opts.targetExtent - the combined chains are centered and uniformly scaled so
 *   their largest bounding-box axis equals this many world units.
 * @param {number} opts.spacing - target distance between consecutive points along a segment, in
 *   the same (post-scale) world units as targetExtent.
 * @param {{min:number[], max:number[]}} [opts.bounds] - raw-space bounding box to center/scale by
 *   instead of the chains' own (use when other geometry, e.g. a mesh, must share the transform).
 * @returns {{ positions: Float32Array, sizes: Float32Array, groups: (string|null|undefined)[],
 *   transform: { center: number[], scale: number } }}
 */
export function resampleChains(chains, chainGroups, opts) {
  const { targetExtent, spacing } = opts
  // A pure-mesh GLB (no THREE.Line/LineSegments at all - e.g. SocialMediaParticles.js's chip boxes)
  // has zero chains; that's fine as long as `opts.bounds` stands in for the chains' own bounding box
  // below, since sampleGLBLinesAndMesh always passes bounds covering the mesh triangles too. Only
  // reject the case nothing at all can define a transform.
  if (chains.length === 0 && !opts.bounds) throw new Error('resampleChains: no chains given')

  let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
  for (const chain of chains) {
    for (let i = 0; i < chain.length; i += 3) {
      const x = chain[i], y = chain[i + 1], z = chain[i + 2]
      if (x < minX) minX = x; if (x > maxX) maxX = x
      if (y < minY) minY = y; if (y > maxY) maxY = y
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z
    }
  }
  if (opts.bounds) {
    ;[minX, minY, minZ] = opts.bounds.min
    ;[maxX, maxY, maxZ] = opts.bounds.max
  }
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, cz = (minZ + maxZ) / 2
  const extent = Math.max(maxX - minX, maxY - minY, maxZ - minZ) || 1
  const scale = targetExtent / extent
  const centerScale = (x, y, z) => [(x - cx) * scale, (y - cy) * scale, (z - cz) * scale]

  const points = []
  const groups = []
  for (let ci = 0; ci < chains.length; ci++) {
    const chain = chains[ci]
    const group = chainGroups[ci]
    const n = chain.length / 3
    if (n === 0) continue
    const verts = []
    for (let i = 0; i < n; i++) verts.push(centerScale(chain[i * 3], chain[i * 3 + 1], chain[i * 3 + 2]))

    let totalLen = 0
    for (let i = 0; i + 1 < n; i++) {
      const [ax, ay, az] = verts[i], [bx, by, bz] = verts[i + 1]
      totalLen += Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2 + (bz - az) ** 2)
    }

    if (totalLen < spacing) {
      // Chain shorter than the target point spacing end-to-end (e.g. many of this GLB's ~800 line
      // meshes, which are just 2-point segments - some far shorter than a full spacing step, from
      // Rhino pre-splitting every curve into short pieces): represent it with a single point at its
      // arc-length midpoint rather than its raw start vertex. Emitting the literal start (and,
      // worse, both start and end) here would bias where the point sits within a sub-resolution
      // segment and, for two-point chains, stack near-identical points on top of each other -
      // whereas every short chain contributing exactly one, well-centered point keeps density even
      // across a model regardless of how the source app happened to split its curves.
      const half = totalLen / 2
      let acc = 0
      let [mx, my, mz] = verts[0]
      for (let i = 0; i + 1 < n; i++) {
        const [ax, ay, az] = verts[i], [bx, by, bz] = verts[i + 1]
        const segLen = Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2 + (bz - az) ** 2)
        if (segLen > 0 && acc + segLen >= half) {
          const t = (half - acc) / segLen
          mx = ax + (bx - ax) * t; my = ay + (by - ay) * t; mz = az + (bz - az) * t
          break
        }
        acc += segLen
      }
      points.push(mx, my, mz)
      groups.push(group)
      continue
    }

    // Walk the chain's own polyline (its native vertices, whatever their spacing) at continuous
    // arc-length, placing one point every `spacing` apart - independent of how finely the source
    // was tessellated. Without this, a curve evaluated at a fixed vertex count regardless of its
    // physical size (e.g. DXF ARC/CIRCLE/SPLINE entities, always split into the same number of
    // segments) produces a much denser cluster of points for a small curve than for a straight line
    // of the same length, since every native vertex used to be kept unconditionally.
    points.push(verts[0][0], verts[0][1], verts[0][2])
    groups.push(group)
    let remaining = spacing
    let [cx2, cy2, cz2] = verts[0]
    let [lastX, lastY, lastZ] = verts[0] // most recently emitted point, for the end-vertex check below
    for (let i = 0; i + 1 < n; i++) {
      const [bx, by, bz] = verts[i + 1]
      let ax = cx2, ay = cy2, az = cz2
      let dx = bx - ax, dy = by - ay, dz = bz - az
      let segLen = Math.sqrt(dx * dx + dy * dy + dz * dz)
      while (segLen >= remaining) {
        const t = remaining / segLen
        ax = ax + dx * t; ay = ay + dy * t; az = az + dz * t
        points.push(ax, ay, az)
        groups.push(group)
        lastX = ax; lastY = ay; lastZ = az
        dx = bx - ax; dy = by - ay; dz = bz - az
        segLen = Math.sqrt(dx * dx + dy * dy + dz * dz)
        remaining = spacing
      }
      remaining -= segLen
      cx2 = bx; cy2 = by; cz2 = bz
    }
    // The chain's true end vertex is always a candidate (it's a real geometric endpoint, needed so
    // an adjacent chain sharing this corner has a matching point for the dedup pass below to find),
    // but only emit it if it's not essentially sitting on top of the point just emitted, so a
    // short leftover tail after the last full `spacing` step doesn't stack a near-duplicate there.
    const last = verts[n - 1]
    const dLastX = last[0] - lastX, dLastY = last[1] - lastY, dLastZ = last[2] - lastZ
    const distToLast = Math.sqrt(dLastX * dLastX + dLastY * dLastY + dLastZ * dLastZ)
    if (distToLast >= spacing * 0.25) {
      points.push(last[0], last[1], last[2])
      groups.push(group)
    }
  }

  // Separate curves/edges routinely share an endpoint - two adjacent wall segments meeting at a
  // building corner, a curb line ending where the next one starts - and since every chain's own
  // start/end vertex is always kept (above), a shared corner gets pushed once per entity that
  // touches it, stacking multiple particles exactly on top of each other. Merge points closer than
  // a small fraction of the target spacing into one so shared junctions don't render as an
  // over-bright, over-dense spot.
  const dedupCell = Math.max(spacing / 20, 1e-6)
  const seen = new Map()
  const dedupedPoints = []
  const dedupedGroups = []
  for (let i = 0; i < points.length; i += 3) {
    const x = points[i], y = points[i + 1], z = points[i + 2]
    const key = `${Math.round(x / dedupCell)},${Math.round(y / dedupCell)},${Math.round(z / dedupCell)}`
    if (seen.has(key)) continue
    seen.set(key, true)
    dedupedPoints.push(x, y, z)
    dedupedGroups.push(groups[i / 3])
  }

  const positions = new Float32Array(dedupedPoints)
  const count = positions.length / 3
  const sizes = new Float32Array(count)
  let seed = 20260729
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
  for (let i = 0; i < count; i++) sizes[i] = 0.82 + rnd() * 0.36

  return { positions, sizes, groups: dedupedGroups, transform: { center: [cx, cy, cz], scale } }
}
