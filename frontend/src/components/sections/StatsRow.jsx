import { useEffect, useState } from 'react'

// The Funded Projects page's headline numbers (shown inside the page-header band, see PageIntroBand's `after`): big
// figures that count up when the page opens. `counts`: { ongoing, ended, total } as the API gives them (backend/), or null while they are on their way (a dash stands in
// each figure's place). `light`: for a light band (navy figures) instead of the dark one (white figures).
const TEAL = '#279aae'

/** 0 -> target over `ms` (ease-out), after `delay` ms; straight to the target when the user prefers reduced motion. */
function useCountUp(target, ms = 1300, delay = 300) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target)
      return undefined
    }
    let raf
    let start = null
    const timer = setTimeout(() => {
      const tick = (now) => {
        start ??= now
        const p = Math.min(1, (now - start) / ms)
        setValue(Math.round(target * (1 - (1 - p) ** 3)))
        if (p < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }, delay)
    return () => {
      clearTimeout(timer)
      cancelAnimationFrame(raf)
    }
  }, [target, ms, delay])
  return value
}

function Stat({ target, label, color, dot, labelClass }) {
  const counted = useCountUp(target ?? 0)
  const value = target == null ? '–' : counted
  return (
    <div className="flex flex-col">
      <p className="type-stat" style={{ color }} aria-hidden="true">
        {value}
      </p>
      <span className="sr-only">{target ?? 'loading'}</span>
      <p className={`mt-3 inline-flex items-center gap-2 type-meta uppercase tracking-[0.08em] ${labelClass}`}>
        {dot && <span className="size-2 rounded-full" style={{ background: dot }} />}
        {label}
      </p>
    </div>
  )
}

export default function StatsRow({ counts, light = false }) {
  const ink = light ? '#002843' : '#ffffff'
  const labelClass = light ? 'text-navy/70' : 'text-white/70'
  return (
    <div className="mx-auto max-w-[1440px] px-8 pb-14 pt-10 lg:px-[120px]">
      <div className="flex gap-8 md:gap-16">
        <Stat target={counts?.ongoing} label="Ongoing" color={TEAL} dot={TEAL} labelClass={labelClass} />
        <Stat target={counts?.ended} label="Ended" color={ink} dot={light ? 'rgba(0,40,67,0.35)' : 'rgba(255,255,255,0.4)'} labelClass={labelClass} />
        <Stat target={counts?.total} label="Total" color={ink} dot={light ? '#61a5b1' : '#468c9e'} labelClass={labelClass} />
      </div>
    </div>
  )
}
