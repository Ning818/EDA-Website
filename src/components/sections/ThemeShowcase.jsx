import ArrowLink from '../ui/ArrowLink'
import ParticlePlaceholder from '../ui/ParticlePlaceholder'
import { themeByName } from '../../themes'

/**
 * One of the four alternating "theme" rows on the homepage (VLSI-CAD, Bioinformatics,
 * Smart City, Industry 4.0). `imageSide` flips which side the visual sits on.
 */
export default function ThemeShowcase({ theme, imageSide = 'left', visual: customVisual, copy, gapAfter = 0, dwell = 60, phoneLift = 0 }) {
  const visual = customVisual ?? (
    <ParticlePlaceholder label={`${theme} particle visual effect.`} className="h-[478px] w-full max-w-[531px] shrink-0" />
  )

  // Phone layout: with the cloud on top (imageSide 'left') the copy sits 24px higher than the stack puts it (more room
  // under it) and may then overlap the cloud's lower edge, which is fine; with the cloud at the bottom ('right') the
  // copy comes first, a little lower to clear the header.
  // `phoneLift` (px): lifts this theme's copy a further bit on the phone layout (with the cloud on top), e.g. where the cloud is small
  // and leaves a wide gap above the text.
  // With the visual on the left the text block sits flush right, 500px wide - exactly where the social-media copy
  // (SocialCopy.jsx) sits, so the first and third themes line up with it.
  // The links name the theme in their text; a long theme name uses its short form there so each link stays on one line.
  const linkName = themeByName(theme)?.short ?? theme
  const links = (
    <div
      style={phoneLift ? { '--copy-lift': `${phoneLift}px` } : undefined}
      className={`flex min-w-0 flex-1 flex-col items-start justify-center max-md:flex-none ${imageSide === 'left' ? 'max-md:translate-y-[calc(-1.5rem-var(--copy-lift,0px))]' : ''}`}
    >
      <div className={`flex flex-col items-start gap-5 md:gap-8 lg:gap-11 ${imageSide === 'left' ? 'ml-auto w-[min(500px,100%)]' : ''}`}>
        {/* small all-caps label over the copy (the theme's name), like an eyebrow line */}
        <div className="flex flex-col items-start gap-2 md:gap-3">
          <p className="font-body text-sm uppercase text-navy md:text-base">{theme}</p>
          {copy && <p className={`font-body text-base leading-[1.45] text-navy md:text-2xl ${imageSide === 'left' ? '' : 'max-w-[554px]'}`}>{copy}</p>}
        </div>
        {/* the two links read as one block: no blank line between them */}
        <div className="flex flex-col items-start">
          <ArrowLink to={themeByName(theme)?.research ?? '/research'} textClass="text-base md:text-2xl" animatedUnderline>{`Discover ${linkName} Research`}</ArrowLink>
          <ArrowLink to={themeByName(theme)?.projects ?? '/research/funded-projects'} textClass="text-base md:text-2xl" animatedUnderline>{`View ${linkName} Funded Projects`}</ArrowLink>
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
      <div data-pin data-side={imageSide} className={`sticky top-0 flex h-screen flex-col items-center justify-center gap-10 px-8 py-16 max-md:justify-start max-md:gap-5 max-md:pb-8 md:flex-row md:py-[60px] lg:px-[120px] ${imageSide === 'right' ? 'max-md:pt-[4.5rem]' : ''}`}>
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
