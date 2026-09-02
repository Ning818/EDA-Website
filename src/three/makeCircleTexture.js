import * as THREE from 'three'

/** A soft-edged solid white circle, used as the point sprite so particles render as
 * clean dots instead of the default square points. */
export function makeCircleTexture() {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

/** Same idea as makeCircleTexture, but a hollow ring (stroked outline, transparent center)
 * instead of a filled disc - used where particles should read as an outline color rather than
 * a solid dot. The fragment shader only reads this texture's alpha channel (as a cutout mask),
 * so the stroke is drawn in white same as the solid version - the actual color still comes from
 * the per-vertex color attribute. */
export function makeRingTexture() {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const outerRadius = size / 2 - 1
  const strokeWidth = outerRadius * 0.4 // thick enough to still read at small on-screen sizes
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, outerRadius - strokeWidth / 2, 0, Math.PI * 2)
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = strokeWidth
  ctx.stroke()
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}
