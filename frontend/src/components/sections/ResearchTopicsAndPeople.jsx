// The Research page's list of research areas: each with its title, its research topics (numbered) and, beside them, the people involved. `groups`: the theme's `topic_groups` as the API
// gives them (backend/): [{ title, topics: [text], people: [person] }], the people already in the order the page shows them (by rank).
import PersonCard from './PersonCard'
import PersonChip from './PersonChip'

export default function ResearchTopicsAndPeople({ groups }) {
  return (
    <section className="mx-auto max-w-[1440px] px-8 py-10 lg:px-[120px]">
      <h2 className="py-2 type-h2 text-navy">Research Topics</h2>
      {groups.map(({ title, topics, people }) => (
        // From `xl` a group is two columns, the people in the last 37% of the width: the title and the topics on the left, "Involved people" and the people on the right, both starting at
        // the top of the group - so when the title takes two lines "Involved people" stands level with its first line. Below that everything is one column: title, topics,
        // "Involved people", then its people.
        <div key={title} className="py-8 xl:grid xl:grid-cols-[minmax(0,1fr)_37%] xl:gap-x-10">
          <div className="xl:min-w-0">
            <h3 className="border-b border-[rgba(182,176,156,0.5)] pb-2 type-h3 text-navy">{title}</h3>
            {/* numbered from 1 in every group (the number is drawn, not the list's own, which the list style would take away); it makes a topic's row a little fuller */}
            <ol>
              {topics.map((topic, i) => (
                <li key={topic} className="flex gap-4 border-b border-[rgba(182,176,156,0.5)] py-2 type-body text-navy">
                  <span aria-hidden="true" className="w-6 shrink-0 tabular-nums text-teal-text">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span>{topic}</span>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h4 className="pb-3 pt-6 type-h3 text-navy xl:pb-4 xl:pt-0">Involved people</h4>
            {/* a group's people: on a phone as cards, two to a row across the width (PersonCard); from `md` up as two-line tags (PersonChip: the name, the role under it), only as wide as
                their names and as high as their own two lines, wrapping along the row (`items-start` keeps a tag from being stretched to the height of its row) */}
            <div className="grid grid-cols-2 gap-4 md:hidden">
              {people.map((person) => (
                <PersonCard key={person.slug} person={person} />
              ))}
            </div>
            <div className="hidden flex-wrap content-start items-start gap-3 md:flex">
              {people.map((person) => (
                <PersonChip key={person.slug} person={person} />
              ))}
            </div>
          </div>
        </div>
      ))}
    </section>
  )
}
