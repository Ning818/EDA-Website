/**
 * A row of logo cards (Universities / Institutes / Companies on the Collaborations page).
 * Each card is 240x120 in Figma, with the logo image inset to 178.5x84 (centered) —
 * reproduced here as padding so logos don't render larger/more filled than the design.
 * `slots` may include empty entries (kept invisible, matching the Figma spare-slot pattern).
 *
 * Figma: on hover each card (the "Dissolve" component) reveals its name label —
 * ON_HOVER -> DISSOLVE, EASE_OUT, 0.3s, label fill opacity 0 -> 1.
 */
export default function LogoGrid({ title, logos }) {
  return (
    <section className="mx-auto max-w-[1440px] px-8 pt-10 lg:px-[120px]">
      <h2 className="pb-5 font-heading text-4xl font-bold text-navy">{title}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {logos.map((logo, i) =>
          logo ? (
            <div key={i} className="group relative flex h-[120px] items-center justify-center px-[30.75px] py-[18px]">
              <img src={logo.src} alt={logo.alt} className="h-full w-full object-contain" />
              <div
                className="pointer-events-none absolute inset-0 flex items-center justify-center bg-navy/85 p-3 text-center opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100"
                aria-hidden="true"
              >
                <span className="font-body text-sm font-medium leading-tight text-white">{logo.alt}</span>
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
