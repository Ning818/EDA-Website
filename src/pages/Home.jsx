import Hero from '../components/sections/Hero'
import ThemeShowcase from '../components/sections/ThemeShowcase'
import YoutubeSpotlight from '../components/sections/YoutubeSpotlight'
import LinkedInSection from '../components/sections/LinkedInSection'
import IndustryArmScene from '../three/IndustryArmScene'
import SmartCityScene from '../three/SmartCityScene'
import DNAScene from '../three/DNAScene'
import VLSICADScene from '../three/VLSICADScene'

const THEMES = [
  {
    theme: 'VLSI-CAD',
    imageSide: 'left',
    visual: <VLSICADScene className="h-[478px] w-full max-w-[531px] shrink-0" />,
  },
  {
    theme: 'Bioinformatics',
    imageSide: 'right',
    visual: <DNAScene className="h-[478px] w-full max-w-[531px] shrink-0" />,
  },
  {
    theme: 'Smart City',
    imageSide: 'left',
    visual: <SmartCityScene className="h-[478px] w-full max-w-[531px] shrink-0" />,
  },
  {
    theme: 'Industry 4.0',
    imageSide: 'right',
    visual: <IndustryArmScene className="h-[478px] w-full max-w-[531px] shrink-0" />,
  },
]

export default function Home() {
  return (
    <main>
      <Hero />
      {THEMES.map((t) => (
        <ThemeShowcase key={t.theme} theme={t.theme} imageSide={t.imageSide} visual={t.visual} />
      ))}
      <YoutubeSpotlight />
      <LinkedInSection />
    </main>
  )
}
