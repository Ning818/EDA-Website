import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'

const MAX_YAW = 0.12 // radians (~7deg) at the viewport's left/right edge
const MAX_PITCH = 0.09 // radians (~5deg) at the top/bottom edge
const EASE = 14 // higher = snappier follow (less easing lag)

/**
 * Wraps a scene's content in a group that tilts slightly toward the mouse (parallax-style sway
 * from the default view) instead of offering free 3D rotation. The pointer is tracked on the whole
 * window, normalized to the viewport (-1..1), so the sway works wherever the cursor is over the
 * page, and eased so it glides rather than snaps.
 */
export default function MouseSway({ children }) {
  const group = useRef()
  const target = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const onMove = (e) => {
      target.current.x = (e.clientX / window.innerWidth) * 2 - 1
      target.current.y = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  useFrame((_, delta) => {
    const g = group.current
    if (!g) return
    const k = 1 - Math.exp(-EASE * delta)
    g.rotation.y += (target.current.x * MAX_YAW - g.rotation.y) * k
    g.rotation.x += (target.current.y * MAX_PITCH - g.rotation.x) * k
  })

  return <group ref={group}>{children}</group>
}
