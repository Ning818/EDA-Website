/**
 * One-to-one matching between a bigger point cloud A and a smaller one B (both flat xyz arrays in a
 * common frame), by recursive median splits: both sets are cut along their widest axis at
 * matching proportions, so points in the same region of A end up paired with points in the same
 * region of B and the morph moves coherently instead of criss-crossing.
 *
 * Every B point gets exactly one A partner (`keep`). A's leftover points - A has more - all get the
 * same target as the B point in their final group and are flagged `extra` (they slide onto that
 * point and fade out).
 *
 * @returns {{ target: Int32Array, extra: Uint8Array }} per A point: index of the B point it moves
 *   to, and whether it's one of the surplus points that should disappear at the end.
 */
export function matchClouds(A, B) {
  const nA = A.length / 3, nB = B.length / 3
  if (nA < nB) throw new Error('matchClouds: A must have at least as many points as B')
  const target = new Int32Array(nA)
  const extra = new Uint8Array(nA)

  function extent(ia, ib) {
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity]
    for (const [P, ids] of [[A, ia], [B, ib]]) {
      for (const i of ids) for (let k = 0; k < 3; k++) {
        const v = P[i * 3 + k]
        if (v < lo[k]) lo[k] = v
        if (v > hi[k]) hi[k] = v
      }
    }
    const span = [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]]
    return span[0] >= span[1] && span[0] >= span[2] ? 0 : span[1] >= span[2] ? 1 : 2
  }

  function recurse(ia, ib) {
    if (ib.length === 1) {
      const j = ib[0]
      let best = ia[0], bd = Infinity
      for (const i of ia) {
        const d = (A[i * 3] - B[j * 3]) ** 2 + (A[i * 3 + 1] - B[j * 3 + 1]) ** 2 + (A[i * 3 + 2] - B[j * 3 + 2]) ** 2
        if (d < bd) { bd = d; best = i }
      }
      for (const i of ia) { target[i] = j; extra[i] = i === best ? 0 : 1 }
      return
    }
    const axis = extent(ia, ib)
    const sa = [...ia].sort((p, q) => A[p * 3 + axis] - A[q * 3 + axis])
    const sb = [...ib].sort((p, q) => B[p * 3 + axis] - B[q * 3 + axis])
    const mb = sb.length >> 1
    // Each A half gets at least as many points as its B half needs.
    const ma = Math.min(sa.length - (sb.length - mb), Math.max(mb, Math.round((sa.length * mb) / sb.length)))
    recurse(sa.slice(0, ma), sb.slice(0, mb))
    recurse(sa.slice(ma), sb.slice(mb))
  }

  recurse(Array.from({ length: nA }, (_, i) => i), Array.from({ length: nB }, (_, i) => i))
  return { target, extra }
}
