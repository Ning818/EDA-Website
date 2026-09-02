import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import BrainParticles from './BrainParticles'

/**
 * Drop-in replacement for ParticlePlaceholder in the Hero section: a Canvas sized to fill its
 * parent, hosting the static brain particle cloud. Transparent background so the page's own
 * background shows through instead of a solid canvas rectangle.
 */
export default function BrainScene({ className }) {
  return (
    <div className={className}>
      <Canvas camera={{ position: [0, 0, 6], fov: 45, near: 0.1, far: 100 }} gl={{ alpha: true, antialias: true }}>
        <Suspense fallback={null}>
          <BrainParticles />
        </Suspense>
      </Canvas>
    </div>
  )
}
