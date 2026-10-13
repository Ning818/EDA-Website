import { Link } from 'react-router-dom'
import { UNDERLINE_ANIM } from '../ui/ArrowLink'
import { ONGOING_COUNT as ONGOING_PROJECTS, ENDED_COUNT as ENDED_PROJECTS, TOTAL_COUNT as TOTAL_PROJECTS } from '../../content/projects'

/**
 * A rounded "feature" card for the Research page: an image beside an eyebrow, a title, a short summary and a call to
 * action - the page's two highlights (a thesis, the funded projects).
 *
 * `tone`: 'dark' (navy card, light type) or 'light' (white card with a hairline border that lights up in the page's theme colour (`--theme`, teal without it) on hover - the
 * same card language as the project / people cards). `meta`: a muted line under the title (authors, year). `tags`: small
 * keyword pills. `stats`: the funded-project numbers as a
 * teaser row. `button`: the call to action is a solid button instead of an underlined text link - used where the card is
 * there to lead people on to another page; the whole card is then the link (`to`).
 */
const ARROW = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5 shrink-0 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)

function StatTeaser({ light }) {
  const items = [
    ['Ongoing', ONGOING_PROJECTS, '#279aae', '#279aae'],
    ['Ended', ENDED_PROJECTS, light ? '#002843' : '#ffffff', light ? 'rgba(0,40,67,0.35)' : 'rgba(255,255,255,0.4)'],
    ['Total', TOTAL_PROJECTS, light ? '#002843' : '#ffffff', light ? '#61a5b1' : '#468c9e'],
  ]
  return (
    <div className="flex gap-6 md:gap-10">
      {items.map(([label, value, color, dot]) => (
        <div key={label}>
          <p className="font-heading text-3xl font-bold leading-none tabular-nums md:text-4xl" style={{ color }}>
            {value}
          </p>
          <p className={`mt-2 inline-flex items-center gap-1.5 font-body text-[11px] uppercase tracking-[0.08em] md:text-xs ${light ? 'text-navy/70' : 'text-white/70'}`}>
            <span className="size-1.5 rounded-full" style={{ background: dot }} />
            {label}
          </p>
        </div>
      ))}
    </div>
  )
}

export default function FeatureCard({
  eyebrow,
  title,
  children,
  image,
  imageAlt,
  meta,
  tags,
  stats = false,
  cta,
  to = '#',
  button = false,
  tone = 'light',
  imageSide = 'left',
}) {
  const light = tone === 'light'
  const external = !to.startsWith('/')
  const asLink = button // the whole card is the link
  const cardClass = `group relative grid items-center gap-6 overflow-hidden rounded-3xl p-5 md:grid-cols-2 md:gap-12 md:p-10 ${
    light ? 'border border-navy/15 bg-white transition-[border-color] duration-300 ease-out hover:border-[color:var(--theme,#279aae)]' : 'bg-navy'
  }`

  const imageBlock = (
    <div className={`overflow-hidden rounded-2xl max-md:order-first ${imageSide === 'right' ? 'md:order-2' : ''}`}>
      <img src={image} alt={imageAlt} className="aspect-[4/3] w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]" />
    </div>
  )

  const ctaLabel = (
    <span className={`inline-flex items-center gap-2 font-heading text-base font-medium ${light ? 'text-navy' : 'text-white'}`}>
      <span className={UNDERLINE_ANIM}>{cta}</span>
      {ARROW}
    </span>
  )
  const ctaButton = (
    <span className="inline-flex items-center gap-2 rounded-full bg-navy px-6 py-3 font-heading text-base font-medium text-white transition-colors duration-300 group-hover:bg-[#1a7d90]">
      {cta}
      {ARROW}
    </span>
  )

  const textBlock = (
    <div className="relative z-10 flex flex-col items-start gap-4 md:gap-5">
      <p className={`font-body text-sm font-medium uppercase tracking-[0.08em] ${light ? 'text-[#1a7d90]' : 'text-[#279aae]'}`}>{eyebrow}</p>
      <h2 className={`font-heading text-2xl font-bold leading-tight md:text-3xl ${light ? 'text-navy' : 'text-white'}`}>{title}</h2>
      {meta && <p className={`-mt-1 font-body text-sm ${light ? 'text-navy/60' : 'text-white/60'}`}>{meta}</p>}
      {stats && <StatTeaser light={light} />}
      <p className={`font-body text-base leading-[1.5] ${light ? 'text-navy/85' : 'text-white/85'}`}>{children}</p>
      {tags && (
        <ul className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <li key={tag} className={`rounded-full border px-3 py-1 font-body text-xs ${light ? 'border-navy/15 text-navy/80' : 'border-white/25 text-white/80'}`}>
              {tag}
            </li>
          ))}
        </ul>
      )}
      <div className="pt-1">
        {button ? (
          ctaButton
        ) : external ? (
          <a href={to} className="group/cta inline-flex">
            {ctaLabel}
          </a>
        ) : (
          <Link to={to} className="group/cta inline-flex">
            {ctaLabel}
          </Link>
        )}
      </div>
    </div>
  )

  const inner = (
    <>
      {!light && (
        // a faint dot grid in the corner of the dark card, like the page header's
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.1)_1px,transparent_1.3px)] bg-[length:24px_24px] [mask-image:radial-gradient(ellipse_at_90%_0%,black_5%,transparent_65%)]" />
      )}
      {imageBlock}
      {textBlock}
    </>
  )

  return (
    <section className="mx-auto max-w-[1440px] px-8 py-4 md:py-6 lg:px-[120px]">
      {asLink ? (
        <Link to={to} className={cardClass} aria-label={cta}>
          {inner}
        </Link>
      ) : (
        <div className={cardClass}>{inner}</div>
      )}
    </section>
  )
}
