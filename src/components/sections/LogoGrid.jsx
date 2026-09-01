/**
 * A row of logo cards (Universities / Institutes / Companies on the Collaborations page).
 * Each card is 240x120 in Figma, with the logo image inset to 178.5x84 (centered) —
 * reproduced here as padding so logos don't render larger/more filled than the design.
 * `slots` may include empty entries (kept invisible, matching the Figma spare-slot pattern).
 *
 * Figma: on hover each card (the "Dissolve" component) crossfades from the logo to a
 * name-label state — ON_HOVER -> DISSOLVE, EASE_OUT, 0.3s. Exact values read from the
 * component's Default/Variant2 fills: logo image opacity 1->0, overlay rect (solid
 * #185A7D) opacity 0->1, label text (Poppins Bold 20px, #F5F4F6, centered) opacity 0->1.
 */
export default function LogoGrid({ title, logos }) {
  return (
    <section className="mx-auto max-w-[1440px] px-8 pt-10 lg:px-[120px]">
      <h2 className="pb-5 font-heading text-4xl font-bold text-navy">{title}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {logos.map((logo, i) =>
          logo ? (
            <div key={i} className="group relative h-[120px]">
              <div className="flex h-full w-full items-center justify-center px-[30.75px] py-[18px]">
                <img
                  src={logo.src}
                  alt={logo.alt}
                  className="h-full w-full object-contain opacity-100 transition-opacity duration-300 ease-out group-hover:opacity-0"
                />
              </div>
              <div
                className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[#185a7d] p-3 text-center opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100"
                aria-hidden="true"
              >
                <span className="font-heading text-xl font-bold text-[#f5f4f6]">{logo.alt}</span>
              </div>
            </div>
          ) : (
            <div key={i} className="h-[120px]" aria-hidden="true" />
          ),
        )}
      </div>
    </section>
  )
}
