import { useState } from 'react'

/**
 * Hovering a professor card triggers a spring animation (~0.744s) from the front state (photo +
 * 80px name/role strip) to a "back" state where the info panel expands to fill the whole card,
 * the photo fades out and the name moves up to the top.
 *
 * The back state also lists the person's contact links under their name (Polito Page, ORCID
 * Publication, LinkedIn) when the professor has a `links` entry. The Figma placeholder used one
 * person's links on every card, so only professors with real data of their own get this block.
 *
 * The flip is the `card-open:` variant (index.css): the hover on a desktop (hover-capable pointer, md and up), a tap on
 * the phone layout / touch devices - there a tap slides the panel up, another tap folds it back down, and a tap on one
 * of the links inside follows the link as usual.
 */
const LINK_ROWS = [
  ['polito', 'Polito Page'],
  ['orcid', 'ORCID Publication'],
  ['linkedin', 'LinkedIn'],
]

const SPRING = 'ease-[cubic-bezier(0.34,1.56,0.64,1)]'

// Same condition as the `card-open` hover branch in index.css: where it holds the card flips on hover, elsewhere on tap.
const HOVER_FLIPS = '(hover: hover) and (min-width: 768px)'

function useTapToFlip() {
  const [open, setOpen] = useState(false)
  return {
    'data-open': open ? '' : undefined,
    onClick: (e) => {
      if (window.matchMedia(HOVER_FLIPS).matches || e.target.closest('a')) return
      setOpen((o) => !o)
    },
  }
}

const GLOW = 'hover:border-[#3fb0b8] hover:shadow-[0_8px_28px_rgba(63,176,184,0.25)] data-[open]:border-[#3fb0b8] data-[open]:shadow-[0_8px_28px_rgba(63,176,184,0.25)]'

// The four corners of the photo's frame, like a viewfinder's marks
const BRACKETS = [
  'left-2.5 top-2.5 border-l border-t',
  'right-2.5 top-2.5 border-r border-t',
  'bottom-2.5 left-2.5 border-b border-l',
  'bottom-2.5 right-2.5 border-b border-r',
]

function ProfessorCard({ photo, name, title, links, index }) {
  const flip = useTapToFlip()
  const rows = LINK_ROWS.filter(([key]) => links?.[key])
  // A white card with a hairline border: the photo in a frame with viewfinder marks, a name strip under it with the role as a small
  // mono line, and the index of the card on the right. Hovering (or a tap) lights the border in teal with a soft glow, and the strip
  // rises to fill the card - turning navy, the photo fading away - with the name moving up to the top and the links listed under it.
  return (
    <div {...flip} className={`group relative h-[304px] w-full overflow-hidden rounded-xl border border-navy/10 bg-white transition-[border-color,box-shadow] duration-300 ${GLOW}`}>
      <div className={`absolute inset-x-0 top-0 h-[224px] transition-opacity duration-[744ms] ${SPRING} card-open:opacity-0`}>
        <img src={photo} alt={name} className="h-full w-full object-cover" />
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white to-transparent" />
        {BRACKETS.map((pos) => (
          <span key={pos} className={`absolute size-3 border-[#3fb0b8] ${pos}`} />
        ))}
      </div>
      <div
        className={`absolute inset-x-0 bottom-0 h-[80px] border-t border-navy/10 bg-white transition-[height,background-color] duration-[744ms] ${SPRING} card-open:h-full card-open:border-transparent card-open:bg-navy`}
      />
      <span className="absolute right-4 top-[271px] font-mono text-[11px] tracking-[0.18em] text-navy/25 transition-opacity duration-300 card-open:opacity-0">
        {String(index + 1).padStart(2, '0')}
      </span>
      {/* 242px = where the name and role are centred in the 80px strip (224 + (80 - 44) / 2) */}
      <div className="absolute inset-x-4 top-[242px] flex flex-col transition-[top] duration-[744ms] ease-[cubic-bezier(0.34,1.3,0.64,1)] card-open:top-5">
        <p className={`truncate font-heading text-[17px] font-bold leading-6 text-navy transition-colors duration-[744ms] ${SPRING} card-open:text-white`}>{name}</p>
        <p className="mt-1 inline-flex max-h-4 items-center gap-1.5 overflow-hidden font-mono text-[11px] uppercase leading-4 tracking-[0.12em] text-[#1a7d90] opacity-100 transition-[opacity,max-height,margin] duration-300 ease-out card-open:mt-0 card-open:max-h-0 card-open:opacity-0">
          <span className="size-1.5 shrink-0 rounded-full bg-[#3fb0b8] shadow-[0_0_6px_rgba(63,176,184,0.8)]" />
          {title}
        </p>
        {rows.length > 0 && (
          <dl className="pointer-events-none flex max-h-0 flex-col gap-3 overflow-hidden opacity-0 transition-[max-height,opacity,margin] duration-500 ease-out card-open:pointer-events-auto card-open:mt-4 card-open:max-h-[220px] card-open:opacity-100">
            {rows.map(([key, label]) => (
              <div key={key}>
                <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#7fd4da]">{label}</dt>
                <dd>
                  <a href={links[key]} target="_blank" rel="noopener noreferrer" className="break-all font-body text-xs leading-snug text-white/85 underline-offset-2 hover:text-white hover:underline">
                    {links[key]}
                  </a>
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  )
}

export default function ProfessorGrid({ professors }) {
  return (
    <div className="grid w-full flex-1 grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5 lg:w-auto lg:self-start">
      {professors.map((p, i) => (
        <ProfessorCard key={i} {...p} index={i} />
      ))}
    </div>
  )
}
