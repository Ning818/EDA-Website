import { useState } from 'react'

/**
 * Figma: hovering a professor card triggers Smart Animate (QUICK/spring easing, ~0.744s)
 * from the front state (photo + 79px name/title strip) to a "back" state where the info
 * panel expands to fill the full 282x282 card in dark navy, photo fades out, and the name
 * is shown in white.
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

function ProfessorCard({ photo, name, title, links }) {
  const flip = useTapToFlip()
  const photoEl = (
    <img
      src={photo}
      alt={name}
      className={`absolute inset-0 h-[203px] w-full object-cover transition-opacity duration-[744ms] ${SPRING} card-open:opacity-0`}
    />
  )

  if (links) {
    // The same name element travels from the strip up to the top as the panel grows (one spring, the panel's own),
    // and the links sit right after it in the same stack: the title folds away and the links unfold under the name,
    // so the name, panel and content all move as one instead of cross-fading between two layers.
    return (
      <div {...flip} className="group relative h-[282px] w-[282px] overflow-hidden rounded-lg bg-white shadow-sm">
        {photoEl}
        <div
          className={`absolute inset-x-0 bottom-0 h-[79px] bg-white transition-[height,background-color] duration-[744ms] ${SPRING} card-open:h-full card-open:bg-navy`}
        />
        {/* 214px = where the name + title are centered in the 79px strip (203 + (79 - 56) / 2) */}
        <div
          className="absolute inset-x-4 top-[214px] flex flex-col transition-[top] duration-[744ms] ease-[cubic-bezier(0.34,1.3,0.64,1)] card-open:top-5"
        >
          <p className={`font-heading text-lg font-bold leading-7 text-navy transition-colors duration-[744ms] ${SPRING} card-open:text-white`}>
            {name}
          </p>
          <p className="mt-1 max-h-6 overflow-hidden font-body text-base text-[#839794] opacity-100 transition-[opacity,max-height,margin] duration-300 ease-out card-open:mt-0 card-open:max-h-0 card-open:opacity-0">
            {title}
          </p>
          <dl className="pointer-events-none flex max-h-0 flex-col gap-2.5 overflow-hidden opacity-0 transition-[max-height,opacity,margin] duration-500 ease-out card-open:pointer-events-auto card-open:mt-3 card-open:max-h-[220px] card-open:opacity-100">
            {LINK_ROWS.filter(([key]) => links[key]).map(([key, label]) => (
              <div key={key}>
                <dt className="font-heading text-xs font-semibold text-white/70">{label}:</dt>
                <dd>
                  <a
                    href={links[key]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all font-body text-xs leading-snug text-white underline-offset-2 hover:underline"
                  >
                    {links[key]}
                  </a>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    )
  }

  return (
    <div {...flip} className="group relative h-[282px] w-[282px] overflow-hidden rounded-lg bg-white shadow-sm">
      {photoEl}
      <div
        className={`absolute inset-x-0 bottom-0 flex h-[79px] flex-col justify-center gap-1 bg-white p-4 transition-[height,background-color] duration-[744ms] ${SPRING} card-open:h-full card-open:bg-navy`}
      >
        <p className={`font-heading text-lg font-bold text-navy transition-colors duration-[744ms] ${SPRING} card-open:text-white`}>
          {name}
        </p>
        <p className="font-body text-base text-[#839794] opacity-100 transition-opacity duration-200 card-open:opacity-0">
          {title}
        </p>
      </div>
    </div>
  )
}

export default function ProfessorGrid({ professors }) {
  return (
    <div className="flex flex-1 flex-wrap justify-center gap-6 lg:justify-start">
      {professors.map((p, i) => (
        <ProfessorCard key={i} {...p} />
      ))}
    </div>
  )
}
