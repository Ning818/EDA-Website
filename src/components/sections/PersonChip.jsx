import { ROLES, cardName } from './peopleRoles'
import { personPage } from './peoplePages'

// A person as a small rounded tag (the Research pages' "Involved people", at every width): the name, and under it the role as a small line with a dot in the page's theme colour. The tag is only
// as wide as its name, so a group's people wrap along their row or column a few to a line. It is a link to the person's page on Politecnico's sites (in a new tab) where
// there is such a page. Hovering lights the border in the page's theme colour (`--theme`, teal without it).
export default function PersonChip({ name }) {
  const page = personPage(name)
  const Chip = page ? 'a' : 'div'
  const link = page
    ? {
        href: page.href,
        target: '_blank',
        rel: 'noopener noreferrer',
        'aria-label': `${name}, ${ROLES[name]} - ${page.kind === 'staff' ? 'page on polito.it' : 'research profile on IRIS'} (opens in a new tab)`,
      }
    : {}
  return (
    <Chip
      {...link}
      className="inline-flex flex-col rounded-2xl border border-navy/20 bg-white/65 px-3.5 py-2 transition-[border-color,background-color] duration-300 ease-out hover:border-[color:var(--theme,#279aae)] hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
    >
      <span className="type-name text-navy">{cardName(name)}</span>
      <span className="inline-flex items-center gap-1.5 type-meta text-[#5f7370]">
        <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-[color:var(--theme,#279aae)]" />
        {ROLES[name]}
      </span>
    </Chip>
  )
}
