import Hero from '../components/sections/Hero'
import ThemeShowcase from '../components/sections/ThemeShowcase'
import SocialCopy from '../components/sections/SocialCopy.jsx'
import IndustryArmScene from '../three/IndustryArmScene'
import SmartCityScene from '../three/SmartCityScene'
import DNAScene from '../three/DNAScene'
import ParticleCanvas, { SOCIAL_HOLD_SCREENS, ARM_EXIT_SCREENS } from '../three/ParticleCanvas'
import VLSICADScene from '../three/VLSICADScene'

// The box a theme's particle cloud is anchored to. On the phone layout (stacked) the clouds alternate between the top and
// the bottom of the pinned screen the way they alternate left and right on desktop (imageSide 'left' -> cloud on top,
// 'right' -> cloud at the bottom): the box takes whatever height the copy leaves and is a size container, so the
// cloud's anchor can size itself to fit it (index.css, .phone-cloud).
const VISUAL_BOX =
  'h-[478px] w-full max-w-[531px] shrink-0 max-md:h-auto max-md:min-h-0 max-md:max-w-none max-md:flex-1 max-md:shrink max-md:[container-type:size]'

const THEMES = [
  {
    theme: 'VLSI-CAD',
    copy: 'The EDA group works on Design Automation for standard digital CMOS circuits, Beyond-CMOS technologies and Electrical Energy Systems. We develop CAD algorithms and prototype tools for low-power, variation-tolerant integrated circuits, model Graphene-based devices for flexible, ultra-low-power circuits, and build simulation and run-time charge and thermal management for hybrid-source energy systems.',
    imageSide: 'left',
    dwell: 60, // vh of scroll the finished cloud holds still
    gap: 161, // vh of scroll for the transition into the next theme (VLSI's timeline is 0.87 long: the transition spans gap + 100vh = 0.87 x 300vh)
    visual: <VLSICADScene className={VISUAL_BOX} />,
  },
  {
    theme: 'Bioinformatics',
    copy: 'With long-term experience in bioinformatics, the EDA group designs software and hardware-software solutions to manage, analyze and interpret complex biological and medical data. Our work spans gene expression and regulatory networks, sequencing data, medical image analysis, GPU and FPGA acceleration and neuromorphic computing, with hospitals and research centers.',
    imageSide: 'right',
    dwell: 60,
    gap: 161, // 0.87 x 300vh - see scatteredTimeline in ParticleCanvas.jsx
    visual: <DNAScene className={VISUAL_BOX} />,
  },
  {
    theme: 'Smart City',
    copy: 'ICT is key to optimizing energy use in the Smart City, and that is where our software solutions come in. We research distributed software and middleware that make energy, environmental and user-feedback data interoperable, visual web interfaces giving real-time feedback on energy impact, and building information models linked to real-time data.',
    imageSide: 'left',
    dwell: 60,
    gap: 161, // 0.87 x 300vh - see scatteredTimeline in ParticleCanvas.jsx
    phoneLift: 40, // px: on the phone the copy sits this much higher than the other left-hand themes' (the cloud above is small)
    visual: <SmartCityScene className={VISUAL_BOX} />,
  },
  {
    theme: 'Industry 4.0 and Smart Manufacturing', // must equal the name in themes.js (the home page looks the theme's links up by it)
    copy: 'In the fourth industrial revolution, connected products and massive IoT and Big Data usage demand a new technology infrastructure. The EDA group applies its expertise in IoT, cyber-physical systems, wireless sensor networks and machine learning to make manufacturing more efficient, responsive to demand and optimized across supply chains.',
    imageSide: 'right',
    // vh of scroll after the arm's pin releases, all spent on the social-media stage: the arm -> social1 transition,
    // the social1 hold, then the social2 hold (the same length as social1's) before the footer scrolls in. The
    // social1 -> social2 morph in between plays by itself (time-based), so it takes no scroll of its own.
    gap: (ARM_EXIT_SCREENS + 2 * SOCIAL_HOLD_SCREENS) * 100,
    visual: <IndustryArmScene className={VISUAL_BOX} />,
  },
]

export default function Home() {
  return (
    <>
      <ParticleCanvas />
      <main className="relative z-10">
      <Hero />
      {/* Empty scroll: the brain's move + scatter + regather needs a stretch of its own. The VLSI-CAD cloud's slide
          left is time-based now (not scrolled), so this was cut from 200vh by that step's share of the old
          timeline (0.28 of 300vh = 84vh) instead of stretching the other steps out. */}
      <div aria-hidden style={{ height: '116vh' }} />
      {THEMES.map((t, i) => (
        <ThemeShowcase key={t.theme} theme={t.theme} imageSide={t.imageSide} visual={t.visual} copy={t.copy} dwell={t.dwell} gapAfter={t.gap ?? 100} phoneLift={t.phoneLift} />
      ))}
      </main>
      {/* The YouTube / LinkedIn copy sits beside the social1 / social2 clouds now (it used to be the two standalone
          YoutubeSpotlight / LinkedInSection sections here, which are no longer rendered). */}
      <SocialCopy />
    </>
  )
}
