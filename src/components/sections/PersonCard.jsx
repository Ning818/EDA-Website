import { ROLES } from './peopleRoles'

// A small person card: the name at the top (it wraps as it needs), the role pinned to the bottom as a small line with a teal
// dot, so the role sits at the same height on every card of a row whether the name takes one line or two. On a phone the card has
// no minimum height and the role sits right under the name (not pinned to the bottom): the two lines of a card stay close
// together, whatever the neighbour's name does. Hovering lights the border in the page's theme colour (`--theme`, teal without it).
export default function PersonCard({ name }) {
  return (
    <div className="flex min-h-[84px] w-full flex-col justify-between gap-2 max-md:min-h-0 max-md:justify-start max-md:gap-1.5 rounded-2xl border border-navy/15 bg-white px-3 py-3 md:px-4 transition-[border-color] duration-300 ease-out hover:border-[color:var(--theme,#279aae)]">
      <p className="type-name text-navy">{name}</p>
      <p className="inline-flex items-center gap-1.5 type-meta text-[#5f7370]">
        <span className="size-1.5 shrink-0 rounded-full bg-[#279aae]" />
        {ROLES[name]}
      </p>
    </div>
  )
}
