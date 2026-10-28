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
