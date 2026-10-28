/**
 * A few figures under a page's short intro paragraph (PageIntroBand's `after`): a big number over a small all-caps label each, for the facts a
 * visitor can take in at a glance - the counts of the lists further down the page, which the page counts itself, so they never drift from it.
 * `items`: [[number, label], ...]. On the phone they stay in ONE row, so the type steps down there (the figure to the stat-sm size, the label to
 * 12px - 11px on the narrowest screens - below the 14px of the type scale's meta role, which would not fit three labels across); from md up they are the
 * scale's stat and meta sizes and wrap onto a second row where they do not fit one.
 */
export default function IntroFacts({ items }) {
  return (
    <dl className="flex gap-x-4 pt-2 md:flex-wrap md:gap-x-10 md:gap-y-4">
      {items.map(([value, label]) => (
        <div key={label} className="flex min-w-0 flex-col-reverse">
          <dt className="mt-2 inline-flex items-center gap-1.5 type-meta uppercase tracking-[0.08em] text-navy/70 max-md:text-[12px] max-md:tracking-[0.04em] max-[360px]:!text-[11px] max-[360px]:tracking-[0.02em] md:gap-2">
            <span className="size-1.5 shrink-0 rounded-full bg-[#279aae]" />
            {label}
          </dt>
          <dd className="type-stat text-navy max-md:!text-[1.75rem] max-md:leading-[1.15]">{value}</dd>
        </div>
      ))}
    </dl>
  )
}
