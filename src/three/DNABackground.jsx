import { Suspense, useSyncExternalStore } from 'react'
import { Canvas } from '@react-three/fiber'
import DNABackgroundParticles from './DNABackgroundParticles'

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'
const subscribe = (cb) => {
  const mq = window.matchMedia(REDUCED_MOTION)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}
const getReducedMotion = () => window.matchMedia(REDUCED_MOTION).matches

/**
 * Fixed, full-viewport DNA particle background. Sits behind the page (z-0, pointer-events-none),
 * so place content above it with `relative z-10`. The canvas is transparent - the backdrop color
 * comes from whatever is behind it (see DNABackgroundDemo's page background).
 */
export default function DNABackground({ className = '' }) {
  const reducedMotion = useSyncExternalStore(subscribe, getReducedMotion, () => false)
  return (
    <div className={`fixed inset-0 z-0 pointer-events-none ${className}`} aria-hidden="true">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, 14], fov: 45, near: 0.1, far: 100 }}
        gl={{ alpha: true, antialias: false, powerPreference: 'high-performance' }}
      >
        <Suspense fallback={null}>
          <DNABackgroundParticles reducedMotion={reducedMotion} />
        </Suspense>
      </Canvas>
    </div>
  )
}
