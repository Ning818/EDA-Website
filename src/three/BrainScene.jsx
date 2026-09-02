import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import BrainParticles from './BrainParticles'

/**
 * Drop-in replacement for ParticlePlaceholder in the Hero section: a Canvas sized to fill its
 * parent, hosting the static brain particle cloud. Transparent background so the page's own
 * background shows through instead of a solid canvas rectangle.
 *
 * Slowly auto-rotates around the vertical axis, and can be dragged to spin it manually -
 * polar angle is locked so drag only ever turns it horizontally, never tips it up/down.
 */
export default function BrainScene({ className }) {
  return (
    <div className={`${className ?? ''} cursor-grab active:cursor-grabbing`}>
      <Canvas camera={{ position: [0, 0, 6], fov: 45, near: 0.1, far: 100 }} gl={{ alpha: true, antialias: true }}>
        <Suspense fallback={null}>
          <BrainParticles />
        </Suspense>
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          minPolarAngle={Math.PI / 2}
          maxPolarAngle={Math.PI / 2}
          autoRotate
          autoRotateSpeed={0.6}
        />
      </Canvas>
    </div>
  )
}
