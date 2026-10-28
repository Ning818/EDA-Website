import { useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

// The People page's sidebar: a white panel with a small console-style heading and one row per group - its name, a link to the group's own address
// (`items`: [{ slug, name, to }]; `active`: the slug of the one shown, marked with aria-current). A single lit bar (a teal glow on the left edge and a fading
// teal wash behind the row) slides to the active row instead of the row's own background changing, so picking another group is a motion, not a swap.
// A row is at least 52px high and grows with its text (a long name wrapping onto more lines, a larger text size), so the bar takes the row's measured
// position and height rather than a fixed step.
export default function TeachingSidebar({ items, active }) {
  const navRef = useRef(null)
  const rowRefs = useRef({})
  const [bar, setBar] = useState({ top: 0, height: 52 })

  useLayoutEffect(() => {
    const measure = () => {
      const row = rowRefs.current[active]
      if (row) setBar((prev) => (prev.top === row.offsetTop && prev.height === row.offsetHeight ? prev : { top: row.offsetTop, height: row.offsetHeight }))
    }
    measure()
    // a row changes height when the panel's width or the text size changes, or when the web font arrives
    const observer = new ResizeObserver(measure)
    observer.observe(navRef.current)
    Object.values(rowRefs.current).forEach((row) => row && observer.observe(row))
    return () => observer.disconnect()
  }, [active, items])

  return (
    <aside className="w-full shrink-0 rounded-2xl border border-navy/10 bg-white p-3 lg:sticky lg:top-6 lg:w-[273px] lg:self-start">
      <div className="flex items-center gap-2.5 px-3 pb-3 pt-1.5">
        <span className="size-1.5 rounded-full bg-[#3fb0b8] shadow-[0_0_8px_rgba(63,176,184,0.8)]" />
        <h2 className="type-meta font-medium uppercase tracking-[0.08em] text-teal-text">People</h2>
        <span className="h-px flex-1 bg-gradient-to-r from-[#3fb0b8]/50 to-transparent" />
      </div>
      <nav ref={navRef} aria-label="People groups" className="relative flex flex-col">
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 rounded-lg bg-gradient-to-r from-[#3fb0b8]/20 to-[#3fb0b8]/0 transition-[transform,height] duration-500 ease-[cubic-bezier(0.34,1.3,0.64,1)]"
          style={{ height: bar.height, transform: `translateY(${bar.top}px)` }}
        >
          <span className="absolute inset-y-2.5 left-0 w-[3px] rounded-full bg-[#3fb0b8] shadow-[0_0_10px_rgba(63,176,184,0.7)]" />
        </span>
        {items.map(({ slug, name, to }) => {
          const isActive = slug === active
          return (
            <Link
              key={slug}
              to={to}
              ref={(el) => {
                rowRefs.current[slug] = el
              }}
              aria-current={isActive ? 'page' : undefined}
              className="group relative z-10 flex min-h-[52px] cursor-pointer items-center rounded-lg px-4 py-1.5 text-left"
            >
              <span className={`type-action font-semibold leading-tight transition-colors duration-300 ${isActive ? 'text-navy' : 'text-navy/75 group-hover:text-navy'}`}>{name}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
