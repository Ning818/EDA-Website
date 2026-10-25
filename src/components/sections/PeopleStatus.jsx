// What the People page shows in the place of its cards while the people are on their way, and when a group has nobody yet (the failure case is LoadError, ui/LoadStatus.jsx).
// They fill the same space as the card grid (ProfessorGrid), so the page does not jump when the cards arrive.

export const PEOPLE_AREA = 'w-full flex-1 lg:w-auto lg:self-start'

/** Cards of the grid's size with their photo, name and role still blank, softly pulsing (not for a visitor who asked for less motion). The screen reader is told by the page. */
export function PeopleSkeleton({ count = 6 }) {
  return (
    <div aria-hidden="true" className={`grid ${PEOPLE_AREA} grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5`}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="h-[304px] w-full overflow-hidden rounded-xl border border-navy/10 bg-white">
          <div className="h-[216px] bg-[radial-gradient(circle_at_50%_38%,#dcedee,#eef8f3_75%)] motion-safe:animate-pulse" />
          <div className="flex h-[88px] flex-col justify-center gap-2.5 border-t border-navy/10 px-4">
            <div className="h-4 w-3/5 rounded bg-navy/10 motion-safe:animate-pulse" />
            <div className="h-3 w-2/5 rounded bg-navy/10 motion-safe:animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** A group with nobody in it (yet). */
export function PeopleEmpty() {
  return (
    <div className={`${PEOPLE_AREA} rounded-xl border border-navy/10 bg-white p-8`}>
      <p className="type-body text-navy">There is nobody to show in this group yet.</p>
    </div>
  )
}
