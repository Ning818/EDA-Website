// Every item takes the same room: one line for the code and two for the description, however short the description is (or
// when the project has no code or no description), so the items of the two columns stand in rows. A longer description grows.
// `language` ("it") is the language of a description that is not in English: it is written as `lang` so that a screen reader pronounces the words right.
// With a `url` the item is a link to the project's website (opens in a new tab): its code is underlined on hover and followed by a small arrow.
function ListItem({ code, description, language, url }) {
  const Tag = url ? 'a' : 'div'
  const linkProps = url ? { href: url, target: '_blank', rel: 'noopener noreferrer' } : {}
  return (
    <Tag {...linkProps} className="group block w-full border-b border-[rgba(182,176,156,0.5)] py-1">
      <p className="flex min-h-[1lh] items-center gap-1.5 type-h3 text-navy">
        <span className={url ? 'group-hover:underline group-hover:underline-offset-2' : ''}>{code}</span>
        {url && (
          <svg viewBox="0 0 24 24" fill="none" stroke="#279aae" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4 shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true">
            <path d="M7 17 17 7M8 7h9v9" />
          </svg>
        )}
      </p>
      <p lang={language ?? undefined} className="min-h-[2lh] type-compact text-[#185a7d]">{description}</p>
    </Tag>
  )
}

export default function FundedProjectsListSection({ title, items, splitAt }) {
  // two columns of about the same length, unless the caller names the breakpoint
  const at = splitAt ?? Math.ceil(items.length / 2)
  const left = items.slice(0, at)
  const right = items.slice(at)

  return (
    <section className="mx-auto max-w-[1440px] px-8 lg:px-[120px]">
      <h2 className="pt-20 type-h2 text-navy">{title}</h2>
      <div className="flex flex-col gap-x-6 gap-y-2 pb-6 pt-10 md:flex-row">
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
