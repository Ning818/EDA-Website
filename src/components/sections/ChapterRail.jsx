import { useEffect, useRef, useState } from 'react'
import { CHAPTERS, chapterIndexAt, chapterTargets, scrollToChapter, useFooterInView } from './homeChapters'

// How long a chapter's name stays beside its dot after the page arrives at it (it also shows on hover and focus).
const PEEK_MS = 1800

/**
 * The home page's chapter index: a column of small dots down the right edge of the screen, one per chapter (the opening screen, the four themes, the YouTube /
 * LinkedIn stage), each in its theme's colour. The one the page is at is bigger and ringed; a thin teal line runs down the column and fills as the page scrolls on, so
 * the visitor can see how far through it they are. A dot is a button that scrolls to its chapter; its name shows beside it on hover or focus, and for a moment whenever the
 * page arrives at a new chapter (which is how it reads on a phone, where there is no hover). `still`: the page is the plain one, not the animated one (the chapters'
 * stops are laid out differently, see chapterTargets).
 */
export default function ChapterRail({ still }) {
  const [active, setActive] = useState(0)
  const [peek, setPeek] = useState(null)
  const hidden = useFooterInView()
  const fill = useRef(null)
  const arrived = useRef(false) // the first position is not an "arrival"

  useEffect(() => {
    let targets = []
    let frame = 0
    const update = () => {
      const y = window.scrollY
      const last = targets.length - 1
      let at = last // how far along the chapters the page is, as a fractional index (for the line)
      for (let i = 0; i < last; i++) {
        if (y < targets[i + 1]) {
          const span = targets[i + 1] - targets[i]
          at = i + (span > 0 ? Math.min(1, Math.max(0, (y - targets[i]) / span)) : 0)
          break
        }
      }
      if (fill.current) fill.current.style.transform = `scaleY(${last > 0 ? at / last : 0})`
      setActive(chapterIndexAt(y, targets))
    }
    const measure = () => {
      targets = chapterTargets(still)
      update()
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(() => ((frame = 0), update()))
    }
    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', measure)
    // the page grows and shrinks as the fonts arrive and the layout settles: the stops move with it
    const observer = new ResizeObserver(measure)
    observer.observe(document.documentElement)
    document.fonts?.ready.then(measure)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', measure)
      observer.disconnect()
    }
  }, [still])

  // arriving at a chapter shows its name for a moment
  useEffect(() => {
    if (!arrived.current) {
      arrived.current = true
      return undefined
    }
    setPeek(active)
    const timer = setTimeout(() => setPeek(null), PEEK_MS)
    return () => clearTimeout(timer)
  }, [active])

  return (
    <nav
      aria-label="Page sections"
      // centred on the screen's height in `svh` (the height with a phone browser's bars showing) rather than `top-1/2`: that one follows the bars as they slide in and out
      // while the page scrolls, which makes a fixed column drift up and down; this one stays put
      className={`fixed right-0.5 top-[50svh] z-30 -translate-y-1/2 transition-opacity duration-300 ${hidden ? 'invisible opacity-0' : ''}`}
    >
      {/* the line behind the dots, from the first dot's centre to the last's, and the part of it the page has scrolled through */}
      <span aria-hidden="true" className="absolute inset-y-3 left-1/2 w-px -translate-x-1/2 bg-navy/20">
        <span ref={fill} className="block h-full origin-top bg-[#279aae]" style={{ transform: 'scaleY(0)' }} />
      </span>
      <ul className="relative flex flex-col gap-2">
        {CHAPTERS.map(({ id, label, color }, i) => {
          const isActive = i === active
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => scrollToChapter(id, still)}
                aria-label={`Go to ${label}`}
                aria-current={isActive ? 'location' : undefined}
                style={{ '--c': color }}
                className="group relative grid size-6 cursor-pointer place-items-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-navy"
              >
                <span
                  aria-hidden="true"
                  className={`block rounded-full bg-[var(--c)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-125 ${
                    isActive ? 'size-3.5 ring-2 ring-navy shadow-[0_0_0_5px_color-mix(in_srgb,var(--c)_30%,transparent)]' : 'size-2.5 ring-1 ring-navy/55'
                  }`}
                />
                <span
                  aria-hidden="true"
                  data-show={peek === i ? '' : undefined}
                  className="pointer-events-none absolute right-full mr-2 translate-x-1 whitespace-nowrap rounded-full border border-navy/15 bg-white/95 px-3 py-1 type-meta text-navy opacity-0 shadow-sm transition-[opacity,transform] duration-200 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 data-[show]:translate-x-0 data-[show]:opacity-100"
                >
                  {label}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
