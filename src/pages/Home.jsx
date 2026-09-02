import Hero from '../components/sections/Hero'
import ThemeShowcase from '../components/sections/ThemeShowcase'
import YoutubeSpotlight from '../components/sections/YoutubeSpotlight'
import LinkedInSection from '../components/sections/LinkedInSection'
import IndustryArmScene from '../three/IndustryArmScene'

const THEMES = [
  { theme: 'VLSI-CAD', imageSide: 'left' },
  { theme: 'Bioinformatics', imageSide: 'right' },
  { theme: 'Smart City', imageSide: 'left' },
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
