import BrainScene from '../../three/BrainScene'
import { HOME_HERO } from '../../content/home'

// header height + hero height = 100vh on first load (a laptop screen shows exactly the header
// and the hero, nothing more). --header-h is kept in sync with the real header by Header.jsx's
// own ResizeObserver; 93px is just the fallback for the instant before that JS runs.
//
// Phone layout (stacked, below md): the copy is top-aligned with a gap under the header (centered, it used to overflow
// the section and slide up under the nav bar) and the brain takes the rest of the one-screen height, whole and on screen:
// its box is nudged up by 15% of its height (the brain is centred in a taller box, which left a wide gap under the copy)
// and is capped at 384px tall (the brain is up to ~0.9 of its box height wide, so that is the most that fits the
// width). The section keeps its one-screen height: the brain's scroll-0 position (and with it the brain -> VLSI-CAD
// transition) is measured from it.
export default function Hero() {
  return (
    <section className="mx-auto flex h-[calc(100vh-var(--header-h,93px))] max-w-[1440px] flex-col items-center justify-start gap-5 px-8 pb-6 pt-8 md:flex-row md:justify-between md:gap-10 md:pb-0 md:pt-0 lg:px-[120px]">
      <div className="flex max-w-[539px] flex-col gap-6">
        <h1 className="font-heading text-[32px] font-medium leading-none text-navy">{HOME_HERO.title}</h1>
        <p className="font-body text-lg text-navy md:text-2xl">{HOME_HERO.text}</p>
      </div>
      <BrainScene className="h-full max-h-[692px] w-full max-w-[615px] shrink-0 max-md:pointer-events-none max-md:h-auto max-md:min-h-0 max-md:max-h-[384px] max-md:flex-1 max-md:shrink max-md:-translate-y-[15%]" />
    </section>
  )
}
