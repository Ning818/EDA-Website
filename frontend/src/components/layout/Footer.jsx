import edaLogoText from '../../assets/images/eda-logo-text.png'
import politoLogo from '../../assets/images/polito-logo.svg'
import linkedinIcon from '../../assets/images/linkedin-icon.svg'
import youtubeIcon from '../../assets/images/youtube-icon.svg'
import { useSite } from '../../useSite'
import { useSocial } from '../../useSocial'

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
  // the group's channel and page: the same addresses the home page's social blocks lead to
  const social = useSocial()
  // the phone and fax numbers are the database's (GET /api/site; the defaults are in site.js); the rest of the footer is written here
  const { phone, phone_dial: phoneDial, fax } = useSite()
  return (
    <footer className="relative z-10 w-full mt-10 bg-mint md:mt-16">
      <div className="border-t border-navy/70">
        {/* Bottom padding is tighter on the phone layout, so the LinkedIn / YouTube icons (the last thing in the column)
            sit closer to the Copyright line. */}
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-start justify-between gap-x-16 gap-y-10 px-8 pb-6 pt-12 md:pb-12 lg:px-[120px]">
          {/* The two logos sit side by side while they fit (240 + 24 + 198px); when the screen is too narrow for that, the second one wraps below the first, with a roomier gap between them. Beside the logos is ONE block (the address and the links); the block drops under the logos, as a whole, when the row is too narrow for both. */}
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

          {/* the address and the links are ONE flex item (side by side from md): when the logos and both do not fit in a row, the whole block goes under the logos - the address never stays beside the logos with the links alone below */}
          <div className="flex flex-col gap-10 md:flex-row md:gap-x-16">
            <div className="flex flex-col gap-3 type-compact text-navy">
              <p className="font-semibold">Politecnico di Torino</p>
              <p className="font-medium">Department of Control and Computer Engineering (DAUIN)</p>
              <p>
                Corso Duca Degli Abruzzi, 24
                <br />
                10129, Torino, Italy
                {/* the phone number dials on a phone (the fax number stays plain text); a number that is empty leaves its line out */}
                {phone && (
                  <>
                    <br />
                    Tel.{' '}
                    <a href={phoneDial ? `tel:${phoneDial}` : undefined} className="underline-offset-4 hover:underline">
                      {phone}
                    </a>
                  </>
                )}
                {fax && (
                  <>
                    <br />
                    Fax. {fax}
                  </>
                )}
              </p>
            </div>

            <div className="flex flex-col gap-3 type-compact text-navy">
              <p className="font-semibold">Visit</p>
              {/* the university's and the department's sites (new tab, like the social icons below) */}
              <div className="flex flex-col">
                <a href="https://www.polito.it/" target="_blank" rel="noreferrer" className="w-fit underline-offset-4 hover:underline">
                  Polito website
                </a>
                <a href="https://www.dauin.polito.it/en/" target="_blank" rel="noreferrer" className="w-fit underline-offset-4 hover:underline">
                  Department website
                </a>
              </div>
              {/* The icons stay small, but each one sits in a 44 x 44px target (the padding is part of the link), with a visible focus ring; the negative margins
                  keep the row where it was: its left edge lines up with the text above and it takes no more height. */}
                <div className="-mb-2.5 -ml-2.5 flex items-center gap-2">
                  <a
                    href={social.linkedin.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="LinkedIn"
                    className="grid size-11 place-items-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-navy"
                  >
                    <img src={linkedinIcon} alt="" className="size-6" />
                  </a>
                  <a
                    href={social.youtube.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="YouTube"
                    className="grid size-11 place-items-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-navy"
                  >
                    <img src={youtubeIcon} alt="" className="h-5 w-[25px]" />
                  </a>
                </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1440px] px-8 pb-6 pt-4 md:pt-6 lg:px-[120px]">
        <p className="type-caption text-navy">
          {/* the year of the visit, so the notice is never a year behind and nobody has to remember to change it */}
          Copyright © {new Date().getFullYear()} EDA Group, Politecnico di Torino. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
