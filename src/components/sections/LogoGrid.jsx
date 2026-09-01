/**
 * A row of logo cards (Universities / Institutes / Companies on the Collaborations page).
 * `slots` may include empty entries (kept invisible, matching the Figma spare-slot pattern).
 */
export default function LogoGrid({ title, logos }) {
  return (
    <section className="mx-auto max-w-[1440px] px-8 pt-10 lg:px-[120px]">
      <h2 className="pb-5 font-heading text-4xl font-bold text-navy">{title}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {logos.map((logo, i) =>
          logo ? (
            <img key={i} src={logo.src} alt={logo.alt} className="h-[120px] w-full object-contain" />
          ) : (
            <div key={i} className="h-[120px]" aria-hidden="true" />
          ),
        )}
      </div>
    </section>
  )
}
