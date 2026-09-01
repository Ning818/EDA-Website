/**
 * A row of logo cards (Universities / Institutes / Companies on the Collaborations page).
 * Each card is 240x120 in Figma, with the logo image inset to 178.5x84 (centered) —
 * reproduced here as padding so logos don't render larger/more filled than the design.
 * `slots` may include empty entries (kept invisible, matching the Figma spare-slot pattern).
 */
export default function LogoGrid({ title, logos }) {
  return (
    <section className="mx-auto max-w-[1440px] px-8 pt-10 lg:px-[120px]">
      <h2 className="pb-5 font-heading text-4xl font-bold text-navy">{title}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {logos.map((logo, i) =>
          logo ? (
            <div key={i} className="flex h-[120px] items-center justify-center px-[30.75px] py-[18px]">
              <img src={logo.src} alt={logo.alt} className="h-full w-full object-contain" />
            </div>
          ) : (
            <div key={i} className="h-[120px]" aria-hidden="true" />
          ),
        )}
      </div>
    </section>
  )
}
