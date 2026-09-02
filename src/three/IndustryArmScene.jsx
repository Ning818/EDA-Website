import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import IndustryArmParticles from './IndustryArmParticles'

/**
 * Drop-in for the Industry 4.0 ParticlePlaceholder on the Home page. Unlike BrainScene, this is
 * purely decorative background: the outer div matches the placeholder's box for layout purposes
 * (so the surrounding flex row doesn't shift), but the Canvas itself is oversized and centered
 * on top of it via absolute positioning, so it can overflow the box while staying centered on
 * the same point as the original placeholder.
 */
export default function IndustryArmScene({ className }) {
  return (
    <div className={`${className ?? ''} relative`}>
      <div className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[350%] -translate-x-1/2 -translate-y-1/2">
        <Canvas camera={{ position: [0, 0, 6], fov: 45, near: 0.1, far: 100 }} gl={{ alpha: true, antialias: true }}>
          <Suspense fallback={null}>
            <IndustryArmParticles />
          </Suspense>
        </Canvas>
      </div>
    </div>
  )
}
