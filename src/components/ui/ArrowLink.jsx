import arrowIcon from '../../assets/images/arrow-icon.svg'
import arrowCircleWhite from '../../assets/images/arrow-icon-circle.svg'
import arrowCircleNavy from '../../assets/images/arrow-circle-navy.svg'

/**
 * A "Label →" style link.
 * - `variant="line"` (default): plain rotated arrow glyph, used by the theme showcase rows.
 * - `variant="circle"`: filled circular arrow button, used by the YouTube/LinkedIn CTAs.
 * `tone` picks navy-on-light vs. white-on-dark coloring.
 */
export default function ArrowLink({ to = '#', children, tone = 'navy', variant = 'line', underline = false }) {
  const toneClasses = tone === 'white' ? 'text-white' : 'text-navy'

  if (variant === 'circle') {
    return (
      <a href={to} className={`inline-flex items-center gap-4 font-heading text-[32px] font-normal ${toneClasses} ${underline ? 'underline' : ''}`}>
        <img
          src={tone === 'white' ? arrowCircleWhite : arrowCircleNavy}
          alt=""
          className="size-[56px]"
          style={{ transform: 'rotate(180deg) scaleY(-1)' }}
        />
        {children}
      </a>
    )
  }

  return (
    <a href={to} className={`inline-flex items-center gap-2 font-heading text-[28px] font-normal lg:text-[32px] ${toneClasses}`}>
      {children}
      <img src={arrowIcon} alt="" className={`size-12 rotate-90 ${tone === 'white' ? 'invert' : ''}`} />
    </a>
  )
}
