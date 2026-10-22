import ArrowLink from '../ui/ArrowLink'
import { themeByName } from '../../themes'

/**
 * One of the four alternating "theme" rows on the homepage (VLSI-CAD, Bioinformatics,
 * Smart City, Industry 4.0). `imageSide` flips which side the visual sits on. `still`: the layout for the still pictures that stand in for the particle
 * clouds when the canvas is out of order (see Home.jsx): an ordinary screen of at least one screen's height (more only where the copy and a picture
 * of 240px do not fit), the copy and the picture stacked below xl - the picture taking what the copy leaves, as the live cloud does on the phone - and
 * side by side from xl up; nothing is pinned and no scroll is set aside (`dwell`, `gapAfter` do not apply). `snapUp`: on the phone the row is snapped to
 * 40px further down, so its content stands that much higher on the screen.
 */
export default function ThemeShowcase({ theme, imageSide = 'left', visual, still = false, snapUp = false, copy, gapAfter = 0, dwell = 60, phoneLift = 0 }) {

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
      className={
        still
          ? 'flex min-w-0 flex-col items-start justify-center xl:flex-1'
          : `flex min-w-0 flex-1 flex-col items-start justify-center max-xl:w-full max-xl:max-w-[40rem] max-xl:flex-none ${imageSide === 'left' ? 'max-xl:translate-y-[calc(-1.5rem-var(--copy-lift,0px))]' : ''}`
      }
    >
      <div
        className={
          still
            ? `flex w-full max-w-[560px] flex-col items-start max-xl:mx-auto gap-5 md:gap-8 xl:max-w-none xl:gap-11 ${imageSide === 'left' ? 'xl:ml-auto xl:w-[min(500px,100%)]' : ''}`
            : `flex flex-col items-start gap-5 md:gap-8 lg:gap-11 ${imageSide === 'left' ? 'xl:ml-auto xl:w-[min(500px,100%)]' : ''}`
        }
      >
        {/* the theme's name heads its section */}
        <div className="flex flex-col items-start gap-2 md:gap-3">
          <h2 className={`type-h2 text-navy ${imageSide === 'left' ? '' : 'xl:max-w-[554px]'}`}>{theme}</h2>
          {copy && <p className={`type-body text-navy ${imageSide === 'left' ? '' : 'xl:max-w-[554px]'}`}>{copy}</p>}
        </div>
        {/* the two links read as one block: no blank line between them */}
        <div className="flex flex-col items-start">
          <ArrowLink to={themeByName(theme)?.research ?? '/research'} animatedUnderline>{`Discover ${linkName} Research`}</ArrowLink>
          <ArrowLink to={themeByName(theme)?.projects ?? '/research/funded-projects'} animatedUnderline>{`View ${linkName} Funded Projects`}</ArrowLink>
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
    <section data-chapter={themeByName(theme)?.slug} className={`mx-auto max-w-[1440px] snap-start ${still && snapUp ? 'max-md:-scroll-mt-10' : ''}`} style={still ? undefined : { minHeight: `${100 + dwell}vh`, marginBottom: gapAfter ? `${gapAfter}vh` : undefined }}>
      <div data-pin data-side={imageSide} className={
        still
          ? 'flex h-screen min-h-[min-content] flex-col items-center justify-start gap-5 px-8 md:px-16 pb-8 pt-[4.5rem] xl:flex-row xl:justify-center xl:gap-10 lg:px-[120px] xl:py-[60px]'
          : `sticky top-0 flex h-screen flex-col items-center justify-center gap-10 px-8 md:px-16 py-16 max-xl:justify-start max-xl:gap-5 max-xl:pb-8 xl:flex-row xl:py-[60px] lg:px-[120px] ${imageSide === 'right' ? 'max-xl:pt-[4.5rem]' : ''}`
      }
      >
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
