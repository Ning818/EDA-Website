import ArrowLink from '../ui/ArrowLink'
import youtubeThumbnail from '../../assets/images/youtube-thumbnail.png'

const CHANNEL_URL = 'https://www.youtube.com/@edagrouppolito329/videos'

export default function YoutubeSpotlight() {
  return (
    <section className="bg-navy">
      <div className="mx-auto flex max-w-[1440px] flex-col items-center gap-10 px-8 py-16 md:flex-row md:gap-16 md:py-24 lg:px-[120px]">
        <a href={CHANNEL_URL} target="_blank" rel="noreferrer" className="w-full shrink-0 md:w-auto">
          <img src={youtubeThumbnail} alt="EDA Group YouTube channel" className="w-full rounded-sm md:w-[564px]" />
        </a>
        <div className="flex max-w-[554px] flex-col gap-8">
          <p className="font-body text-2xl leading-[1.45] text-white">
            Discover how our automated techniques are transforming complex systems through interdisciplinary research
            across VLSI-CAD, Bioinformatics, and Smart City domains. By collaborating closely with research
            institutions and industry experts, we develop innovative digital twin and co-simulation solutions.
            Explore our YouTube channel to see our tools in action and view our latest technical developments.
          </p>
          <ArrowLink to={CHANNEL_URL} tone="white" variant="circle" underline>
            Explore our YouTube channel
          </ArrowLink>
        </div>
      </div>
    </section>
  )
}
