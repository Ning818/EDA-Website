/**
 * A row of logo cards (Universities / Institutes / Companies on the Collaborations page).
 * Each card is 240x120 in Figma, with the logo image inset to 178.5x84 (centered) —
 * reproduced here as padding so logos don't render larger/more filled than the design.
 * `slots` may include empty entries (kept invisible, matching the Figma spare-slot pattern). They only exist to fill out the five-column row
 * of the desktop layout, so below `lg` they are not rendered - there they would only add empty rows under the last logos.
 *
 * Figma: on hover each card (the "Dissolve" component) crossfades from the logo to a
 * name-label state — ON_HOVER -> DISSOLVE, EASE_OUT, 0.3s. Exact values read from the
 * component's Default/Variant2 fills: logo image opacity 1->0, overlay rect (solid
 * #185A7D) opacity 0->1, label text (Poppins Bold 20px, #F5F4F6, centered) opacity 0->1.
 *
 * `tone`: 'flat' (the original: logos straight on the page), 'dark' or 'light' - plates, for a dark or a light page.
 *
 * 'dark': for a dark page. The logos are drawn for a light ground (several have the site's mint as their own opaque background), so
 * each one sits on a plate of that same mint - a flat plate so the opaque ones show no seam - lifted off the dark page: a hairline
 * border, a highlight along its top edge and a soft shadow under it; hovering lights the border in teal before the
 * name label comes up.
 *
 * A logo with a `url` is a link to the organisation's own website, opened in a new tab.
 */
// The card's element and its props: a link where the logo has a website, else a plain box.
const cardOf = (logo) =>
  logo.url
    ? ['a', { href: logo.url, target: '_blank', rel: 'noopener noreferrer', 'aria-label': `${logo.alt} - website (opens in a new tab)` }]
    : ['div', {}]

export default function LogoGrid({ title, logos, tone = 'flat' }) {
  if (tone === 'dark' || tone === 'light') {
    const dark = tone === 'dark'
    return (
      <section className="relative mx-auto max-w-[1440px] px-8 pt-12 lg:px-[120px]">
        <h2 className={`pb-7 type-h2 ${dark ? 'text-white' : 'text-navy'}`}>{title}</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {logos.map((logo, i) => {
            if (!logo) return <div key={i} className="hidden h-[120px] lg:block" aria-hidden="true" />
            const [Card, link] = cardOf(logo)
            return (
              <Card
                key={i}
                {...link}
                className={`group relative block h-[120px] overflow-hidden rounded-xl border bg-[#eef8f3] transition-[border-color,box-shadow] duration-300 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy ${
                  dark
                    ? 'border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_12px_28px_-14px_rgba(0,0,0,0.7)] hover:border-[#3fb0b8]/80 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_0_0_1px_rgba(63,176,184,0.35),0_16px_36px_-10px_rgba(63,176,184,0.45)]'
                    : 'border-navy/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_6px_18px_-10px_rgba(0,40,67,0.28)]'
                }`}
              >
                <div className="flex h-full w-full items-center justify-center px-[30.75px] py-[18px]">
                  <img src={logo.src} alt={logo.alt} className="h-full w-full object-contain opacity-100 transition-opacity duration-300 ease-out group-hover:opacity-0" />
                </div>
                {/* a soft sheen across the top of the plate */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/50 to-transparent transition-opacity duration-300 group-hover:opacity-0" aria-hidden="true" />
                <div
                  className="pointer-events-none absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#1d6a91] to-[#124a68] p-3 text-center opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100"
                  aria-hidden="true"
                >
                  <span className="type-compact font-semibold text-[#f5f4f6]">{logo.alt}</span>
                </div>
              </Card>
            )
          })}
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-[1440px] px-8 pt-10 lg:px-[120px]">
      <h2 className="pb-5 type-h2 text-navy">{title}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {logos.map((logo, i) => {
          if (!logo) return <div key={i} className="hidden h-[120px] lg:block" aria-hidden="true" />
          const [Card, link] = cardOf(logo)
          return (
            <Card key={i} {...link} className="group relative block h-[120px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy">
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
                <span className="type-compact font-semibold text-[#f5f4f6]">{logo.alt}</span>
              </div>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
