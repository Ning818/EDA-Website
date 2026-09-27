import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { pinEnd, ARM_EXIT_SCREENS, CIRCUIT_SCREENS } from '../../three/ParticleCanvas'
import youtubeThumbnail from '../../assets/images/youtube-thumbnail.png'
import meetingPhoto from '../../assets/images/linkedin-meeting-photo.png'

// Same links/assets as YoutubeSpotlight.jsx and LinkedInSection.jsx further down the page - this is
// an early preview of that same content, not a new destination.
const CHANNEL_URL = 'https://www.youtube.com/@edagrouppolito329/videos'
const LINKEDIN_URL = 'https://www.linkedin.com/company/eda-group-polito/'
// Purely decorative fiducial-style tick labels along the card's top edge, echoing a PCB footprint
// silkscreen (fixed, not randomized, so the layout doesn't jitter between reloads).
const TICKS = ['C9', '00', '9A', 'E2', '5E', '9F', '2A']

const linkClass =
  'group flex min-w-0 flex-1 flex-col gap-3 rounded-sm border border-[#4a9db3]/30 bg-white/60 p-3 transition-colors hover:bg-white'

/**
 * One real, clickable "chip" laid over the generated circuit board (ParticleCanvas.jsx's arm ->
 * circuit transition): a content card centered on screen, with the YouTube channel and LinkedIn page
 * side by side inside it. CircuitParticles.js leaves a matching rectangular gap (CIRCUIT_KEEPOUT) in
 * the middle of the board and draws its outline like a component footprint, so the board's traces
 * read as routed *around* this chip rather than under it - the gap is centered the same way this
 * card is (both anchored to the screen's own center), so the two always line up regardless of
 * viewport size, unlike a corner/edge position would. Fixed to the viewport, fades in only while the
 * circuit board is formed and held (the tail of the Industry 4.0 theme's scroll gap), via the same
 * scroll math ParticleCanvas.jsx uses for that timing.
 *
 * The chip's own footprint (this box's border/corners) sits a fixed 120px from the screen's left and
 * right edges on desktop (lg+) - the same side margin every other section on the page uses
 * (ThemeShowcase's `lg:px-[120px]`) - and a narrower one below that breakpoint; CIRCUIT_KEEPOUT
 * mirrors that same 120px-ish margin in the board's own local units so the routed-around gap lines
 * up with it. The box's own width isn't otherwise constrained: what adapts underneath it is the
 * *content* - the video/LinkedIn tiles cap at a comfortable reading width and stay centered inside
 * whatever width the box ends up with, and stack instead of sitting side by side below `sm`.
 */
export default function CircuitChipCards() {
  const ref = useRef(null)

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)
    const st = ScrollTrigger.create({
      trigger: document.documentElement,
      start: () => pinEnd('arm')() + (ARM_EXIT_SCREENS + CIRCUIT_SCREENS) * window.innerHeight,
      end: () => pinEnd('arm')() + (ARM_EXIT_SCREENS + CIRCUIT_SCREENS) * window.innerHeight + 0.7 * window.innerHeight,
      invalidateOnRefresh: true,
      onToggle: (self) => ref.current?.classList.toggle('opacity-100', self.isActive),
    })
    return () => st.kill()
  }, [])

  return (
    <div ref={ref} className="pointer-events-none fixed inset-0 z-20 opacity-0 transition-opacity duration-700">
      <div className="absolute left-8 right-8 top-1/2 -translate-y-1/2 rounded-sm border border-[#e0a94a] bg-[#eaf6f1]/95 px-6 py-8 shadow-xl backdrop-blur-sm sm:px-10 sm:py-10 lg:left-[120px] lg:right-[120px]">
        {/* Corner brackets, like registration marks on a PCB footprint. */}
        {[['-left-px -top-px', 'border-l border-t'], ['-right-px -top-px', 'border-r border-t'],
          ['-left-px -bottom-px', 'border-l border-b'], ['-right-px -bottom-px', 'border-r border-b']].map(([pos, edges]) => (
          <span key={pos} className={`absolute ${pos} h-3 w-3 ${edges} border-[#e0a94a]`} aria-hidden />
        ))}
        {/* Tick labels along the top edge, like PCB fiducial/coordinate marks. */}
        <div className="pointer-events-none absolute inset-x-8 -top-3 hidden justify-between font-mono text-[10px] tracking-wide text-navy/40 sm:flex">
          {TICKS.map((t) => <span key={t} className="bg-[#eaf6f1] px-1">{t}</span>)}
        </div>

        {/* The chip's interior: caps at a reading width and centers, independent of the box's own width. */}
        <div className="mx-auto max-w-[820px]">
          <p className="text-center font-mono text-xs tracking-[0.2em] text-[#4a9db3]">[ CONNECT ]</p>
          <h3 className="mt-2 text-center font-heading text-2xl text-navy sm:text-3xl">Follow the circuit further</h3>
          <p className="mx-auto mt-3 max-w-[520px] text-center font-body text-sm text-navy/70">
            The board keeps going past this page - our videos and updates live on YouTube and LinkedIn.
          </p>

          <div className="mt-7 flex flex-col gap-4 sm:flex-row">
            <a href={CHANNEL_URL} target="_blank" rel="noreferrer" className={`${linkClass} pointer-events-auto`}>
              <img src={youtubeThumbnail} alt="EDA Group YouTube channel" className="aspect-video w-full rounded-sm object-cover" />
              <span className="font-body text-sm text-navy">Explore our YouTube channel</span>
            </a>
            <a href={LINKEDIN_URL} target="_blank" rel="noreferrer" className={`${linkClass} pointer-events-auto`}>
              <img src={meetingPhoto} alt="EDA Group on LinkedIn" className="aspect-video w-full rounded-sm object-cover" />
              <span className="font-body text-sm text-navy">Explore our updates on LinkedIn</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
