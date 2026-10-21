// The Collaborations page's joint projects: a few projects the group took part in with partners from the logo walls below, each a card with the project, its
// funding and years, who coordinated it and which other partners of the project are among the page's collaborators - all taken from the project's record (the card is a link
// to it, in a new tab). A white, thin-bordered, rounded card in the site's navy / teal; hovering lights the border.
// `projects`: [{ code, name, funding, years, coordinator, partners: [name, ...], url }].
const ARROW = (
  <svg viewBox="0 0 24 24" fill="none" stroke="#279aae" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4 shrink-0" aria-hidden="true">
    <path d="M7 17 17 7M8 7h9v9" />
  </svg>
)

function Card({ code, name, funding, years, coordinator, partners, url }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${code} (${funding}, ${years}) - its record on CORDIS`}
      className="flex flex-col gap-4 rounded-2xl border border-navy/15 bg-white/90 px-6 py-5 transition-[border-color] duration-300 ease-out hover:border-[#279aae]"
    >
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="flex items-center gap-1.5">
          <p className="whitespace-nowrap type-h3 text-navy">{code}</p>
          {ARROW}
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-navy/15 px-3 py-1 type-meta font-medium text-navy">
          <span className="size-1.5 rounded-full bg-[#279aae]" />
          {funding} · {years}
        </span>
      </div>
      <p className="type-compact font-medium text-navy">{name}</p>
      <dl className="flex flex-col gap-3 border-t border-navy/10 pt-4">
        <div>
          <dt className="type-meta uppercase tracking-[0.08em] text-navy/70">Coordinator</dt>
          <dd className="mt-1 type-compact text-navy">{coordinator}</dd>
        </div>
        <div>
          <dt className="type-meta uppercase tracking-[0.08em] text-navy/70">Other partners in this project</dt>
          <dd className="mt-1.5">
            <ul className="flex flex-wrap gap-2">
              {partners.map((partner) => (
                <li key={partner} className="rounded-full bg-[#279aae]/10 px-3 py-1 type-meta text-navy">
                  {partner}
                </li>
              ))}
            </ul>
          </dd>
        </div>
      </dl>
    </a>
  )
}

export default function JointProjects({ title, projects }) {
  return (
    // on the phone the band above already leaves 40px under its figures, so the section adds no space of its own at the top
    <section className="relative mx-auto max-w-[1440px] px-8 pt-0 md:pt-12 lg:px-[120px]">
      <h2 className="pb-7 type-h2 text-navy">{title}</h2>
      {/* two columns from md, three from xl; a card left alone in the last row of two columns stretches across both, so the row is never half empty */}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3 [&>*:last-child:nth-child(odd)]:md:col-span-2 xl:[&>*:last-child:nth-child(odd)]:col-span-1">
        {projects.map((project) => (
          <Card key={project.code} {...project} />
        ))}
      </div>
    </section>
  )
}
