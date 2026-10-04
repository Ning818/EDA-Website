import ArrowLink from '../ui/ArrowLink'
import ParticlePlaceholder from '../ui/ParticlePlaceholder'

/**
 * One of the four alternating "theme" rows on the homepage (VLSI-CAD, Bioinformatics,
 * Smart City, Industry 4.0). `imageSide` flips which side the visual sits on.
 */
export default function ThemeShowcase({ theme, imageSide = 'left', visual: customVisual, copy, gapAfter = 0, dwell = 80 }) {
  const visual = customVisual ?? (
    <ParticlePlaceholder label={`${theme} particle visual effect.`} className="h-[478px] w-full max-w-[531px] shrink-0" />
  )

  // With the visual on the left the text block sits flush right, 500px wide - exactly where the social-media copy
  // (SocialCopy.jsx) sits, so the first and third themes line up with it.
  const links = (
    <div className="flex min-w-0 flex-1 flex-col items-start justify-center max-md:order-last max-md:flex-none">
      <div className={`flex flex-col items-start gap-5 md:gap-8 lg:gap-11 ${imageSide === 'left' ? 'ml-auto w-[min(500px,100%)]' : ''}`}>
        {copy && <p className={`font-body text-base leading-[1.45] text-navy md:text-2xl ${imageSide === 'left' ? '' : 'max-w-[554px]'}`}>{copy}</p>}
        {/* the two links read as one block: no blank line between them */}
        <div className="flex flex-col items-start">
          <ArrowLink to={`/research#${slug(theme)}`} textClass="text-base md:text-2xl" animatedUnderline>{`Discover ${theme} Research`}</ArrowLink>
          <ArrowLink to="/research/funded-projects" textClass="text-base md:text-2xl" animatedUnderline>{`View ${theme} Funded Projects`}</ArrowLink>
        </div>
      </div>
    </div>
  )

  return (
    // The section is taller than the screen (100vh of pinned content + 80vh of extra scroll): its
    // content is sticky, so once the section reaches the top the text stays put - centered - for that
    // extra scroll distance while the particle cloud holds its finished shape, giving time to read.
    // `dwell` is the extra vh held still; `gapAfter` (vh) adds further empty scroll below it: that is where the cloud transitions to
    // the next theme's shape, so the transition (spin, slide, explode, regather) gets a longer scroll.
    <section className="mx-auto max-w-[1440px] snap-start" style={{ minHeight: `${100 + dwell}vh`, marginBottom: gapAfter ? `${gapAfter}vh` : undefined }}>
      <div data-pin className="sticky top-0 flex h-screen flex-col items-center justify-center gap-10 px-8 py-16 max-md:justify-start max-md:gap-5 max-md:pb-8 md:flex-row md:py-[60px] lg:px-[120px]">
      {imageSide === 'left' ? (
        <>
          {visual}
          {links}
        </>
      ) : (
        <>
          {links}
          {visual}
        </>
      )}
      </div>
    </section>
  )
}

function slug(theme) {
  return theme.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}
