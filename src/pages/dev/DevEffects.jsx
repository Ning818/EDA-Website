import { useState } from 'react'
import PageIntroBand from '../../components/sections/PageIntroBand'
import StatsRow from '../../components/sections/StatsRow'
import { HEADER_EFFECTS } from '../../effects/headerEffects'
import { RESEARCH_BY_THEME } from '../../content/research'
import { THEMES } from '../../themes'

// /dev/effects - the preview page of the header-effects registry (src/effects/headerEffects.js), for the development server only
// (App.jsx does not register the route in a production build). Every registered artwork is drawn the way its page draws it - the
// real PageIntroBand, with the theme's colour and the page's look - so a changed or a new effect can be looked at on its own,
// in both of its looks, without going through the theme pages. The research band uses the intro text of the theme whose colour is
// picked (the band's height - and so how the artwork is fitted - follows the text, as on the real page).

export default function DevEffects() {
  const [page, setPage] = useState('research')
  const [color, setColor] = useState(THEMES[0].color)
  const [run, setRun] = useState(0) // changing it remounts the artworks, which plays their intro again
  const [showLegacy, setShowLegacy] = useState(false)

  const intro = RESEARCH_BY_THEME[(THEMES.find((t) => t.color === color) ?? THEMES[0]).slug].intro
  const entries = Object.entries(HEADER_EFFECTS).filter(([, e]) => showLegacy || !e.legacy)
  const btn = (on) =>
    `cursor-pointer rounded-full border px-3.5 py-1.5 font-body text-sm transition-colors ${on ? 'border-navy bg-navy text-white' : 'border-navy/20 bg-white text-navy hover:border-navy/50'}`

  return (
    <main>
      <section className="mx-auto max-w-[1440px] px-8 pb-8 pt-12 lg:px-[120px]">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#1a7d90]">Development preview</p>
        <h1 className="mt-2 font-heading text-4xl font-bold tracking-tight text-navy">Header effects</h1>
        <p className="mt-3 max-w-[760px] font-body text-base leading-6 text-navy/80">
          Every artwork registered in <code className="font-mono text-sm">src/effects/headerEffects.js</code>, drawn the way the Research and Funded Projects
          pages draw it. Edit an effect&apos;s file and it updates here as you save; press Replay to watch its intro again.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-[0.18em] text-navy/50">Page</span>
            {['research', 'projects'].map((p) => (
              <button key={p} type="button" className={btn(page === p)} onClick={() => setPage(p)}>
                {p}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-[0.18em] text-navy/50">Colour</span>
            {THEMES.map((t) => (
              <button key={t.slug} type="button" className={btn(color === t.color)} onClick={() => setColor(t.color)}>
                <span className="mr-2 inline-block size-2.5 rounded-full align-middle" style={{ background: t.color }} />
                {t.name}
              </button>
            ))}
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} aria-label="Custom colour" className="size-8 cursor-pointer rounded border border-navy/20 bg-white p-0.5" />
          </div>
          <button type="button" className={btn(false)} onClick={() => setRun((n) => n + 1)}>
            Replay
          </button>
          <label className="flex cursor-pointer items-center gap-2 font-body text-sm text-navy/80">
            <input type="checkbox" checked={showLegacy} onChange={(e) => setShowLegacy(e.target.checked)} />
            Show the legacy thin-line versions
          </label>
        </div>
      </section>

      {entries.map(([key, effect]) => {
        const usedBy = THEMES.filter((t) => t.header === key).map((t) => t.name)
        return (
          <section key={key} className="border-t border-navy/10">
            <div className="mx-auto flex max-w-[1440px] flex-wrap items-baseline gap-x-5 gap-y-1 px-8 pb-2 pt-6 lg:px-[120px]">
              <h2 className="font-heading text-xl font-bold text-navy">{effect.label}</h2>
              <code className="font-mono text-sm text-[#1a7d90]">{key}</code>
              <span className="font-mono text-xs uppercase tracking-[0.14em] text-navy/50">{effect.engine}</span>
              {effect.legacy && <span className="rounded bg-navy/10 px-2 py-0.5 font-mono text-xs uppercase tracking-[0.14em] text-navy/70">legacy</span>}
              <span className="font-body text-sm text-navy/70">{usedBy.length ? `used by: ${usedBy.join(', ')}` : 'used by no theme'}</span>
            </div>
            <p className="mx-auto max-w-[1440px] px-8 pb-3 font-mono text-xs text-navy/50 lg:px-[120px]">
              {effect.source}
              {effect.geometry ? ` · geometry: ${effect.geometry}` : ''}
            </p>
            <PageIntroBand
              key={`${key}-${page}-${color}-${run}`}
              category={page === 'research' ? 'Research' : 'Funded Projects'}
              title="Preview"
              decorated
              light
              decorVariant={key}
              decorColor={color}
              decorPage={page}
              after={page === 'projects' ? <StatsRow light /> : undefined}
            >
              {page === 'research' ? intro : undefined}
            </PageIntroBand>
          </section>
        )
      })}
    </main>
  )
}
