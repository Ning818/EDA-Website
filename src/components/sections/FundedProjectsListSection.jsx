function ListItem({ code, description }) {
  return (
    <div className="w-full border-b border-[rgba(182,176,156,0.5)] py-1">
      <p className="font-body text-lg font-bold text-navy">{code}</p>
      <p className="font-body text-base text-[#185a7d]">{description}</p>
    </div>
  )
}

export default function FundedProjectsListSection({ title, items, splitAt }) {
  // Figma's source list isn't split evenly (6 left / 10 right) — default to an
  // even split only when the caller doesn't specify the real breakpoint.
  const at = splitAt ?? Math.ceil(items.length / 2)
  const left = items.slice(0, at)
  const right = items.slice(at)

  return (
    <section className="mx-auto max-w-[1440px] px-8 pb-20 pt-10 lg:px-[120px]">
      <h2 className="border-b border-[rgba(0,40,75,0.15)] py-2 font-heading text-4xl font-bold text-navy">{title}</h2>
      <div className="mt-4 flex flex-col gap-x-6 gap-y-2 md:flex-row">
        <div className="flex-1">
          {left.map((item, i) => (
            <ListItem key={i} {...item} />
          ))}
        </div>
        <div className="flex-1">
          {right.map((item, i) => (
            <ListItem key={i} {...item} />
          ))}
        </div>
      </div>
    </section>
  )
}
