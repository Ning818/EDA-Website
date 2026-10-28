import { useLayoutEffect, useRef } from 'react'
import CanvasBoundary from '../ui/CanvasBoundary'
import HeaderDecor from './HeaderDecor'
import FactoryDecor from './FactoryDecor'
import FactoryParticles from './FactoryParticles'
import HeaderDots from './HeaderDots'
import HelixDecor from './HelixDecor'
import HelixParticles from './HelixParticles'
import SkylineDecor from './SkylineDecor'
import SkylineParticles from './SkylineParticles'

/**
 * The page title, optionally kept on ONE line from `lg` up (`fit`): it is laid out without wrapping at its usual size and, when
 * that is wider than the band's content box (`boxRef`), the font size is scaled down just enough to fit - re-measured on resize
 * and once the fonts have loaded, so it also holds when a wider typeface replaces the fallback. Below `lg` it wraps as usual
 * (one line would need a tiny type size there, and the artwork sits behind the title row from `md`).
 */
function FitTitle({ fit, boxRef, className, children }) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    if (!fit) return undefined
    const el = ref.current
    const run = () => {
      el.style.fontSize = ''
      const box = boxRef.current
      if (!box || !window.matchMedia('(min-width: 1024px)').matches) return
      const cs = getComputedStyle(box)
      const avail = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
      const width = el.scrollWidth
      if (width > avail) el.style.fontSize = `${Math.floor((parseFloat(getComputedStyle(el).fontSize) * avail) / width)}px`
    }
    run()
    window.addEventListener('resize', run)
    // `fonts.ready` can settle before the title's typeface has even been requested, so measure again whenever a font finishes loading
    document.fonts?.ready.then(run)
    document.fonts?.addEventListener('loadingdone', run)
    return () => {
      window.removeEventListener('resize', run)
      document.fonts?.removeEventListener('loadingdone', run)
    }
  }, [fit, boxRef, children])
  return (
    <h1 ref={ref} className={`${fit ? 'lg:whitespace-nowrap ' : ''}${className}`}>
      {children}
    </h1>
  )
}

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
 * city in `decorColor`, see SkylineDecor), 'helix-particles' (Bioinformatics' DNA made of flat particles, see HelixParticles, whose two looks `decorPage` picks; 'helix' is the same in thin lines, see HelixDecor), 'factory-particles' (Industry 4.0's smart factory made of flat particles, see FactoryParticles, whose two looks `decorPage` picks; 'factory' is the same in thin lines, see FactoryDecor), 'skyline-particles' (the same city made of flat particles, see SkylineParticles; `decorPage`, 'research' | 'projects', picks
 * which of its two looks), or 'none' to leave that area empty (a theme page whose artwork is not designed yet).
 *
 * `backdrop` (with `textWidth`; `after` goes under the paragraph here too): the plain band with a picture of its own drawn behind the text, see the branch below; with a `title`
 * the category is the small eyebrow over a big title (as on the decorated pages), without one it is the page's heading; `titleVeil`: a feathered translucent layer of the page's colour behind the title block, to pale the backdrop there; `titleFit` (hero layout): keep the title on one line from `lg` up, shrinking its type only as far as needed (see FitTitle); `introVeil` (hero layout): a translucent veil over the artwork where the paragraph meets it, from `lg` up; `bandBg`: the
 * band's background class ('' to let the page's own show through, and the backdrop overflow the band instead of being cut at its edge); `light`: navy type and a hairline under the band (`bandRule={false}` leaves the hairline out), for a light page.
 *
 * Decorated with an intro paragraph (`children`) is a two-column header from `lg` up: eyebrow, title and paragraph stacked
 * in a left column that stops short of the circuit, the circuit vertically centred on the right. Below `lg` it is one
 * column - the circuit sits faintly behind the title and the paragraph runs full width underneath.
 */
export default function PageIntroBand({ category, title, children, decorated = false, light = false, decorVariant, decorColor, decorPage, after, backdrop, textWidth = '', backdropPad = 'pb-10 lg:pb-14', bandBg = 'bg-navy', bandRule = true, titleVeil = false, titleFit = false, introVeil = false }) {
  const boxRef = useRef(null)
  const onLight = decorated && light
  const hero = decorated && children
  const showDecor = decorated && decorVariant !== 'none'
  const artwork =
    decorVariant === 'skyline' ? (
      <SkylineDecor color={decorColor} light={light} />
    ) : decorVariant === 'helix-particles' ? (
      <HelixParticles color={decorColor} variant={decorPage} />
    ) : decorVariant === 'helix' ? (
      <HelixDecor color={decorColor} />
    ) : decorVariant === 'factory-particles' ? (
      <FactoryParticles color={decorColor} variant={decorPage} />
    ) : decorVariant === 'factory' ? (
      <FactoryDecor color={decorColor} light={light} />
    ) : decorVariant === 'skyline-particles' ? (
      <SkylineParticles color={decorColor} variant={decorPage} />
    ) : (
      <HeaderDecor variant={decorVariant} />
    )
  // the artwork is decoration: if its canvas cannot be drawn on, it is left out and the band's text stays (an error in it would otherwise take the whole page down)
  const decor = <CanvasBoundary>{artwork}</CanvasBoundary>
  const eyebrow = (
    <>
      <p className={`type-meta font-medium uppercase tracking-[0.08em] ${onLight ? 'text-teal-text' : 'text-[#279aae]'}`}>{category}</p>
      {title && (
        <FitTitle fit={titleFit} boxRef={boxRef} className={`text-balance type-h1 tracking-tight ${onLight ? 'text-navy' : 'text-white'}`}>
          {title}
        </FitTitle>
      )}
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
          <CanvasBoundary>{backdrop}</CanvasBoundary>
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
                  <p className={`type-meta font-medium uppercase tracking-[0.08em] ${light ? 'text-teal-text' : 'text-[#279aae]'}`}>{category}</p>
                  <h1 className={`type-h1 tracking-tight ${light ? 'text-navy' : 'text-white'}`}>{title}</h1>
                </div>
              ) : (
                <h1 className="type-h1 tracking-tight text-[#279aae]">{category}</h1>
              )}
              {children && <p className={`type-lead ${light ? 'text-navy/85' : 'text-[#f5f4f6]'}`}>{children}</p>}
              {after}
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
        <div ref={boxRef} className="mx-auto max-w-[1440px] px-8 pb-10 pt-16 lg:px-[120px]">
          {/* the left column's width: from its left edge up to just short of the circuit (see HeaderDecor's canvas width) */}
          <div className="lg:max-w-[clamp(456px,calc(100vw-763px),700px)]">
            {/* the circuit attaches to this row below `lg`, to the whole band from `lg` up */}
            <div className="relative lg:static">
              {/* on a phone the artwork stands from the band's top edge: its layer reaches up over the band's top padding (pt-16) instead of
                  being the title row only (from `md` up it is the title row again, from `lg` up the layer dissolves and the artwork
                  belongs to the whole band) */}
              {showDecor && <div className="absolute inset-x-0 bottom-0 -top-16 md:inset-0 lg:contents">{decor}</div>}
              <div className="relative z-10 flex flex-col gap-2.5">{eyebrow}</div>
            </div>
            <div className="relative">
              {/* `introVeil`: from `lg` up the paragraph meets the artwork's left edge; a translucent layer of the band's colour between them,
                  feathered at its edges (index.css, .intro-veil; it reaches past the paragraph's right edge, where it fades), pales the
                  particles there */}
              {showDecor && introVeil && <span aria-hidden="true" className={`intro-veil pointer-events-none absolute -inset-y-4 -left-6 -right-20 z-[5] hidden lg:block ${onLight ? 'bg-mint/80' : 'bg-navy/70'}`} />}
              <p className={`relative z-10 pt-6 type-body ${onLight ? 'text-navy/85' : 'text-[#f5f4f6]'}`}>{children}</p>
            </div>
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
                {title ? <p className="type-h1 tracking-tight text-[#279aae]">{category}</p> : <h1 className="type-h1 tracking-tight text-[#279aae]">{category}</h1>}
                {title && <h1 className="type-h1 tracking-tight text-white">{title}</h1>}
              </>
            )}
          </div>
          {children && (
            <div className="mx-auto max-w-[1440px] px-8 pb-10 pt-6 lg:px-[120px]">
              <p className={`type-body ${onLight ? 'text-navy/85' : 'text-[#f5f4f6]'}`}>{children}</p>
            </div>
          )}
          {after}
        </div>
      </div>
    </section>
  )
}
