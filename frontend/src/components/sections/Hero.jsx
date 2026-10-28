import { useId } from 'react'
import BrainScene from '../../three/BrainScene'
import StillCloud, { STILL_BRAIN_BOX } from './StillCloud'
import { STILL_CLOUDS } from './stillClouds'
import { scrollToChapter } from './homeChapters'
import { useThemes } from '../../useThemes'

// The four themes under the intro, each a jump to its own part of this page (its particle cloud and copy), headed by a small "Discover our research" label. An item is
// the theme's name under a bar in the theme's colour; hovering (or focusing) it thickens the bar and a small arrow appears after the name, pointing down - the page
// scrolls down to it. The bar's row is 6px high whatever the bar's own height, so the name does not move when the bar grows. The arrow stands in the gap
// beside the item, so it takes no width of its own. Not on a phone, where the first screen is too short for it (the chapter dots beside the page do its job). The four names are one row where the column is wide enough for them (28rem, measured on the column itself, whose width
// follows the brain beside it), else two rows of two - not three and a lone one.
function ThemeJump({ still }) {
  const labelId = useId()
  const themes = useThemes()
  return (
    <div className="@container flex flex-col gap-3 max-md:hidden">
      <p id={labelId} className="type-meta font-medium uppercase tracking-[0.08em] text-teal-text">
        Discover our research
      </p>
      <nav aria-labelledby={labelId}>
        <ul className="grid grid-cols-2 justify-items-start gap-x-6 gap-y-4 @[28rem]:flex @[28rem]:flex-wrap">
          {themes.map((theme) => (
            <li key={theme.slug}>
              <button
                type="button"
                onClick={() => scrollToChapter(theme.slug, still)}
                style={{ '--c': theme.color }}
                className="group relative flex cursor-pointer flex-col items-stretch gap-2.5 rounded-sm text-left type-action text-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-navy"
              >
                <span aria-hidden="true" className="block h-1.5">
                  <span className="block h-[3px] rounded-full bg-[var(--c)] transition-[height] duration-200 group-hover:h-1.5 group-focus-visible:h-1.5" />
                </span>
                {theme.short ?? theme.name}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="absolute bottom-1.5 left-full ml-1 size-3 -translate-y-1 opacity-0 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100"
                  aria-hidden="true"
                >
                  <path d="M12 5v14M6 13l6 6 6-6" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

const BRAIN_BOX = 'h-full max-h-[692px] w-full max-w-[615px] shrink-0 max-xl:pointer-events-none max-xl:h-auto max-xl:min-h-0 max-xl:max-h-[384px] max-xl:flex-1 max-xl:shrink max-xl:-translate-y-[15%]'

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
//
// Medium layout (md up to xl, stacked): the copy is as wide as the theme sections' copy below it (ThemeShowcase.jsx: the width of the screen less its padding, at most 40rem,
// in the middle), so the intro and the themes read in one column; the phone and the side-by-side layout from xl keep the 539px the copy had. The departments' abbreviations, (DAUIN) and (DIST), are
// left out of the copy below xl (the phone and the medium layout), and "the Interuniversity" only on the phone.
export default function Hero({ still = false }) {
  return (
    <section
      className={
        still
          ? // the still layout: at least one screen high, the copy and the brain stacked below xl (from the top, 24px under the header) and side by side from xl up
            'mx-auto flex h-[calc(100vh-var(--header-h,93px))] min-h-[min-content] max-w-[1440px] flex-col items-center justify-start gap-6 px-8 md:px-16 pb-8 pt-6 xl:h-[calc(100vh-var(--header-h,93px))] xl:flex-row xl:justify-between xl:gap-10 lg:px-[120px] xl:pb-0 xl:pt-0'
          : 'mx-auto flex h-[calc(100vh-var(--header-h,93px))] max-w-[1440px] flex-col items-center justify-start gap-5 px-8 md:px-16 pb-6 pt-8 max-md:pt-6 xl:flex-row xl:justify-between xl:gap-10 lg:px-[120px] xl:pb-0 xl:pt-0'
      }
    >
      <div className="flex max-w-[539px] flex-col gap-6 md:max-xl:w-full md:max-xl:max-w-[40rem]">
        <h1 className="type-h1 text-navy">EDA Group</h1>
        <p className="type-lead text-navy">
          EDA (Electronic Design Automation) Group is an interdepartmental research group including researchers from
          the Department of Control and Computer Engineering<span className="max-xl:hidden"> (DAUIN)</span> and <span className="max-md:hidden">the Interuniversity </span>Department of Regional
          and Urban Studies and Planning<span className="max-xl:hidden"> (DIST)</span> of Politecnico di Torino.
        </p>
        <ThemeJump still={still} />
      </div>
      {/* the particle canvas is out of order: the brain's picture stands in its box */}
      {still ? <StillCloud cloud={STILL_CLOUDS.brain} className={STILL_BRAIN_BOX} near="top" /> : <BrainScene className={BRAIN_BOX} />}
    </section>
  )
}
