
/**
 * Drop-in for the Industry 4.0 ParticlePlaceholder on the Home page. Unlike BrainScene, this is
 * decorative background that overflows its box (the outer div matches the placeholder's box for
 * layout purposes, so the surrounding flex row doesn't shift, while the Canvas itself is
 * oversized and centered on top of it via absolute positioning). It no longer owns a canvas: it's just
 * the invisible "anchor" (data-cloud) whose on-screen box tells the page-wide ParticleCanvas where and
 * how big to draw this section's particles.
 */
export default function IndustryArmScene({ className }) {
  return (
    <div className={`${className ?? ''} relative`}>
      {/* left-31.94% (30% before nudging right a bit more, per request - 36% would run past the viewport edge; originally the box-centered 45%): the box sits at the right edge of a
          max-w-[1440px] section with 120px side padding (ThemeShowcase.jsx), so on any real
          desktop viewport from the lg breakpoint (1024px) up to 1440px the box's own right edge
          is a constant 120px from the viewport edge - verified via the particle cloud's actual
          NDC screen extent (not just this oversized canvas's own bounding box, which is mostly
          transparent) that at 45% the model's right side ran ~40-80px past the viewport edge;
          30% pulls it back to a roughly constant ~25-40px margin across that whole range, without
          pushing its left side (the claw) into the text links to its left. top-[calc(50%+20px)]:
          nudged 10px down from box-center, then another 10px the same way, per request. */}
      <div data-cloud="arm" className="phone-cloud absolute left-[calc(31.94%+20px)] top-[calc(50%+20px)] aspect-square w-[245%] -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ '--fw': 0.574, '--fh': 0.479, '--fx': 0.07, '--fy': -0.021 }}>
      </div>
    </div>
  )
}
