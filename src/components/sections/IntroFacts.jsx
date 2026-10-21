/**
 * A few figures under a page's short intro paragraph (PageIntroBand's `after`): a big number over a small all-caps label each, for the facts a
 * visitor can take in at a glance - the counts of the lists further down the page, which the page counts itself, so they never drift from it.
 * `items`: [[number, label], ...]. They wrap onto a second row where they do not fit one.
 */
export default function IntroFacts({ items }) {
  return (
    <dl className="flex flex-wrap gap-x-8 gap-y-4 pt-2 md:gap-x-10">
      {items.map(([value, label]) => (
        <div key={label} className="flex min-w-0 flex-col-reverse">
          <dt className="mt-2 inline-flex items-center gap-1.5 type-meta uppercase tracking-[0.08em] text-navy/70 md:gap-2">
            <span className="size-1.5 shrink-0 rounded-full bg-[#279aae]" />
            {label}
          </dt>
          <dd className="type-stat text-navy">{value}</dd>
        </div>
      ))}
    </dl>
  )
}
