import ArrowLink from '../ui/ArrowLink'
import { YOUTUBE_COPY, LINKEDIN_COPY } from './socialCopyText'

/**
 * The copy beside the social1 (YouTube) and social2 (LinkedIn) particle clouds. A fixed overlay on the
 * right: ParticleCanvas.jsx's frame loop fades each block in and out (it knows which cloud is showing)
 * by writing opacity / visibility / pointer-events straight onto the `data-social-copy` elements, so
 * they start hidden and un-clickable. z-10 like <main> and the footer, and rendered between them in the
 * DOM: it paints over <main>'s (transparent) content but under the footer, so the footer scrolls over it.
 * On the phone layout the copy is a block along the bottom of the screen instead (the cloud sits above it); both
 * blocks are top-aligned there.
 */
function Block({ id, copy }) {
  return (
    <div
      data-social-copy={id}
      className="absolute top-1/2 right-8 w-[min(500px,calc(100vw-4rem))] max-md:relative max-md:top-auto max-md:right-auto max-md:w-auto max-md:self-start max-md:[grid-area:1/1] lg:right-[calc(max(0px,(100%-1440px)/2)+120px)]"
      style={{ opacity: 0, visibility: 'hidden', pointerEvents: 'none', transform: 'translateY(-50%)' }}
    >
      <div className="flex flex-col gap-5 md:gap-8">
        <div className="flex flex-col gap-2 md:gap-3">
          <p className="font-body text-sm uppercase text-navy md:text-base">{copy.label}</p>
          <p className="font-body text-base leading-[1.45] text-navy md:text-2xl">{copy.text}</p>
        </div>
        <ArrowLink to={copy.url} variant="circle" external textClass="text-base md:text-2xl" animatedUnderline>
          {copy.cta}
        </ArrowLink>
      </div>
    </div>
  )
}

export default function SocialCopy() {
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-0 z-10">
      {/* Phone: both blocks share one grid cell along the bottom, so their top edges line up (the taller one sets the
          height); desktop: `contents`, each block positions itself. */}
      <div data-social-copy-wrap className="max-md:absolute max-md:inset-x-8 max-md:bottom-14 max-md:grid md:contents">
        <Block id="youtube" copy={YOUTUBE_COPY} />
        <Block id="linkedin" copy={LINKEDIN_COPY} />
      </div>
    </div>
  )
}
