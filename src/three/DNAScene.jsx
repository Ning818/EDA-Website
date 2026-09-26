import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import MouseSway from './MouseSway'
import DNAParticles from './DNAParticles'

/**
 * Drop-in for the Bioinformatics ParticlePlaceholder on the Home page - same oversized-canvas-
 * over-a-normal-box pattern as SmartCityScene (see its own comment): the outer div matches the
 * placeholder's box for layout, the Canvas itself is oversized and centered on top via absolute
 * positioning. No drag-to-rotate: the content just sways slightly toward the mouse (MouseSway), so
 * the canvas is pointer-events-none and does not block clicks on anything it overlaps.
 */
export default function DNAScene({ className }) {
  return (
    <div className={`${className ?? ''} relative`}>
      <div className="absolute left-[45%] top-1/2 aspect-square w-[245%] -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <Canvas camera={{ position: [0, 0, 6], fov: 45, near: 0.1, far: 100 }} gl={{ alpha: true, antialias: true }}>
          <Suspense fallback={null}>
            <MouseSway>
              <DNAParticles />
            </MouseSway>
          </Suspense>
        </Canvas>
      </div>
    </div>
  )
}
