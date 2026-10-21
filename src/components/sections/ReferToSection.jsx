import { ROLES } from './peopleRoles'

// One person of the "Refer to" list: a round monogram in the page's theme colour (`--theme`, teal without it) beside the name and
// the role. Same card language as the project cards above it: hovering lights the border and a soft glow under the card in the
// theme colour.
function ReferCard({ name }) {
  const words = name.split(' ')
  const initials = `${words[0][0]}${words[words.length - 1][0]}`
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-navy/15 bg-white px-5 py-4 shadow-sm transition-[border-color,box-shadow] duration-300 ease-out hover:border-[color:var(--theme,#279aae)] hover:shadow-[0_10px_28px_color-mix(in_srgb,var(--theme,#279aae)_18%,transparent)]">
      <span
        aria-hidden="true"
        className="grid size-12 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--theme,#279aae)_16%,white)] font-heading text-base font-bold tracking-wide text-[color-mix(in_srgb,var(--theme,#279aae)_70%,#002843)]"
      >
        {initials}
      </span>
      <div className="min-w-0">
        <p className="type-name text-navy">{name}</p>
        <p className="mt-1 inline-flex items-center gap-1.5 type-meta text-[#5f7370]">
          <span className="size-1.5 shrink-0 rounded-full bg-[color:var(--theme,#279aae)]" />
          {ROLES[name]}
        </p>
      </div>
    </div>
  )
}

// "Refer to" at the foot of a Funded Projects page: the people to turn to about the theme's projects. One card to a row on a
// phone, from `md` up fixed-width cards from the left. `tight`: the section follows a list that ends close above it (the Ended
// Projects), so its heading needs less room above than after a card.
export default function ReferToSection({ people, tight = false }) {
  return (
    <section className="mx-auto max-w-[1440px] px-8 lg:px-[120px]">
      <h2 className={`type-h2 text-navy ${tight ? 'pt-8' : 'pt-20'}`}>Refer to</h2>
      <div className="grid gap-4 pb-20 pt-8 md:grid-cols-[repeat(auto-fill,270px)]">
        {people.map((name) => (
          <ReferCard key={name} name={name} />
        ))}
      </div>
    </section>
  )
}
