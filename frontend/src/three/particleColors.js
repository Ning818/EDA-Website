import * as THREE from 'three'

/**
 * Per-vertex color by nearest anchor - reproduces particle_brain_demo_logo_24.html's four-zone
 * brain coloring. `anchors` positions are fractions of `targetExtent` so the same relative
 * pattern (front-left/front-right/back-left/back-right) carries over regardless of a model's
 * actual scale.
 *
 * @param {Float32Array} positions - already centered/scaled vertex positions.
 * @param {{ pos: [number, number, number], color: THREE.Color }[]} anchors
 * @param {number} targetExtent
 */
export function colorByAnchors(positions, anchors, targetExtent) {
  const vertexCount = positions.length / 3
  const colors = new Float32Array(vertexCount * 3)
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
  }
  return colors
}

/** One flat color repeated for every vertex - for models that aren't split into zones. */
export function flatColor(vertexCount, hex) {
  const c = new THREE.Color(hex)
  const colors = new Float32Array(vertexCount * 3)
  for (let i = 0; i < vertexCount; i++) {
    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
  }
  return colors
}

/**
 * Per-vertex color by an explicit group key per point (e.g. sampleLineStrips.js's `groups`, from
 * a model split into named layers in the source app) - unlike colorByAnchors, this doesn't infer
 * the grouping from position, it just looks up whatever key each point already carries.
 *
 * @param {(string|undefined)[]} groups - per-point group key, same length/order as positions.
 * @param {Record<string, string>} colorMap - group key -> hex color.
 * @param {string} fallbackHex - color for a point whose key isn't in colorMap (including undefined).
 */
export function colorByGroup(groups, colorMap, fallbackHex) {
  const count = groups.length
  const colors = new Float32Array(count * 3)
  const cache = new Map()
  for (let i = 0; i < count; i++) {
    const key = groups[i]
    let c = cache.get(key)
    if (!c) {
      c = new THREE.Color(colorMap[key] ?? fallbackHex)
      cache.set(key, c)
    }
    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
  }
  return colors
}
