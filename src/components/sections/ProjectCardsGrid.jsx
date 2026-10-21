// A project card: a white, thin-bordered, rounded card in the site's navy / teal. A header row (the project code, with the
// status as a small pill on the right), then the project name, with the funding source as a label / value pair at the
// right. Hovering lights the border (and a soft glow under the card) in the page's theme colour - the `--theme` variable the page sets, teal
// without it - and lifts the card.
// `status` is "<funding> · <state>", e.g. "EU Funded · Active", or just the state ("Ongoing"), in which case the funding label
// is left out. A project may have no `code` (then the header row holds only the status) or no `description`. With a `url` the whole
// card is a link to the project's website (opens in a new tab) and a small arrow after the code says so.
function ProjectCard({ code, description, status, url }) {
  const [funding, state] = status.split('·').map((part) => part.trim())
  const label = state ?? status
  const active = /active|ongoing/i.test(label)

  const Tag = url ? 'a' : 'div'
  const linkProps = url ? { href: url, target: '_blank', rel: 'noopener noreferrer' } : {}

  return (
    <Tag {...linkProps} className="group flex w-[384px] max-w-full flex-col gap-4 rounded-2xl border border-navy/15 bg-white px-6 py-5 shadow-sm transition-[border-color,box-shadow,transform] duration-300 ease-out hover:-translate-y-0.5 hover:border-[color:var(--theme,#279aae)] hover:shadow-[0_10px_28px_color-mix(in_srgb,var(--theme,#279aae)_18%,transparent)]">
      <div className="flex items-center justify-between gap-3">
        {code ? (
          <div className="flex min-w-0 items-center gap-1.5">
            <p className="min-w-0 truncate font-heading text-base font-semibold text-navy md:text-lg">{code}</p>
            {url && (
              <svg viewBox="0 0 24 24" fill="none" stroke="#279aae" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4 shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true">
                <path d="M7 17 17 7M8 7h9v9" />
              </svg>
            )}
          </div>
        ) : (
          <span />
        )}
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-navy/15 px-2.5 py-1 font-body text-xs font-medium text-navy md:px-3">
          <span className={`size-1.5 rounded-full ${active ? 'bg-[#279aae]' : 'bg-[#839794]'}`} />
          {label}
        </span>
      </div>

      {(description || (funding && state)) && (
        <div className="flex items-end justify-between gap-4">
          {description && <p className="min-w-0 font-heading text-sm font-semibold leading-snug text-navy md:text-base">{description}</p>}
          {funding && state && (
            <div className="shrink-0 text-right">
              <p className="font-body text-xs text-[#839794] md:text-sm">Funding</p>
              <p className="inline-flex items-center gap-1.5 font-heading text-sm font-semibold text-navy md:text-base">
                <svg viewBox="0 0 24 24" fill="none" stroke="#279aae" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="m8.5 12.5 2.5 2.5 4.5-5" />
                </svg>
                {funding}
              </p>
            </div>
          )}
        </div>
      )}
    </Tag>
  )
}

export default function ProjectCardsGrid({ title, projects }) {
  return (
    <section className="mx-auto max-w-[1440px] px-8 lg:px-[120px]">
      <h2 className="pt-20 font-heading text-2xl font-bold md:text-4xl text-navy">{title}</h2>
      <div className="flex flex-wrap justify-center gap-6 pb-20 pt-10 lg:justify-start">
        {projects.map((project, i) => (
          <ProjectCard key={i} {...project} />
        ))}
      </div>
    </section>
  )
}
