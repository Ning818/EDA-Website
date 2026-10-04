// Mutable state shared between the brain's anchor (which handles drag) and the page-wide shared
// canvas (which auto-rotates it and draws it). Plain object, no React state: it changes every frame.
export const brainState = {
  yaw: 0, // model rotation about Y, radians (the brain's current displayed rotation)
  dragging: false,
}

// The phone layout (below Tailwind's `md`, 768px). On it the particle clouds are look-only: no mouse/finger tilt, no
// brain drag-to-spin, no logo hover / press / click-through. Read live (not cached) so resizing across the
// breakpoint takes effect immediately.
export const isMobileView = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
