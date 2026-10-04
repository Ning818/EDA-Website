import edaLogoText from '../../assets/images/eda-logo-text.png'
import politoLogo from '../../assets/images/polito-logo.svg'
import linkedinIcon from '../../assets/images/linkedin-icon.svg'
import youtubeIcon from '../../assets/images/youtube-icon.svg'

// Recolored to a single-accent, line-drawn footer (deep navy - the same color the nav bar's own
// text/underline uses - for both the rule lines and all the text). Image/text layout below is
// unchanged from the original design - only colors were reworked, and the two separate background
// fills (the light content-area tint, the solid navy copyright bar) were unified into one bg-mint
// fill on the whole <footer>.
//
// bg-mint + relative z-10: ParticleCanvas's own stage is `fixed inset-0 z-0` (see
// ParticleCanvas.jsx) and, being `position: fixed`, keeps rendering at the same viewport
// coordinates no matter how far the page is scrolled - so on the Home page its last-formed cloud
// (the circuit board) would otherwise still be drawn right through/over the footer whenever it
// scrolls into view. `relative z-10` lifts the footer into its own stacking context above that
// z-0 layer, so its bg-mint fill fully covers it instead of the particles showing/painting through
// - the footer reads as its own solid-color block at the bottom of the page, not part of the
// particle canvas. On every other (non-Home) page there's no canvas to begin with, so this has no
// visible effect there beyond the fill itself.
export default function Footer() {
  return (
    <footer className="relative z-10 w-full mt-10 bg-mint md:mt-16">
      <div className="border-t border-navy/70">
        {/* Bottom padding is tighter on the phone layout, so the LinkedIn / YouTube icons (the last thing in the column)
            sit closer to the Copyright line. */}
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-start justify-between gap-y-10 px-8 pb-6 pt-12 md:pb-12 lg:px-[120px]">
          {/* The two logos sit side by side while they fit (240 + 24 + 198px); when the screen is too narrow for that, the second one wraps below the first, with a roomier gap between them. */}
          <div className="flex max-w-full flex-wrap items-center gap-x-6 gap-y-8 self-center">
            <img src={politoLogo} alt="Politecnico di Torino" className="h-[106px] w-[240px] shrink-0" />
            {/* eda-logo-text.png is 500x250 with transparent margins; its visible part is x 10-401, y 19-228 (392 x 210).
                Scaled so that visible height is 106px - the same as the Polito logo's - and cropped to exactly that area. */}
            <div className="relative h-[106px] w-[198px] shrink-0 overflow-hidden">
              <img
                src={edaLogoText}
                alt="EDA Group"
                className="absolute max-w-none"
                style={{ width: 252.4, height: 126.2, left: -5.05, top: -9.59 }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 font-body text-lg text-navy">
            <p className="font-bold tracking-[-0.36px]">Politecnico di Torino</p>
            <p className="font-medium tracking-[-0.36px]">Department of Control and Computer Engineering (DAUIN)</p>
            <p className="leading-6">
              Corso Duca Degli Abruzzi, 24
              <br />
              10129, Torino, Italy
              <br />
              Tel. +39 011 090 7042
              <br />
              Fax. +39 011 090 7099
            </p>
          </div>

          <div className="flex flex-col gap-3 font-body text-lg text-navy">
            <p className="font-bold tracking-[-0.36px]">Visit</p>
            <p className="leading-6">
              Polito website
              <br />
              Department website
              <br />
              Polito maps
            </p>
            <div className="flex items-center gap-6 pt-2">
              <a href="https://www.linkedin.com" target="_blank" rel="noreferrer">
                <img src={linkedinIcon} alt="LinkedIn" className="size-6" />
              </a>
              <a href="https://www.youtube.com" target="_blank" rel="noreferrer">
                <img src={youtubeIcon} alt="YouTube" className="h-5 w-[25px]" />
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1440px] px-8 pb-6 pt-4 md:pt-6 lg:px-[120px]">
        <p className="font-body text-sm text-navy">
          Copyright © 2026{' '}
          <a href="https://eda.polito.it/" target="_blank" rel="noreferrer" className="underline">
            EDA
          </a>
          . All rights reserved. Theme Spacious by .... Powered by:...
        </p>
      </div>
    </footer>
  )
}
