import { ROLES, cardName } from './peopleRoles'
import { personPage } from './peoplePages'

// A person's card for a phone (the Research pages' "Involved people"; from `md` up the people are PersonChip tags): as wide as its grid column - two to a row - with the name
// at the top (it wraps as it needs) and the role pinned to the bottom as a small line with a dot in the page's theme colour, so the role sits at the same height on every card of a row whether the
// name takes one line or two: the cards of a row are as high as the tallest of them, and each one's role is at its own bottom edge. Hovering lights the border in the
// page's theme colour (`--theme`, teal without it). The card is a link to the person's page on Politecnico's sites (in a new tab), with a small arrow in its corner to say so,
// where there is such a page.
export default function PersonCard({ name }) {
  const page = personPage(name)
  const Card = page ? 'a' : 'div'
  const link = page
    ? {
        href: page.href,
        target: '_blank',
        rel: 'noopener noreferrer',
        'aria-label': `${name}, ${ROLES[name]} - ${page.kind === 'staff' ? 'page on polito.it' : 'research profile on IRIS'} (opens in a new tab)`,
      }
    : {}
  return (
    <Card
      {...link}
      className="relative flex w-full flex-col justify-between gap-1.5 rounded-2xl border border-navy/15 bg-white px-3 py-3 transition-[border-color] duration-300 ease-out hover:border-[color:var(--theme,#279aae)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
    >
      <p className={`type-name text-navy ${page ? 'pr-4' : ''}`}>{cardName(name)}</p>
      <p className="inline-flex items-center gap-1.5 type-meta text-[#5f7370]">
        <span className="size-1.5 shrink-0 rounded-full bg-[color:var(--theme,#279aae)]" />
        {ROLES[name]}
      </p>
      {page && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute right-2.5 top-3.5 size-4 text-navy/60" aria-hidden="true">
          <path d="M7 17 17 7M8 7h9v9" />
        </svg>
      )}
    </Card>
  )
}
