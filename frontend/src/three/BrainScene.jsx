import { useRef } from 'react'
import { brainState, isMobileView } from './cloudState'

/**
 * Drop-in for ParticlePlaceholder in the Hero section. It no longer owns a canvas: it's the brain's
 * "anchor" (data-cloud="brain") - the box whose on-screen position/size tells the page-wide
 * ParticleCanvas where to draw the brain - and it handles the horizontal drag-to-spin gesture
 * (dragging just turns brainState.yaw; ParticleCanvas auto-rotates it slowly and draws it).
 */
export default function BrainScene({ className }) {
  const last = useRef(0)
  return (
    <div
      data-cloud="brain"
      // Drag-to-spin is a desktop interaction; on the phone layout the brain is look-only (the page just scrolls).
      className={`${className ?? ''} xl:cursor-grab xl:active:cursor-grabbing xl:[touch-action:pan-y]`}
      onPointerDown={(e) => {
        if (isMobileView()) return
        brainState.dragging = true
        last.current = e.clientX
        e.currentTarget.setPointerCapture(e.pointerId)
      }}
      onPointerMove={(e) => {
        if (isMobileView() || !brainState.dragging) return
        const dx = e.clientX - last.current
        last.current = e.clientX
        // Same feel as OrbitControls' rotate: a full canvas height of drag is one full turn.
        brainState.yaw += (2 * Math.PI * dx) / e.currentTarget.clientHeight
      }}
      onPointerUp={() => { brainState.dragging = false }}
      onPointerCancel={() => { brainState.dragging = false }}
    />
  )
}
