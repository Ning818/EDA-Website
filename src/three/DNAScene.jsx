import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import DNAParticles from './DNAParticles'

/**
 * Drop-in for the Bioinformatics ParticlePlaceholder on the Home page - same oversized-canvas-
 * over-a-normal-box pattern as SmartCityScene (see its own comment): the outer div matches the
 * placeholder's box for layout, the Canvas itself is oversized and centered on top via absolute
 * positioning, and pointer events reach it so it can still be dragged to rotate.
 */
export default function DNAScene({ className }) {
  return (
    <div className={`${className ?? ''} relative`}>
      <div className="absolute left-[45%] top-1/2 aspect-square w-[245%] -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing">
        <Canvas camera={{ position: [0, 0, 6], fov: 45, near: 0.1, far: 100 }} gl={{ alpha: true, antialias: true }}>
          <Suspense fallback={null}>
            <DNAParticles />
          </Suspense>
          <OrbitControls enableZoom={false} enablePan={false} enableDamping dampingFactor={0.08} />
        </Canvas>
      </div>
    </div>
  )
}
