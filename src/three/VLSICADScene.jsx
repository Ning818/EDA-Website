import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import VLSICADParticles from './VLSICADParticles'

/**
 * Drop-in for the VLSI-CAD ParticlePlaceholder on the Home page. Unlike BrainScene, this is
 * decorative background that overflows its box (the outer div matches the placeholder's box for
 * layout purposes, so the surrounding flex row doesn't shift, while the Canvas itself is
 * oversized and centered on top of it via absolute positioning) - but it can still be dragged to
 * rotate, so (unlike a purely inert background) it needs to actually receive pointer events over
 * that oversized area, hence no pointer-events-none here.
 */
export default function VLSICADScene({ className }) {
  return (
    <div className={`${className ?? ''} relative`}>
      <div className="absolute left-1/2 top-1/2 aspect-square w-[245%] -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing">
        <Canvas camera={{ position: [0, 0, 6], fov: 45, near: 0.1, far: 100 }} gl={{ alpha: true, antialias: true }}>
          <Suspense fallback={null}>
            <VLSICADParticles />
          </Suspense>
          <OrbitControls enableZoom={false} enablePan={false} enableDamping dampingFactor={0.08} />
        </Canvas>
      </div>
    </div>
  )
}
