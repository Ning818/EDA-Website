import HeaderDecor from './HeaderDecor'
import FactoryDecor from './FactoryDecor'
import FactoryParticles from './FactoryParticles'
import HeaderDots from './HeaderDots'
import HelixDecor from './HelixDecor'
import SkylineDecor from './SkylineDecor'
import SkylineParticles from './SkylineParticles'

/**
 * The dark navy title band used at the top of Research/Funded Projects pages:
 * a small teal category label, a large white page title, and an intro paragraph.
 *
 * `decorated`: the richer variant (first used on Funded Projects) - the category becomes a small all-caps eyebrow over a
 * bigger title, the band gets the dot grid every theme shares (HeaderDots) with the theme's artwork on top, and `after` (e.g. the stats) sits inside
 * the band under the title. `light`: that variant on the page's own light background (navy type, a hairline under it)
 * instead of the navy block.
 *
 * `decorVariant` picks the artwork: the circuit's variant ('research' | 'projects', see HeaderDecor), 'skyline' (a line-art
 * city in `decorColor`, see SkylineDecor), 'helix' (Bioinformatics' DNA line art, see HelixDecor), 'factory-particles' (Industry 4.0's smart factory made of flat particles, see FactoryParticles; 'factory' is the same in thin lines, see FactoryDecor), 'skyline-particles' (the same city made of flat particles, see SkylineParticles; `decorPage`, 'research' | 'projects', picks
 * which of its two looks), or 'none' to leave that area empty (a theme page whose artwork is not designed yet).
 *
 * Decorated with an intro paragraph (`children`) is a two-column header from `lg` up: eyebrow, title and paragraph stacked
 * in a left column that stops short of the circuit, the circuit vertically centred on the right. Below `lg` it is one
 * column - the circuit sits faintly behind the title and the paragraph runs full width underneath.
 */
export default function PageIntroBand({ category, title, children, decorated = false, light = false, decorVariant, decorColor, decorPage, after }) {
  const onLight = decorated && light
  const hero = decorated && children
  const showDecor = decorated && decorVariant !== 'none'
  const decor =
    decorVariant === 'skyline' ? (
      <SkylineDecor color={decorColor} light={light} />
    ) : decorVariant === 'helix' ? (
      <HelixDecor color={decorColor} />
    ) : decorVariant === 'factory-particles' ? (
      <FactoryParticles color={decorColor} />
    ) : decorVariant === 'factory' ? (
      <FactoryDecor color={decorColor} light={light} />
    ) : decorVariant === 'skyline-particles' ? (
      <SkylineParticles color={decorColor} variant={decorPage} />
    ) : (
      <HeaderDecor variant={decorVariant} />
    )
  const eyebrow = (
    <>
      <p className={`font-body text-sm font-medium uppercase tracking-[0.08em] md:text-base ${onLight ? 'text-[#1a7d90]' : 'text-[#279aae]'}`}>{category}</p>
      {title && <p className={`font-heading text-4xl font-bold tracking-tight md:text-6xl ${onLight ? 'text-navy' : 'text-white'}`}>{title}</p>}
    </>
  )
  const sectionClass = `relative overflow-hidden ${onLight ? 'border-b border-navy/10 bg-mint' : 'bg-navy'}`

  if (hero) {
    return (
      <section className={sectionClass}>
        <div className="mx-auto max-w-[1440px] px-8 pb-10 pt-16 lg:px-[120px]">
          {/* the left column's width: from its left edge up to just short of the circuit (see HeaderDecor's canvas width) */}
          <div className="lg:max-w-[clamp(416px,calc(100vw-803px),640px)]">
            {/* the circuit attaches to this row below `lg`, to the whole band from `lg` up */}
            <div className="relative lg:static">
              <HeaderDots light={light} />
              {showDecor && decor}
              <div className="relative z-10 flex flex-col gap-2.5">{eyebrow}</div>
            </div>
            <p className={`relative z-10 pt-6 font-body text-base leading-6 ${onLight ? 'text-navy/85' : 'text-[#f5f4f6]'}`}>{children}</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className={sectionClass}>
      <div className="relative">
        {decorated && <HeaderDots light={light} />}
        {showDecor && decor}
        <div className="relative z-10 w-full">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-2.5 px-8 pt-16 lg:px-[120px]">
            {decorated ? (
              eyebrow
            ) : (
              <>
                <p className="font-heading text-[28px] font-bold md:text-[36px] tracking-tight text-[#279aae]">{category}</p>
                {title && <p className="font-heading text-[28px] font-bold md:text-[36px] tracking-tight text-white">{title}</p>}
              </>
            )}
          </div>
          {children && (
            <div className="mx-auto max-w-[1440px] px-8 pb-10 pt-6 lg:px-[120px]">
              <p className={`font-body text-base leading-6 md:text-lg ${onLight ? 'text-navy/85' : 'text-[#f5f4f6]'}`}>{children}</p>
            </div>
          )}
          {after}
        </div>
      </div>
    </section>
  )
}
