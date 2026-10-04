
/**
 * Drop-in for the Bioinformatics ParticlePlaceholder on the Home page - same oversized-canvas-
 * over-a-normal-box pattern as SmartCityScene (see its own comment): the outer div matches the
 * placeholder's box for layout, the Canvas itself is oversized and centered on top via absolute
 * positioning. It no longer owns a canvas: it's just the invisible "anchor" (data-cloud) whose
 * on-screen box tells the page-wide ParticleCanvas where and how big to draw this section's particles.
 */
export default function DNAScene({ className }) {
  return (
    <div className={`${className ?? ''} relative`}>
      <div data-cloud="dna" className="phone-cloud absolute left-[45%] top-1/2 aspect-square w-[245%] -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ '--fw': 0.683, '--fh': 0.667, '--fx': 0, '--fy': -0.02 }}>
      </div>
    </div>
  )
}
