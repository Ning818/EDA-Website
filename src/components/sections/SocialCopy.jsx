import ArrowLink from '../ui/ArrowLink'
import { YOUTUBE_COPY, LINKEDIN_COPY } from './socialCopyText'

/**
 * The copy beside the social1 (YouTube) and social2 (LinkedIn) particle clouds. A fixed overlay on the
 * right: ParticleCanvas.jsx's frame loop fades each block in and out (it knows which cloud is showing)
 * by writing opacity / visibility / pointer-events straight onto the `data-social-copy` elements, so
 * they start hidden and un-clickable. z-10 like <main> and the footer, and rendered between them in the
 * DOM: it paints over <main>'s (transparent) content but under the footer, so the footer scrolls over it.
 * On the phone layout the copy is a block along the bottom of the screen instead (the cloud sits above it).
 */
function Block({ id, copy }) {
  return (
    <div
      data-social-copy={id}
      className="absolute top-1/2 right-8 w-[min(500px,calc(100vw-4rem))] max-md:top-auto max-md:bottom-8 max-md:left-8 max-md:w-auto lg:right-[calc(max(0px,(100%-1440px)/2)+120px)]"
      style={{ opacity: 0, visibility: 'hidden', pointerEvents: 'none', transform: 'translateY(-50%)' }}
    >
      <div className="flex flex-col gap-5 md:gap-8">
        <p className="font-body text-base leading-[1.45] text-navy md:text-2xl">{copy.text}</p>
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
      <Block id="youtube" copy={YOUTUBE_COPY} />
      <Block id="linkedin" copy={LINKEDIN_COPY} />
    </div>
  )
}
