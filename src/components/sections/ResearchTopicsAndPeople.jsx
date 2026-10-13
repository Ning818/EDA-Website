// The topics and the people come from src/content (research.js, people.js); the page passes them in.
export default function ResearchTopicsAndPeople({ topics, people }) {
  return (
    <section className="mx-auto max-w-[1440px] px-8 py-10 lg:px-[120px]">
      <div className="flex flex-col gap-10 lg:flex-row">
        <div className="flex-1">
          <h2 className="border-b border-[rgba(0,40,75,0.15)] py-2 font-heading text-2xl font-bold text-navy md:text-4xl">Research Topics</h2>
          <ul>
            {topics.map((topic) => (
              <li key={topic} className="border-b border-[rgba(182,176,156,0.5)] py-2 font-heading text-base text-navy md:text-xl">
                {topic}
              </li>
            ))}
          </ul>
        </div>

        <div className="w-full lg:w-[352px] lg:shrink-0">
          <h2 className="pb-4 pt-2 font-heading text-2xl font-bold text-navy md:text-[32px]">Involved people</h2>
          {/* always two cards to a row on a phone, as many as fit from `md` up (cards are at least 150px wide); in the 352px desktop column, two of 168px */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-[repeat(auto-fill,minmax(150px,1fr))]">
            {people.map((person, i) => (
              // Name at the top (up to two lines), role pinned to the bottom as a small all-caps line with a teal dot, so the
              // role sits at the same height on every card of a row whether the name takes one line or two. On a phone the
              // cards have no minimum height and the role sits right under the name (not pinned to the bottom): the two lines of a
              // card stay close together, whatever the neighbour's name does.
              <div key={`${person.name}-${i}`} className="flex min-h-[84px] w-full flex-col justify-between gap-2 max-md:min-h-0 max-md:justify-start max-md:gap-1.5 rounded-2xl border border-navy/15 bg-white px-3 py-3 md:px-4 transition-[border-color] duration-300 ease-out hover:border-[color:var(--theme,#279aae)]">
                <p className="font-heading text-sm font-semibold leading-snug text-navy md:text-[15px]">{person.name}</p>
                <p className="inline-flex items-center gap-1.5 font-body text-[11px] uppercase tracking-[0.06em] text-[#839794] md:text-xs">
                  <span className="size-1.5 shrink-0 rounded-full bg-[#279aae]" />
                  {person.title}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
