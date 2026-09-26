import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import MouseSway from './MouseSway'
import VLSICADParticles from './VLSICADParticles'

/**
 * Drop-in for the VLSI-CAD ParticlePlaceholder on the Home page. Unlike BrainScene, this is
 * decorative background that overflows its box (the outer div matches the placeholder's box for
 * layout purposes, so the surrounding flex row doesn't shift, while the Canvas itself is
 * oversized and centered on top of it via absolute positioning). No drag-to-rotate: the content just
 * sways slightly toward the mouse (MouseSway), so the canvas is pointer-events-none and doesn't block
 * clicks on anything it overlaps.
 */
export default function VLSICADScene({ className }) {
  return (
    <div className={`${className ?? ''} relative`}>
      <div className="absolute left-[calc(50%-57.5px)] top-1/2 aspect-square w-[245%] -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <Canvas camera={{ position: [0, 0, 6], fov: 45, near: 0.1, far: 100 }} gl={{ alpha: true, antialias: true }}>
          <Suspense fallback={null}>
            <MouseSway>
              <VLSICADParticles />
            </MouseSway>
          </Suspense>
        </Canvas>
      </div>
    </div>
  )
}
