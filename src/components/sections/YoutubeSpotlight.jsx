import ArrowLink from '../ui/ArrowLink'
import youtubeThumbnail from '../../assets/images/youtube-thumbnail.png'

import { YOUTUBE_COPY } from '../../content/social'

const CHANNEL_URL = YOUTUBE_COPY.url

export default function YoutubeSpotlight() {
  return (
    <section className="bg-navy">
      <div className="mx-auto flex max-w-[1440px] flex-col items-center gap-10 px-8 py-16 md:flex-row md:gap-16 md:py-24 lg:px-[120px]">
        <a href={CHANNEL_URL} target="_blank" rel="noreferrer" className="w-full shrink-0 md:w-auto">
          <img src={youtubeThumbnail} alt="EDA Group YouTube channel" className="w-full rounded-sm md:w-[564px]" />
        </a>
        <div className="flex max-w-[554px] flex-col gap-8">
          <p className="font-body text-2xl leading-[1.45] text-white">{YOUTUBE_COPY.text}</p>
          <ArrowLink to={CHANNEL_URL} tone="white" variant="circle" underline>
            {YOUTUBE_COPY.cta}
          </ArrowLink>
        </div>
      </div>
    </section>
  )
}
