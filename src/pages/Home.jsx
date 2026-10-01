import Hero from '../components/sections/Hero'
import ThemeShowcase from '../components/sections/ThemeShowcase'
import YoutubeSpotlight from '../components/sections/YoutubeSpotlight'
import LinkedInSection from '../components/sections/LinkedInSection'
import IndustryArmScene from '../three/IndustryArmScene'
import SmartCityScene from '../three/SmartCityScene'
import DNAScene from '../three/DNAScene'
import ParticleCanvas from '../three/ParticleCanvas'
import VLSICADScene from '../three/VLSICADScene'

const THEMES = [
  {
    theme: 'VLSI-CAD',
    imageSide: 'left',
    dwell: 80, // vh of scroll the finished cloud holds still
    gap: 200, // vh of scroll for the transition into the next theme
    visual: <VLSICADScene className="h-[478px] w-full max-w-[531px] shrink-0" />,
  },
  {
    theme: 'Bioinformatics',
    imageSide: 'right',
    dwell: 80,
    gap: 200,
    visual: <DNAScene className="h-[478px] w-full max-w-[531px] shrink-0" />,
  },
  {
    theme: 'Smart City',
    imageSide: 'left',
    dwell: 80,
    gap: 200,
    visual: <SmartCityScene className="h-[478px] w-full max-w-[531px] shrink-0" />,
  },
  {
    theme: 'Industry 4.0',
    imageSide: 'right',
    gap: 500, // vh of scroll for the arm's closing turn, its change into the social-media chip cluster, and a hold on it
    visual: <IndustryArmScene className="h-[478px] w-full max-w-[531px] shrink-0" />,
  },
]

export default function Home() {
  return (
    <>
      <ParticleCanvas />
      <main className="relative z-10">
      <Hero />
      {/* Empty scroll: the brain's move + regather + VLSI-CAD turn needs a long stretch, like every other transition. */}
      <div aria-hidden style={{ height: '200vh' }} />
      {THEMES.map((t, i) => (
        <ThemeShowcase key={t.theme} theme={t.theme} imageSide={t.imageSide} visual={t.visual} dwell={t.dwell} gapAfter={t.gap ?? 100} />
      ))}
      <YoutubeSpotlight />
      <LinkedInSection />
      </main>
    </>
  )
}
