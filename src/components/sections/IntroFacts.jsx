/**
 * A few figures under a page's short intro paragraph (PageIntroBand's `after`): a big number over a small all-caps label each, for the facts a
 * visitor can take in at a glance - the counts of the lists further down the page, which the page counts itself, so they never drift from it.
 * `items`: [[number, label], ...]. On the phone they stay in one row (the labels a little smaller); from md up they wrap if they must.
 */
export default function IntroFacts({ items }) {
  return (
    <dl className="flex gap-x-4 pt-2 md:flex-wrap md:gap-x-10 md:gap-y-4">
      {items.map(([value, label]) => (
        <div key={label} className="flex min-w-0 flex-col-reverse">
          <dt className="mt-2 inline-flex items-center gap-1.5 font-body text-[11px] uppercase tracking-[0.04em] text-navy/70 max-[360px]:text-[10px] max-[360px]:tracking-[0.02em] md:gap-2 md:text-sm md:tracking-[0.08em]">
            <span className="size-1.5 shrink-0 rounded-full bg-[#279aae]" />
            {label}
          </dt>
          <dd className="font-heading text-4xl font-bold leading-none tabular-nums text-navy md:text-5xl">{value}</dd>
        </div>
      ))}
    </dl>
  )
}
