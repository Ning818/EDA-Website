// Mutable state shared between the brain's anchor (which handles drag) and the page-wide shared
// canvas (which auto-rotates it and draws it). Plain object, no React state: it changes every frame.
export const brainState = {
  yaw: 0, // model rotation about Y, radians (the brain's current displayed rotation)
  dragging: false,
}
