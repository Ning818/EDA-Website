import { Link } from 'react-router-dom'
import arrowIcon from '../../assets/images/arrow-icon.svg'
import arrowCircleWhite from '../../assets/images/arrow-icon-circle.svg'
import arrowCircleNavy from '../../assets/images/arrow-circle-navy.svg'

/**
 * A "Label →" style link.
 * - `variant="line"` (default): plain rotated arrow glyph, used by the theme showcase rows.
 * - `variant="circle"`: filled circular arrow button, used by the YouTube/LinkedIn CTAs.
 * `tone` picks navy-on-light vs. white-on-dark coloring.
 * `animatedUnderline`: an underline that draws in from left to right under the label on hover (the arrow is
 * not underlined). Used by the homepage's body-copy links.
 */
// The label's underline: a 2px bar painted as a background, 0% wide until the link is hovered/focused, then
// growing to 100% from the left. `clone` so each wrapped line of a long label gets its own bar.
const UNDERLINE_ANIM =
  'bg-[linear-gradient(currentColor,currentColor)] bg-no-repeat bg-left-bottom bg-[length:0%_2px] pb-[2px] [box-decoration-break:clone] transition-[background-size] duration-300 ease-out group-hover:bg-[length:100%_2px] group-focus-visible:bg-[length:100%_2px]'

// In-site paths navigate client-side (so App's ScrollToTop applies, no full page reload); full URLs stay plain anchors.
function Anchor({ href, ...props }) {
  return href.startsWith('/') ? <Link to={href} {...props} /> : <a href={href} {...props} />
}

export default function ArrowLink({ to = '#', children, tone = 'navy', variant = 'line', underline = false, external = false, textClass, animatedUnderline = false }) {
  const ext = external ? { target: '_blank', rel: 'noopener noreferrer' } : {}
  const toneClasses = tone === 'white' ? 'text-white' : 'text-navy'
  const label = animatedUnderline ? <span className={UNDERLINE_ANIM}>{children}</span> : children
  const group = animatedUnderline ? 'group ' : ''

  if (variant === 'circle') {
    return (
      <Anchor href={to} {...ext} className={`${group}inline-flex items-center gap-4 font-heading ${textClass ?? 'text-[32px]'} font-normal ${toneClasses} ${underline ? 'underline' : ''}`}>
        <img
          src={tone === 'white' ? arrowCircleWhite : arrowCircleNavy}
          alt=""
          className="size-10 md:size-[56px]"
          style={{ transform: 'rotate(180deg) scaleY(-1)' }}
        />
        {label}
      </Anchor>
    )
  }

  return (
    <Anchor href={to} className={`${group}inline-flex items-center gap-2 font-heading ${textClass ?? 'text-[28px] lg:text-[32px]'} font-normal ${toneClasses}`}>
      {label}
      <img src={arrowIcon} alt="" className={`size-8 rotate-90 md:size-12 ${tone === 'white' ? 'invert' : ''}`} />
    </Anchor>
  )
}
