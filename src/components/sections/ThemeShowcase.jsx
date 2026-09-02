import ArrowLink from '../ui/ArrowLink'
import ParticlePlaceholder from '../ui/ParticlePlaceholder'

/**
 * One of the four alternating "theme" rows on the homepage (VLSI-CAD, Bioinformatics,
 * Smart City, Industry 4.0). `imageSide` flips which side the visual sits on.
 */
export default function ThemeShowcase({ theme, imageSide = 'left', visual: customVisual }) {
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
    <section className="mx-auto flex min-h-screen max-w-[1440px] flex-col items-center justify-center gap-10 px-8 py-16 md:flex-row md:py-[60px] lg:px-[120px]">
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
    </section>
  )
}

function slug(theme) {
  return theme.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}
