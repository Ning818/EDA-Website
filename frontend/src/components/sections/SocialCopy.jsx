import ArrowLink from '../ui/ArrowLink'
import StillCloud, { STILL_CENTERED_BOX } from './StillCloud'
import { YOUTUBE_COPY, LINKEDIN_COPY } from './socialCopyText'
import { STILL_CLOUDS } from './stillClouds'

/**
 * The copy beside the social1 (YouTube) and social2 (LinkedIn) particle clouds. A fixed overlay on the
 * right: ParticleCanvas.jsx's frame loop fades each block in and out (it knows which cloud is showing)
 * by writing opacity / visibility / pointer-events straight onto the `data-social-copy` elements, so
 * they start hidden and un-clickable. z-10 like <main> and the footer, and rendered between them in the
 * DOM: it paints over <main>'s (transparent) content but under the footer, so the footer scrolls over it.
 * On the phone layout the copy is a block along the bottom of the screen instead (the cloud sits above it); both
 * blocks are top-aligned there.
 */
function CopyText({ copy }) {
  return (
    <div className="flex flex-col gap-5 md:gap-8">
      <div className="flex flex-col gap-2 md:gap-3">
        <h2 className="type-meta font-medium uppercase tracking-[0.08em] text-navy">{copy.label}</h2>
        <p className="type-body text-navy">{copy.text}</p>
      </div>
      <ArrowLink to={copy.url} variant="circle" external animatedUnderline>
        {copy.cta}
      </ArrowLink>
    </div>
  )
}

function Block({ id, copy }) {
  return (
    <div
      data-social-copy={id}
      className="absolute top-1/2 right-8 w-[min(500px,calc(100vw-4rem))] max-xl:relative max-xl:top-auto max-xl:right-auto max-xl:w-auto max-xl:mx-auto max-xl:max-w-[40rem] max-xl:self-start max-xl:[grid-area:1/1] xl:right-[calc(max(0px,(100%-1440px)/2)+120px)]"
      style={{ opacity: 0, visibility: 'hidden', pointerEvents: 'none', transform: 'translateY(-50%)' }}
    >
      <CopyText copy={copy} />
    </div>
  )
}

export default function SocialCopy() {
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-0 z-10">
      {/* Phone: both blocks share one grid cell along the bottom, so their top edges line up (the taller one sets the
          height); desktop: `contents`, each block positions itself. */}
      <div data-social-copy-wrap className="max-xl:absolute max-xl:inset-x-8 md:max-xl:inset-x-16 lg:max-xl:inset-x-[120px] max-xl:bottom-14 max-xl:grid xl:contents">
        <Block id="youtube" copy={YOUTUBE_COPY} />
        <Block id="linkedin" copy={LINKEDIN_COPY} />
      </div>
    </div>
  )
}

/**
 * The two social blocks for when the particle canvas is out of order: ordinary one-screen sections like the themes', each with its cloud's still
 * picture (stillClouds.js) in a box of the themes' layout, the picture above the copy, or from xl up on its left. On the phone the picture and its copy are
 * centred in the screen (100svh: what the browser's own bars leave free), so that is where the row stops when it is snapped to. They appear by scrolling, like any
 * other section - nothing fades them in.
 */
export function SocialStill() {
  return (
    // z-10 like <main>: the pictures go behind the text (see StillCloud) and need a stacking context of their own to do it in
    <div className="relative z-10">
      {[
        [STILL_CLOUDS.youtube, YOUTUBE_COPY],
        [STILL_CLOUDS.linkedin, LINKEDIN_COPY],
      ].map(([cloud, copy], i) => (
        <section key={copy.label} data-chapter={i === 0 ? 'social' : undefined} className="mx-auto max-w-[1440px] snap-start">
          <div className="flex h-svh min-h-[min-content] flex-col items-center justify-center gap-5 px-8 md:px-16 pb-8 pt-[4.5rem] md:h-screen md:justify-start xl:flex-row xl:justify-center xl:gap-10 lg:px-[120px] xl:py-[60px]">
            <StillCloud cloud={cloud} className={STILL_CENTERED_BOX} near="bottom" />
            <div className="flex min-w-0 flex-col items-start justify-center xl:flex-1">
              <div className="w-full max-w-[560px] max-xl:mx-auto xl:ml-auto xl:w-[min(500px,100%)]">
                <CopyText copy={copy} />
              </div>
            </div>
          </div>
        </section>
      ))}
    </div>
  )
}
