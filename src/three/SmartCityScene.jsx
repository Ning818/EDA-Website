
/**
 * Drop-in for the Smart City ParticlePlaceholder on the Home page. Unlike BrainScene, this is
 * decorative background that overflows its box (the outer div matches the placeholder's box for
 * layout purposes, so the surrounding flex row doesn't shift, while the Canvas itself is
 * oversized and centered on top of it via absolute positioning). It no longer owns a canvas: it's just
 * the invisible "anchor" (data-cloud) whose on-screen box tells the page-wide ParticleCanvas where and
 * how big to draw this section's particles.
 */
export default function SmartCityScene({ className }) {
  return (
    <div className={`${className ?? ''} relative`}>
      <div data-cloud="city" className="absolute left-1/2 top-1/2 aspect-square w-[245%] -translate-x-1/2 -translate-y-1/2 pointer-events-none">
      </div>
    </div>
  )
}
