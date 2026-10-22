import { useEffect, useId, useRef, useState } from 'react'

/**
 * Hovering a professor card triggers a spring animation (~0.744s) from the front state (photo +
 * 88px name/role strip) to a "back" state where the info panel expands to fill the whole card,
 * the photo fades out and the name moves up to the top.
 *
 * The back state also lists the person's contact links under their name when the person has a `links` entry: each one is
 * named for where it goes (Polito profile, Department page, ORCID profile, LinkedIn, Publications - IRIS, the polito.it
 * publications repository) rather than showing its address, and its accessible name carries the person's name. The Figma
 * placeholder used one person's links on every card, so only people with real data of their own get this block.
 *
 * Keyboard and screen readers: the contact links sit behind a "View contact links" button (`aria-expanded`) that is only seen while it has the focus.
 * The links are not in the tab order until they are shown (hovered, tapped or opened by that button), so the focus is never on something invisible;
 * Esc folds them again and gives the focus back to the button.
 *
 * The flip is the `card-open:` variant (index.css): the hover on a desktop (hover-capable pointer, md and up), a tap on
 * the phone layout / touch devices - there a tap slides the panel up, another tap folds it back down, and a tap on one
 * of the links inside follows the link as usual.
 */
const LINK_ROWS = [
  ['polito', 'Polito profile'],
  ['dept', 'Department page'],
  ['orcid', 'ORCID profile'],
  ['linkedin', 'LinkedIn'],
  ['iris', 'Publications (IRIS)'],
]

const SPRING = 'ease-[cubic-bezier(0.34,1.56,0.64,1)]'

// Same condition as the `card-open` hover branch in index.css: where it holds the card flips on hover, elsewhere on tap.
const HOVER_FLIPS = '(hover: hover) and (min-width: 768px)'

// `open`: opened by a tap or by the "View contact links" button; `hover`: the mouse is over the card (where hovering flips it). The links are
// reachable by the keyboard and the pointer while either holds.
function useFlip() {
  const [open, setOpen] = useState(false)
  const [hover, setHover] = useState(false)
  const flips = () => window.matchMedia(HOVER_FLIPS).matches
  return {
    open,
    setOpen,
    shown: open || hover,
    props: {
      'data-open': open ? '' : undefined,
      onClick: (e) => {
        if (flips() || e.target.closest('a, button')) return
        setOpen((o) => !o)
      },
      onPointerEnter: (e) => e.pointerType === 'mouse' && flips() && setHover(true),
      onPointerLeave: () => setHover(false),
      // the focus leaving the card folds what the keyboard opened
      onBlur: (e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false),
    },
  }
}

// The first letters of the first and the last word of the name.
const initials = (name) => {
  const words = name.split(' ')
  return `${words[0][0]}${words[words.length - 1][0]}`
}

const GLOW = 'hover:border-[#3fb0b8] hover:shadow-[0_8px_28px_rgba(63,176,184,0.25)] data-[open]:border-[#3fb0b8] data-[open]:shadow-[0_8px_28px_rgba(63,176,184,0.25)]'

function ProfessorCard({ photo, name, title, links }) {
  const flip = useFlip()
  const rows = LINK_ROWS.filter(([key]) => links?.[key])
  const listId = useId()
  const cardRef = useRef(null)
  const focusFirst = useRef(false)
  // The button opens the links and moves the focus to the first of them (they come before the button in the page, so the next Tab would otherwise skip them).
  const toggle = (e) => {
    focusFirst.current = !flip.open
    flip.setOpen((o) => !o)
    e.stopPropagation()
  }
  useEffect(() => {
    if (flip.open && focusFirst.current) cardRef.current?.querySelector('ul a')?.focus()
    focusFirst.current = false
  }, [flip.open])
  // A white card with a hairline border: the photo, a name strip under it with the role as a small
  // mono line. Hovering (or a tap) lights the border in teal with a soft glow, and the strip
  // rises to fill the card - turning navy, the photo fading away - with the name moving up to the top and the links listed under it.
  return (
    <div ref={cardRef} {...flip.props} onKeyDown={(e) => e.key === 'Escape' && flip.open && (flip.setOpen(false), e.currentTarget.querySelector('[data-contact-toggle]')?.focus())} className={`group relative h-[304px] w-full overflow-hidden rounded-xl border border-navy/10 bg-white transition-[border-color,box-shadow] duration-300 ${GLOW}`}>
      <div className={`absolute inset-x-0 top-0 h-[224px] transition-opacity duration-[744ms] ${SPRING} card-open:opacity-0`}>
        {photo ? (
          <img src={photo} alt={name} className="h-full w-full object-cover" />
        ) : (
          // no photo: the person's initials on a soft teal ground
          <div aria-hidden="true" className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_50%_38%,#cfeaec,#eef8f3_75%)]">
            <span className="font-heading text-6xl font-bold tracking-wide text-[#3fb0b8]/55">{initials(name)}</span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white to-transparent" />
      </div>
      <div
        className={`absolute inset-x-0 bottom-0 h-[88px] border-t border-navy/10 bg-white transition-[height,background-color] duration-[744ms] ${SPRING} card-open:h-full card-open:border-transparent card-open:bg-navy`}
      />
      {/* centred in the 88px strip (its middle is 260px down) whether the name takes one line or two; moves to the top when open */}
      <div className="absolute inset-x-4 top-[260px] flex -translate-y-1/2 flex-col transition-[top,translate] duration-[744ms] ease-[cubic-bezier(0.34,1.3,0.64,1)] card-open:top-5 card-open:translate-y-0">
        <p className={`type-name text-navy transition-colors duration-[744ms] ${SPRING} card-open:text-white`}>
          {name}
        </p>
        <p className="mt-0.5 inline-flex max-h-6 items-center gap-1.5 overflow-hidden type-meta text-teal-text opacity-100 transition-[opacity,max-height,margin] duration-300 ease-out card-open:mt-0 card-open:max-h-0 card-open:opacity-0">
          <span className="size-1.5 shrink-0 rounded-full bg-[#3fb0b8] shadow-[0_0_6px_rgba(63,176,184,0.8)]" />
          {title}
        </p>
        {rows.length > 0 && (
          <ul id={listId} inert={!flip.shown} className="pointer-events-none flex max-h-0 flex-col gap-2 overflow-hidden opacity-0 transition-[max-height,opacity,margin] duration-500 ease-out card-open:pointer-events-auto card-open:mt-4 card-open:max-h-[220px] card-open:opacity-100">
            {rows.map(([key, label]) => (
              <li key={key}>
                <a
                  href={links[key]}
                  aria-label={`${name}: ${label}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 type-compact text-white/90 underline-offset-2 hover:text-white hover:underline"
                >
                  {label}
                  <svg viewBox="0 0 24 24" fill="none" stroke="#7fd4da" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4 shrink-0" aria-hidden="true">
                    <path d="M7 17 17 7M8 7h9v9" />
                  </svg>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
      {rows.length > 0 && (
        <button
          type="button"
          data-contact-toggle=""
          aria-expanded={flip.open}
          aria-controls={listId}
          aria-label={`${name}: ${flip.open ? 'hide' : 'view'} contact links`}
          onClick={toggle}
          className="pointer-events-none absolute bottom-3 right-3 z-10 rounded-full bg-navy px-3 py-1.5 type-meta text-white opacity-0 focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1a7d90]"
        >
          {flip.open ? 'Hide contact links' : 'View contact links'}
        </button>
      )}
    </div>
  )
}

export default function ProfessorGrid({ professors }) {
  return (
    <div className="grid w-full flex-1 grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5 lg:w-auto lg:self-start">
      {professors.map((p, i) => (
        <ProfessorCard key={i} {...p} />
      ))}
    </div>
  )
}
