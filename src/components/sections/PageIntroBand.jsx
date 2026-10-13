import { headerEffectFor } from '../../effects/headerEffects'
import HeaderDots from './HeaderDots'

/**
 * The dark navy title band used at the top of Research/Funded Projects pages:
 * a small teal category label, a large white page title, and an intro paragraph.
 *
 * `decorated`: the richer variant (first used on Funded Projects) - the category becomes a small all-caps eyebrow over a
 * bigger title, the band gets the dot grid every theme shares (HeaderDots) with the theme's artwork on top, and `after` (e.g. the stats) sits inside
 * the band under the title. `light`: that variant on the page's own light background (navy type, a hairline under it)
 * instead of the navy block.
 *
 * `decorVariant` picks the artwork: a key of the header-effects registry (src/effects/headerEffects.js - 'circuit', 'helix-particles',
 * 'skyline-particles', 'factory-particles', or the thin-line 'helix' | 'skyline' | 'factory'), normally the theme's `header` from themes.js;
 * `decorPage` ('research' | 'projects') picks which of the artwork's two looks is drawn, `decorColor` is the theme's colour. 'none' (or
 * nothing) leaves that area empty (a theme page whose artwork is not designed yet).
 *
 * `backdrop` (with `textWidth`): the plain band with a picture of its own drawn behind the text, see the branch below; with a `title`
 * the category is the small eyebrow over a big title (as on the decorated pages), without one it is the page's heading; `titleVeil`: a feathered translucent layer of the page's colour behind the title block, to pale the backdrop there; `bandBg`: the
 * band's background class ('' to let the page's own show through, and the backdrop overflow the band instead of being cut at its edge); `light`: navy type and a hairline under the band (`bandRule={false}` leaves the hairline out), for a light page.
 *
 * Decorated with an intro paragraph (`children`) is a two-column header from `lg` up: eyebrow, title and paragraph stacked
 * in a left column that stops short of the circuit, the circuit vertically centred on the right. Below `lg` it is one
 * column - the circuit sits faintly behind the title and the paragraph runs full width underneath.
 */
export default function PageIntroBand({ category, title, children, decorated = false, light = false, decorVariant, decorColor, decorPage, after, backdrop, textWidth = '', backdropPad = 'pb-10 lg:pb-14', bandBg = 'bg-navy', bandRule = true, titleVeil = false }) {
  const onLight = decorated && light
  const hero = decorated && children
  const effect = decorated ? headerEffectFor(decorVariant) : null
  const showDecor = effect !== null
  const decor = effect && <effect.component {...effect.props({ color: decorColor, page: decorPage, light })} />
  const eyebrow = (
    <>
      <p className={`font-body text-sm font-medium uppercase tracking-[0.08em] md:text-base ${onLight ? 'text-[#1a7d90]' : 'text-[#279aae]'}`}>{category}</p>
      {title && <p className={`font-heading text-4xl font-bold tracking-tight md:text-6xl ${onLight ? 'text-navy' : 'text-white'}`}>{title}</p>}
    </>
  )
  const sectionClass = `relative overflow-hidden ${onLight ? 'border-b border-navy/10 bg-mint' : 'bg-navy'}`

  // a backdrop (the Collaborations page's globe): the plain navy band with the category and the paragraph in a column of its own
  // (`textWidth`: classes for that column's width from `lg` up; `backdropPad`: the band's bottom padding, for a backdrop that
  // stands under the text), the backdrop drawn behind it and free to overflow the band's edge
  if (backdrop !== undefined) {
    return (
      <section className={`relative ${bandBg ? 'overflow-hidden' : ''} ${bandBg} ${light && bandRule ? 'border-b border-navy/10' : ''}`}>
        <div className="relative">
          {backdrop}
          <div className={`relative z-10 mx-auto max-w-[1440px] px-8 pt-16 lg:px-[120px] ${backdropPad}`}>
            <div className={`flex flex-col gap-6 ${textWidth}`}>
              {title ? (
                <div className="relative flex flex-col items-start gap-2.5 self-start">
                  {/* titleVeil: a translucent layer of the page's own colour between the backdrop and the title, feathered at its edges, so the
                      backdrop shows paler behind the big title */}
                  {titleVeil && (
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none absolute -inset-x-10 -inset-y-7 -z-10 [mask-image:radial-gradient(closest-side,black_55%,transparent)] ${light ? 'bg-mint/85' : 'bg-navy/70'}`}
                    />
                  )}
                  <p className={`font-body text-sm font-medium uppercase tracking-[0.08em] md:text-base ${light ? 'text-[#1a7d90]' : 'text-[#279aae]'}`}>{category}</p>
                  <p className={`font-heading text-4xl font-bold tracking-tight md:text-6xl ${light ? 'text-navy' : 'text-white'}`}>{title}</p>
                </div>
              ) : (
                <p className="font-heading text-[28px] font-bold md:text-[36px] tracking-tight text-[#279aae]">{category}</p>
              )}
              {children && <p className={`font-body text-base leading-6 md:text-lg ${light ? 'text-navy/85' : 'text-[#f5f4f6]'}`}>{children}</p>}
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (hero) {
    return (
      <section className={sectionClass}>
        {/* the dot grid covers the whole band, from its top edge to its bottom (not just the title row the artwork sits on below `lg`) */}
        <HeaderDots light={light} />
        <div className="mx-auto max-w-[1440px] px-8 pb-10 pt-16 lg:px-[120px]">
          {/* the left column's width: from its left edge up to just short of the circuit (see HeaderDecor's canvas width) */}
          <div className="lg:max-w-[clamp(416px,calc(100vw-803px),640px)]">
            {/* the circuit attaches to this row below `lg`, to the whole band from `lg` up */}
            <div className="relative lg:static">
              {/* on a phone the artwork stands from the band's top edge: its layer reaches up over the band's top padding (pt-16) instead of
                  being the title row only (from `md` up it is the title row again, from `lg` up the layer dissolves and the artwork
                  belongs to the whole band) */}
              {showDecor && <div className="absolute inset-x-0 bottom-0 -top-16 md:inset-0 lg:contents">{decor}</div>}
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
