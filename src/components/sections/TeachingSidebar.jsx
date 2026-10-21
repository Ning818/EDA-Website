// The Teaching page's sidebar: a white panel with a small console-style heading and one row per tab - an index number and the
// name. A single lit bar (a teal glow on the left edge and a fading teal wash behind the row) slides to the selected row instead
// of the row's own background changing, so picking another tab is a motion, not a swap.
const NAV_ITEMS = ['Professors', 'PhD Students & Research Fellows', 'Alumni']
const ROW = 52 // px: the rows' height, which the sliding bar moves by

export default function TeachingSidebar({ active = 'Professors', onSelect }) {
  const activeIndex = Math.max(0, NAV_ITEMS.indexOf(active))
  return (
    <aside className="w-full shrink-0 rounded-2xl border border-navy/10 bg-white p-3 lg:sticky lg:top-6 lg:w-[273px] lg:self-start">
      <div className="flex items-center gap-2.5 px-3 pb-3 pt-1.5">
        <span className="size-1.5 rounded-full bg-[#3fb0b8] shadow-[0_0_8px_rgba(63,176,184,0.8)]" />
        <h2 className="type-meta font-medium uppercase tracking-[0.08em] text-[#1a7d90]">People</h2>
        <span className="h-px flex-1 bg-gradient-to-r from-[#3fb0b8]/50 to-transparent" />
      </div>
      <nav className="relative flex flex-col">
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 rounded-lg bg-gradient-to-r from-[#3fb0b8]/20 to-[#3fb0b8]/0 transition-transform duration-500 ease-[cubic-bezier(0.34,1.3,0.64,1)]"
          style={{ height: ROW, transform: `translateY(${activeIndex * ROW}px)` }}
        >
          <span className="absolute inset-y-2.5 left-0 w-[3px] rounded-full bg-[#3fb0b8] shadow-[0_0_10px_rgba(63,176,184,0.7)]" />
        </span>
        {NAV_ITEMS.map((item, i) => {
          const isActive = item === active
          return (
            <button
              key={item}
              type="button"
              onClick={() => onSelect?.(item)}
              style={{ height: ROW }}
              className="group relative z-10 flex cursor-pointer items-center gap-3.5 rounded-lg px-4 text-left"
            >
              <span className={`font-mono text-sm tracking-[0.12em] transition-colors duration-300 ${isActive ? 'text-[#1a7d90]' : 'text-navy/30 group-hover:text-[#1a7d90]/70'}`}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className={`type-action font-semibold leading-tight transition-colors duration-300 ${isActive ? 'text-navy' : 'text-navy/60 group-hover:text-navy'}`}>{item}</span>
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
