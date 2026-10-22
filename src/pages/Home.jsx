import { Suspense, lazy, useEffect, useLayoutEffect, useRef, useState } from 'react'
import Hero from '../components/sections/Hero'
import ChapterRail from '../components/sections/ChapterRail'
import ViewSwitch from '../components/sections/ViewSwitch'
import { currentChapterId, scrollToChapter } from '../components/sections/homeChapters'
import CanvasBoundary from '../components/ui/CanvasBoundary'
import StillCloud, { STILL_BOX } from '../components/sections/StillCloud'
import { STILL_CLOUDS } from '../components/sections/stillClouds'
import ThemeShowcase from '../components/sections/ThemeShowcase'
import SocialCopy, { SocialStill } from '../components/sections/SocialCopy.jsx'
import IndustryArmScene from '../three/IndustryArmScene'
import SmartCityScene from '../three/SmartCityScene'
import DNAScene from '../three/DNAScene'
import { SOCIAL_HOLD_SCREENS, ARM_EXIT_SCREENS } from '../three/cloudState'
import VLSICADScene from '../three/VLSICADScene'

// The box a theme's particle cloud is anchored to. On the stacked layout (below xl: the phone and the tablet) the clouds alternate between the top and
// the bottom of the pinned screen the way they alternate left and right on desktop (imageSide 'left' -> cloud on top,
// 'right' -> cloud at the bottom): the box takes whatever height the copy leaves and is a size container, so the
// cloud's anchor can size itself to fit it (index.css, .phone-cloud).
const VISUAL_BOX =
  'h-[478px] w-full max-w-[531px] shrink-0 max-xl:h-auto max-xl:min-h-0 max-xl:max-w-none max-xl:flex-1 max-xl:shrink max-xl:[container-type:size]'

const THEMES = [
  {
    theme: 'VLSI-CAD',
    copy: 'The EDA group works on Design Automation for standard digital CMOS circuits, Beyond-CMOS technologies and Electrical Energy Systems. We develop CAD algorithms and prototype tools for low-power, variation-tolerant integrated circuits, model Graphene-based devices for flexible, ultra-low-power circuits, and build simulation and run-time charge and thermal management for hybrid-source energy systems.',
    imageSide: 'left',
    dwell: 60, // vh of scroll the finished cloud holds still
    gap: 161, // vh of scroll for the transition into the next theme (VLSI's timeline is 0.87 long: the transition spans gap + 100vh = 0.87 x 300vh)
    visual: <VLSICADScene className={VISUAL_BOX} />,
    still: <StillCloud cloud={STILL_CLOUDS.vlsi} className={STILL_BOX} near="bottom" />,
    snapUp: true, // the still page's phone layout snaps to this row a little further down
  },
  {
    theme: 'Bioinformatics',
    copy: 'With long-term experience in bioinformatics, the EDA group designs software and hardware-software solutions to manage, analyze and interpret complex biological and medical data. Our work spans gene expression and regulatory networks, sequencing data, medical image analysis, GPU and FPGA acceleration and neuromorphic computing, with hospitals and research centers.',
    imageSide: 'right',
    dwell: 60,
    gap: 161, // 0.87 x 300vh - see scatteredTimeline in ParticleCanvas.jsx
    visual: <DNAScene className={VISUAL_BOX} />,
    still: <StillCloud cloud={STILL_CLOUDS.dna} className={STILL_BOX} near="top" />,
  },
  {
    theme: 'Smart City',
    copy: 'ICT is key to optimizing energy use in the Smart City, and that is where our software solutions come in. We research distributed software and middleware that make energy, environmental and user-feedback data interoperable, visual web interfaces giving real-time feedback on energy impact, and building information models linked to real-time data.',
    imageSide: 'left',
    dwell: 60,
    gap: 161, // 0.87 x 300vh - see scatteredTimeline in ParticleCanvas.jsx
    phoneLift: 40, // px: on the phone the copy sits this much higher than the other left-hand themes' (the cloud above is small)
    visual: <SmartCityScene className={VISUAL_BOX} />,
    still: <StillCloud cloud={STILL_CLOUDS.city} className={STILL_BOX} near="bottom" />,
    snapUp: true,
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
    still: <StillCloud cloud={STILL_CLOUDS.arm} className={STILL_BOX} near="top" />,
  },
]

// If the page-wide particle canvas fails (a model file does not load, no WebGL) the CanvasBoundary leaves it out and each cloud's still picture
// (stillClouds.js) takes the place of its live cloud - at the same size from xl up, where the picture stands beside the copy as the cloud does.
// Without the animation there is nothing to scroll through, so every row is one plain screen at least (no stretches of empty scroll), the
// social blocks are ordinary rows too, and below xl a row is the picture and the copy stacked. The header and the footer are not part of it.
//
// The same page is used where the live layout does not fit: on a screen so small (or text so large) that the copy leaves a cloud less than
// MIN_CLOUD_PX of height in its pinned screen, the pinned screens would only crowd or cut off their content, so the rows are laid out as plain
// sections (the page "grows" to its content) with the clouds' still pictures. It is tried again when the window gets bigger.
const MIN_CLOUD_PX = 120

// The 3D canvas (three.js, the models, the animation) is its own chunk, fetched when the home page is shown and only if the animated page is: not for the other
// pages, not for a visitor who gets the still page (reduced motion, a small screen), and - since a chunk that fails to load is an error like any other of the
// canvas's - the CanvasBoundary falls back to the still page if it does not arrive.
const ParticleCanvas = lazy(() => import('../three/ParticleCanvas'))

// whether every cloud's box still has room in the live layout (read from the DOM: the boxes are where the clouds are anchored)
function liveLayoutFits() {
  return [...document.querySelectorAll('[data-cloud]')].every((anchor) => {
    const box = anchor.dataset.cloud === 'brain' ? anchor : anchor.parentElement
    return box.getBoundingClientRect().height >= MIN_CLOUD_PX
  })
}

// Whether the visitor has asked their system for reduced motion. The animated home page (a brain that turns by itself, clouds that scatter and regather as
// the page scrolls, particles that cross the copy) is the kind of motion that setting is for, so they get the still page instead: the same four themes and
// the same copy and links, each with its picture, and none of the scroll length that was only there for the animation.
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
  return reduced
}

// Whether the browser can make a WebGL context at all (a device or a setting without it is why the canvas "cannot run"). Tried once, on a throw-away
// canvas: asking the 3D canvas itself fails too late - it reports the missing context as an error of its own, outside what the CanvasBoundary can catch,
// and leaves the page's empty scenes and its scroll length in place.
let webglChecked
function hasWebGL() {
  if (webglChecked === undefined) {
    try {
      const canvas = document.createElement('canvas')
      webglChecked = !!(canvas.getContext('webgl2') || canvas.getContext('webgl'))
    } catch {
      webglChecked = false
    }
  }
  return webglChecked
}

// The visitor's own choice between the animated page and the simplified one (the ViewSwitch pill), kept for their next visit. Storage can be blocked: then the
// choice only lasts until the page is reloaded.
const VIEW_KEY = 'eda-home-view'
const readChosenStill = () => {
  try {
    return localStorage.getItem(VIEW_KEY) === 'simple'
  } catch {
    return false
  }
}

export default function Home() {
  // Preview switch, like Research's ?hl=light: /?still shows the page as it is when the canvas has failed.
  const [canvasFailed, setCanvasFailed] = useState(() => new URLSearchParams(window.location.search).has('still') || !hasWebGL())
  const [tooSmall, setTooSmall] = useState(null) // the window size at which the live layout did not fit
  const [chosenStill, setChosenStill] = useState(readChosenStill)
  const reducedMotion = usePrefersReducedMotion()
  const still = canvasFailed || tooSmall !== null || reducedMotion || chosenStill
  // The visitor can pick either page only where both are possible: not where the canvas failed, the screen is too small for the animated layout or they asked their system
  // for reduced motion (that already is the simplified page, and they are not offered the animation).
  const canSwitch = !(canvasFailed || tooSmall !== null || reducedMotion)

  // Switching keeps the visitor at the chapter they were at (the two pages are very different lengths): its name is taken before the change, the scroll
  // happens once the other page is laid out.
  const chapterToKeep = useRef(null)
  const switchView = () => {
    chapterToKeep.current = currentChapterId(still)
    const next = !chosenStill
    setChosenStill(next)
    try {
      localStorage.setItem(VIEW_KEY, next ? 'simple' : 'animated')
    } catch {
      /* the choice is not kept */
    }
  }
  useLayoutEffect(() => {
    if (!chapterToKeep.current) return
    scrollToChapter(chapterToKeep.current, still, 'instant')
    chapterToKeep.current = null
  }, [still])

  useEffect(() => {
    if (canvasFailed || reducedMotion || chosenStill) return undefined // no live layout to measure
    const check = () => {
      if (tooSmall === null) {
        if (!liveLayoutFits()) setTooSmall({ w: window.innerWidth, h: window.innerHeight })
      } else if (window.innerWidth > tooSmall.w || window.innerHeight > tooSmall.h) {
        setTooSmall(null) // bigger than where it failed: try the live layout again
      }
    }
    // measured once the typefaces are in (the fallback fonts are wider, which makes the copy taller than it will be)
    let alive = true
    const fontsIn = Promise.all([document.fonts?.load('600 16px Poppins'), document.fonts?.load('400 16px "Roboto Variable"')]).then(() => document.fonts?.ready)
    fontsIn.catch(() => {}).then(() => alive && check())
    const onResize = () => alive && check()
    window.addEventListener('resize', onResize)
    return () => {
      alive = false
      window.removeEventListener('resize', onResize)
    }
  }, [canvasFailed, reducedMotion, chosenStill, tooSmall])

  return (
    <>
      {/* first in the page, so a keyboard visitor reaches it straight after the nav bar */}
      {canSwitch && <ViewSwitch still={still} onSwitch={switchView} />}
      {!still && (
        <CanvasBoundary onError={() => setCanvasFailed(true)}>
          <Suspense fallback={null}>
            <ParticleCanvas />
          </Suspense>
        </CanvasBoundary>
      )}
      <main className="relative z-10">
      <Hero still={still} />
      {/* Empty scroll: the brain's move + scatter + regather needs a stretch of its own. The VLSI-CAD cloud's slide
          left is time-based now (not scrolled), so this was cut from 200vh by that step's share of the old
          timeline (0.28 of 300vh = 84vh) instead of stretching the other steps out. */}
      {!still && <div aria-hidden style={{ height: '116vh' }} />}
      {THEMES.map((t) => (
        <ThemeShowcase key={t.theme} theme={t.theme} imageSide={t.imageSide} visual={still ? t.still : t.visual} still={still} snapUp={t.snapUp} copy={t.copy} dwell={t.dwell} gapAfter={t.gap ?? 100} phoneLift={t.phoneLift} />
      ))}
      </main>
      {/* The YouTube / LinkedIn copy sits beside the social1 / social2 clouds now (it used to be the two standalone
          YoutubeSpotlight / LinkedInSection sections here, which are no longer rendered). */}
      {still ? <SocialStill /> : <SocialCopy />}
      <ChapterRail still={still} />
    </>
  )
}
