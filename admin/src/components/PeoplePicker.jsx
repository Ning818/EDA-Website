import { useId, useMemo, useState } from 'react'
import { Button, TextField } from './ui'

// capitals and accents do not matter when looking for a name
const plain = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/**
 * Chooses people from the People list and puts them in order: the ones chosen, each with buttons to move it up or down and to take it out, and a search that adds more. `people` is the whole
 * list (as GET /api/people gives it), `value` the addresses of those chosen in their order, `onChange(list)` is told every change. `exclude(person)` names those that may not be chosen (they are
 * not offered, and `why` says so). `level` is the heading level of its two parts: one below the heading of what it is in. A change is said in words (a polite status), so that nobody has to see the list to know what happened.
 */
export default function PeoplePicker({ people, value, onChange, max, exclude = () => false, why = '', level = 3 }) {
  const Heading = `h${level}`
  const [query, setQuery] = useState('')
  const [said, setSaid] = useState('')
  const id = useId()
  const byAddress = useMemo(() => new Map(people.map((person) => [person.slug, person])), [people])
  const chosen = value.map((slug) => byAddress.get(slug)).filter(Boolean)

  const offered = useMemo(() => {
    const wanted = plain(query.trim())
    return people.filter((person) => !value.includes(person.slug) && !exclude(person) && (!wanted || plain(`${person.name} ${person.card_name ?? ''}`).includes(wanted)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [people, value, query])

  const full = max !== undefined && value.length >= max
  const change = (list, message) => {
    onChange(list)
    setSaid(message)
  }
  const move = (index, by) => {
    const next = [...value]
    const other = index + by
    if (other < 0 || other >= next.length) return
    ;[next[index], next[other]] = [next[other], next[index]]
    change(next, `${byAddress.get(value[index])?.name} is now number ${other + 1} of ${next.length}.`)
  }

  return (
    <div className="stack-lg">
      <section aria-labelledby={`${id}-chosen`} className="stack">
        <Heading id={`${id}-chosen`} className="status-ongoing">
          Chosen ({chosen.length})
        </Heading>
        {chosen.length === 0 ? (
          <p className="muted">No one is chosen.</p>
        ) : (
          <ol className="plain-list people-list">
            {chosen.map((person, index) => (
              <li key={person.slug} className="picker-row">
                <span className="picker-name">
                  <span className="person-name">{person.name}</span> <span className="muted">{person.title}</span>
                </span>
                <span className="row">
                  <Button aria-disabled={index === 0 ? 'true' : undefined} onClick={() => index > 0 && move(index, -1)}>
                    Move up{' '}<span className="visually-hidden">{person.name}</span>
                  </Button>
                  <Button aria-disabled={index === chosen.length - 1 ? 'true' : undefined} onClick={() => index < chosen.length - 1 && move(index, 1)}>
                    Move down{' '}<span className="visually-hidden">{person.name}</span>
                  </Button>
                  <Button
                    onClick={() =>
                      change(
                        value.filter((slug) => slug !== person.slug),
                        `${person.name} was taken out.`,
                      )
                    }
                  >
                    Take out{' '}<span className="visually-hidden">{person.name}</span>
                  </Button>
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section aria-labelledby={`${id}-add`} className="stack">
        <Heading id={`${id}-add`} className="status-ongoing">
          Add people
        </Heading>
        {why && <p className="muted">{why}</p>}
        {full ? (
          <p className="muted">There can be at most {max}; take someone out to add another.</p>
        ) : (
          <>
            <TextField id={`${id}-search`} label="Search the People list by name" type="search" value={query} onChange={(event) => setQuery(event.target.value)} autoComplete="off" />
            {offered.length === 0 ? (
              <p className="muted">{query.trim() ? 'No one matches that name.' : 'Everyone who can be chosen is chosen.'}</p>
            ) : (
              <ul className="plain-list people-list picker-offered">
                {offered.slice(0, 30).map((person) => (
                  <li key={person.slug} className="picker-row">
                    <span className="picker-name">
                      <span className="person-name">{person.name}</span> <span className="muted">{person.title}</span>
                    </span>
                    <Button
                      onClick={() =>
                        change(
                          [...value, person.slug],
                          `${person.name} was added, as number ${value.length + 1}.`,
                        )
                      }
                    >
                      Add{' '}<span className="visually-hidden">{person.name}</span>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {offered.length > 30 && <p className="muted">The first 30 of {offered.length} are shown. Search to narrow the list.</p>}
          </>
        )}
      </section>
      <p role="status" className="visually-hidden">
        {said}
      </p>
    </div>
  )
}
