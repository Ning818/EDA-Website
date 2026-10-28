// Mutable state shared between the brain's anchor (which handles drag) and the page-wide shared
// canvas (which auto-rotates it and draws it). Plain object, no React state: it changes every frame.
export const brainState = {
  yaw: 0, // model rotation about Y, radians (the brain's current displayed rotation)
  dragging: false,
}

// The stacked layout (below Tailwind's `xl`, 1280px: the phone and the tablet, where the copy and its picture do not fit side by side). On it the particle clouds are look-only: no mouse/finger tilt, no
// brain drag-to-spin, no logo hover / press / click-through. Read live (not cached) so resizing across the
// breakpoint takes effect immediately.
export const isMobileView = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 1279px)').matches

// Scroll lengths (in screens) of the home page's last stages. They are used by the page's layout (Home.jsx sizes the Industry 4.0 section from them) as well as
// by the 3D canvas, so they live here, in a small module: the page can read them without loading the canvas (and with it three.js and the models).
export const ARM_EXIT_SCREENS = 2.16 // the arm -> social1 transition (brain-style timeline: 0.72 x 300vh)
export const SOCIAL_HOLD_SCREENS = 0.6 // `social` holds this long before it morphs into `social2` (and `social2` holds after it)
