import ArrowLink from '../ui/ArrowLink'

/**
 * A full-width "highlight" row pairing an image with a heading/paragraph/CTA,
 * used for the Thesis (dark bg) and Funded Projects (light bg) spotlights.
 */
export default function HighlightBand({ title, children, image, imageAlt, ctaLabel, ctaTo, imageSide = 'left', dark = false }) {
  const textBlock = (
    <div className="flex w-full max-w-[564px] flex-col gap-6">
      <h2 className={`type-h2 ${dark ? 'text-white' : 'text-navy'}`}>{title}</h2>
      <p className={`type-body ${dark ? 'text-white' : 'text-navy'}`}>{children}</p>
      <ArrowLink to={ctaTo} variant="circle" tone={dark ? 'white' : 'navy'} underline>
        {ctaLabel}
      </ArrowLink>
    </div>
  )

  const imageBlock = (
    <img src={image} alt={imageAlt} className="w-full max-w-[564px] shrink-0 rounded-sm object-cover" />
  )

  return (
    <section className={dark ? 'bg-navy' : 'bg-mint'}>
      <div className="mx-auto flex max-w-[1440px] flex-col items-center gap-10 px-8 py-16 md:flex-row md:justify-between md:py-[68px] lg:px-[120px]">
        {imageSide === 'left' ? (
          <>
            {imageBlock}
            {textBlock}
          </>
        ) : (
          <>
            {textBlock}
            {imageBlock}
          </>
        )}
      </div>
    </section>
  )
}
