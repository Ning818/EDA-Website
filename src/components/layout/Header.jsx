import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import edaLogo from '../../assets/images/eda-logo.png'

// The four research themes shown on the Home page - reused here as the Research/Projects
// dropdown items. VLSI-CAD is the only theme with a real dedicated page today (the Research
// page itself is themed VLSI-CAD, see its PageIntroBand title), so it links straight there;
// the others fall back to the same anchors ThemeShowcase already links to from the Home page.
// Projects' list isn't split by theme at all, so all four point at the same page.
const RESEARCH_THEMES = ['VLSI-CAD', 'Bioinformatics', 'Smart City', 'Industry 4.0']

function slug(theme) {
  return theme.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

const NAV_LINKS = [
  { label: 'Home', to: '/' },
  {
    label: 'Research',
    to: '/research',
    dropdown: RESEARCH_THEMES.map((theme) => ({
      label: theme,
      to: theme === 'VLSI-CAD' ? '/research' : `/research#${slug(theme)}`,
    })),
  },
  {
    label: 'Projects',
    to: '/research/funded-projects',
    dropdown: RESEARCH_THEMES.map((theme) => ({ label: theme, to: '/research/funded-projects' })),
  },
  { label: 'Collaborations', to: '/collaborations' },
  { label: 'Teaching', to: '/teaching' },
]

export default function Header() {
  const { pathname } = useLocation()
  const isHome = pathname === '/'

  // On the Home page: hide the header on scroll-down (slides up and off the top), reveal it
  // again on scroll-up (slides back down into view).
  const [hidden, setHidden] = useState(false)
  const lastY = useRef(0)

  useEffect(() => {
    if (!isHome) {
      setHidden(false)
      return
    }
    lastY.current = window.scrollY
    // Scroll fires far more often than the display can paint (dozens of times per frame on some
    // trackpads) - calling setHidden from every single event forces a React re-render each time,
    // which is what made the hide/show feel janky rather than one clean slide. Coalescing to at
    // most once per animation frame fixes that.
    let ticking = false
    function handleScroll() {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const y = window.scrollY
        const delta = y - lastY.current
        if (Math.abs(delta) >= 4) {
          setHidden(y > 80 && delta > 0) // near the top: always show; else hide on scroll-down, show on scroll-up
          lastY.current = y
        }
        ticking = false
      })
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isHome])

  // `position: fixed` takes the header out of normal flow, so a spacer of the same height is
  // rendered in its place to keep page content from jumping up underneath it. Measured (rather
  // than a guessed pixel value) since the header's height varies across breakpoints - e.g. the
  // logo goes from 64px to 98px tall at the `lg` breakpoint.
  //
  // Note: `position: sticky` was tried first (no spacer needed at all), but sticky + a CSS
  // transform/translate doesn't compose correctly in this environment - the class toggles
  // correctly yet the element never visually moves. `fixed` + translate is solid, hence the
  // spacer here.
  const headerRef = useRef(null)
  const [spacerHeight, setSpacerHeight] = useState(0)

  useLayoutEffect(() => {
    if (!isHome || !headerRef.current) return
    const el = headerRef.current
    const update = () => {
      const height = el.getBoundingClientRect().height
      setSpacerHeight(height)
      // Exposed as a CSS custom property so Hero.jsx can size itself to exactly fill the rest of
      // the viewport below the header (header height + hero height = 100vh on first load).
      document.documentElement.style.setProperty('--header-h', `${height}px`)
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [isHome])

  return (
    <>
      <header
        ref={headerRef}
        className={`w-full bg-mint ${isHome ? 'fixed inset-x-0 top-0 z-50' : ''}`}
        style={{
          transition: 'transform 300ms ease-in-out',
          transform: isHome && hidden ? 'translateY(-100%)' : 'translateY(0)',
          willChange: isHome ? 'transform' : undefined,
        }}
      >
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-6 py-3 lg:flex-nowrap lg:px-[120px]">
          <NavLink to="/" className="flex shrink-0 items-center gap-2 lg:gap-3">
            <img src={edaLogo} alt="EDA Group logo" className="size-[44.8px] object-cover lg:size-[68.6px]" />
            {/* Matches the nav links' own flex-col label+underline structure below (text +
                gap-1 + a 2px-tall spacer) so both sit at the same visual height - centering the
                outer row alone isn't enough, since the nav links' reserved underline space pulls
                their text a few px higher than plain "EDA Group" text at the same box center. */}
            <span className="flex flex-col items-center gap-1">
              <span className="font-heading text-lg font-medium text-navy lg:text-2xl">EDA Group</span>
              <span className="h-[2px] w-full" aria-hidden="true" />
            </span>
          </NavLink>

          <nav className="hidden flex-wrap items-center gap-4 md:flex lg:gap-10">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.to
              const label = (
                <>
                  {link.label}
                  {/* Underline fades in on hover (opacity 0 -> 1) instead of growing thicker */}
                  <span
                    className={`h-[2px] w-full bg-navy opacity-0 transition-opacity duration-100 ease-linear group-hover:opacity-100 ${
                      isActive ? 'opacity-100' : ''
                    }`}
                  />
                </>
              )

              return (
                <div key={link.to} className="group relative">
                  {/* Research/Projects have no page of their own to jump to - they only
                      exist to host the dropdown below, so they aren't links. */}
                  {link.dropdown ? (
                    <span className="flex cursor-default flex-col items-center gap-1 font-heading text-base font-medium text-navy lg:text-xl">
                      {label}
                    </span>
                  ) : (
                    <NavLink
                      to={link.to}
                      end
                      className="flex flex-col items-center gap-1 font-heading text-base font-medium text-navy lg:text-xl"
                    >
                      {label}
                    </NavLink>
                  )}

                  {link.dropdown && (
                    <div className="invisible absolute left-0 top-full z-20 w-56 pt-3 group-hover:visible">
                      <ul className="bg-mint shadow-lg">
                        {link.dropdown.map((item, i) => (
                          // Each row is collapsed to 0 height and grows open on its own delay, so the
                          // blocks themselves appear one at a time top-to-bottom (the box grows with
                          // them) rather than the whole box showing at once with text fading inside it.
                          <li
                            key={item.label}
                            style={{ transitionDelay: `${i * 80}ms` }}
                            className="max-h-0 overflow-hidden transition-[max-height] duration-300 ease-out group-hover:max-h-12"
                          >
                            <NavLink
                              to={item.to}
                              style={{ transitionDelay: `${i * 80}ms, 0ms, 0ms` }}
                              className="block px-5 py-2.5 font-body text-base text-navy opacity-0 transition-[opacity,background-color,color] duration-300 ease-out hover:bg-navy hover:text-mint group-hover:opacity-100"
                            >
                              {item.label}
                            </NavLink>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )
            })}
          </nav>
        </div>
      </header>
      {isHome && <div style={{ height: spacerHeight }} aria-hidden="true" />}
    </>
  )
}
