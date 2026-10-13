/**
 * Samples exactly `count` points from a set of point chains (e.g. parseDXF.js's parseDXFToChains
 * output), spread evenly by arc length across all of them - unlike resampleChains in
 * sampleLineStrips.js, which fixes the spacing and lets the point count fall where it may, this
 * fixes the count (what a background effect with a set particle budget needs) and derives the
 * spacing from the model's total curve length.
 *
 * The cloud is also re-oriented so the model's principal axis (its longest direction - a DNA
 * helix's own axis) lies along +X, then centered and scaled so that axis spans `targetLength`.
 * That makes "rotate around its own axis" a plain rotation.x on the caller's side.
 *
 * Stratified jitter (one random point per equal-length stratum) keeps the density even without
 * the visible regularity of a perfectly fixed step.
 *
 * @param {number[][]} chains - each a flat [x0,y0,z0, x1,y1,z1, ...] polyline.
 * @param {(string|null)[]} chainGroups - one group key per chain.
 * @param {object} opts
 * @param {number} opts.count - exact number of points to return.
 * @param {number} opts.targetLength - world-space length of the principal axis after scaling.
 * @param {number} [opts.seed]
 * @returns {{ positions: Float32Array, groups: (string|null)[], chainT: Float32Array, axisT: Float32Array }}
 *   chainT - each point's 0..1 position along its own chain; axisT - 0..1 position along the
 *   principal axis (for effects that travel along the model).
 */
export function sampleChainsExact(chains, chainGroups, opts) {
  const { count, targetLength, seed = 20261013 } = opts

  // Flatten every chain into segments with a running arc-length total.
  const segA = [], segB = [], segChain = [], segStart = [], cumulative = []
  const chainStart = [], chainLen = []
  let total = 0
  for (let ci = 0; ci < chains.length; ci++) {
    const c = chains[ci]
    chainStart.push(total)
    for (let j = 0; j + 5 < c.length; j += 3) {
      const len = Math.hypot(c[j + 3] - c[j], c[j + 4] - c[j + 1], c[j + 5] - c[j + 2])
      if (len <= 0) continue
      segA.push([c[j], c[j + 1], c[j + 2]])
      segB.push([c[j + 3], c[j + 4], c[j + 5]])
      segChain.push(ci)
      segStart.push(total)
      total += len
      cumulative.push(total)
    }
    chainLen.push(total - chainStart[ci])
  }
  if (total === 0) throw new Error('sampleChainsExact: chains have no length')

  // Length-weighted PCA (segment midpoints) for the principal axes.
  const mean = [0, 0, 0]
  const weights = segA.map((a, i) => cumulative[i] - segStart[i])
  const mids = segA.map((a, i) => [(a[0] + segB[i][0]) / 2, (a[1] + segB[i][1]) / 2, (a[2] + segB[i][2]) / 2])
  mids.forEach((m, i) => { for (let k = 0; k < 3; k++) mean[k] += m[k] * weights[i] / total })
  const cov = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
  mids.forEach((m, i) => {
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) cov[a][b] += (m[a] - mean[a]) * (m[b] - mean[b]) * weights[i]
  })
  const e1 = powerIteration(cov, [1, 0.3, 0.1])
  const l1 = quadForm(cov, e1)
  const deflated = cov.map((row, a) => row.map((v, b) => v - l1 * e1[a] * e1[b]))
  let e2 = powerIteration(deflated, Math.abs(e1[2]) < 0.9 ? [0, 0, 1] : [0, 1, 0])
  e2 = normalize(sub(e2, scale(e1, dot(e1, e2))))
  const e3 = cross(e1, e2)

  // Stratified arc-length sampling.
  let s = seed >>> 0
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
  const raw = new Float32Array(count * 3)
  const groups = new Array(count)
  const chainT = new Float32Array(count)
  let seg = 0
  for (let k = 0; k < count; k++) {
    const target = ((k + rnd()) / count) * total
    while (seg < cumulative.length - 1 && cumulative[seg] < target) seg++
    const t = (target - segStart[seg]) / (cumulative[seg] - segStart[seg])
    const a = segA[seg], b = segB[seg]
    const p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
    const d = sub(p, mean)
    raw[k * 3] = dot(d, e1)
    raw[k * 3 + 1] = dot(d, e2)
    raw[k * 3 + 2] = dot(d, e3)
    const ci = segChain[seg]
    groups[k] = chainGroups[ci]
    chainT[k] = chainLen[ci] > 0 ? (target - chainStart[ci]) / chainLen[ci] : 0
  }

  // Center on the bounding box and scale the principal axis to targetLength.
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < raw.length; i++) {
    const k = i % 3
    if (raw[i] < min[k]) min[k] = raw[i]
    if (raw[i] > max[k]) max[k] = raw[i]
  }
  const center = [0, 1, 2].map((k) => (min[k] + max[k]) / 2)
  const sc = targetLength / (max[0] - min[0] || 1)
  const positions = new Float32Array(raw.length)
  const axisT = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    for (let k = 0; k < 3; k++) positions[i * 3 + k] = (raw[i * 3 + k] - center[k]) * sc
    axisT[i] = (raw[i * 3] - min[0]) / (max[0] - min[0] || 1)
  }

  return { positions, groups, chainT, axisT }
}

function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] }
function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]] }
function scale(a, k) { return [a[0] * k, a[1] * k, a[2] * k] }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]] }
function normalize(a) { const n = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / n, a[1] / n, a[2] / n] }
function mulVec(m, v) { return m.map((row) => row[0] * v[0] + row[1] * v[1] + row[2] * v[2]) }
function quadForm(m, v) { return dot(v, mulVec(m, v)) }
function powerIteration(m, start) {
  let v = normalize(start)
  for (let i = 0; i < 100; i++) v = normalize(mulVec(m, v))
  return v
}
