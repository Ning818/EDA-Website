import ArrowLink from '../ui/ArrowLink'
import ParticlePlaceholder from '../ui/ParticlePlaceholder'

/**
 * One of the four alternating "theme" rows on the homepage (VLSI-CAD, Bioinformatics,
 * Smart City, Industry 4.0). `imageSide` flips which side the visual sits on.
 */
export default function ThemeShowcase({ theme, imageSide = 'left', visual: customVisual, gapAfter = 0, dwell = 80 }) {
  const visual = customVisual ?? (
    <ParticlePlaceholder label={`${theme} particle visual effect.`} className="h-[478px] w-full max-w-[531px] shrink-0" />
  )

  const links = (
    <div className="flex min-w-0 flex-1 flex-col items-start justify-center gap-8 lg:gap-11">
      <ArrowLink to={`/research#${slug(theme)}`}>{`Discover ${theme} Research`}</ArrowLink>
      <ArrowLink to="/research/funded-projects">{`View ${theme} Funded Projects`}</ArrowLink>
    </div>
  )

  return (
    // The section is taller than the screen (100vh of pinned content + 80vh of extra scroll): its
    // content is sticky, so once the section reaches the top the text stays put - centered - for that
    // extra scroll distance while the particle cloud holds its finished shape, giving time to read.
    // `dwell` is the extra vh held still; `gapAfter` (vh) adds further empty scroll below it: that is where the cloud transitions to
    // the next theme's shape, so the transition (spin, slide, explode, regather) gets a longer scroll.
    <section className="mx-auto max-w-[1440px] snap-start" style={{ minHeight: `${100 + dwell}vh`, marginBottom: gapAfter ? `${gapAfter}vh` : undefined }}>
      <div data-pin className="sticky top-0 flex h-screen flex-col items-center justify-center gap-10 px-8 py-16 md:flex-row md:py-[60px] lg:px-[120px]">
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
