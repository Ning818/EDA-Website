import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import edaLogo from '../../assets/images/eda-logo.png'
import { THEMES } from '../../themes'

// The four research themes shown on the Home page - reused here as the Research / Projects dropdown items; each links to
// its own Research / Funded Projects page (see themes.js).
// Research and Projects aren't pages themselves, so they count as the current page for any of their themes' pages.
const isActiveLink = (pathname, link) => {
  if (link.label === 'Research') return pathname === '/research' || (pathname.startsWith('/research/') && !pathname.startsWith('/research/funded-projects'))
  if (link.label === 'Projects') return pathname.startsWith('/research/funded-projects')
  return pathname === link.to
}

const NAV_LINKS = [
  { label: 'Home', to: '/' },
  {
    label: 'Research',
    to: '/research',
    dropdown: THEMES.map((theme) => ({ label: theme.name, to: theme.research })),
  },
  {
    label: 'Projects',
    to: '/research/funded-projects',
    dropdown: THEMES.map((theme) => ({ label: theme.name, to: theme.projects })),
  },
  { label: 'Collaborations', to: '/collaborations' },
  { label: 'Teaching', to: '/teaching' },
]

export default function Header() {
  const { pathname, key } = useLocation()
  const isHome = pathname === '/'
  // The Collaborations page lays soft colour glows behind the nav bar (Collaborations.jsx), so the bar there has no tint of its own: the
  // glows run on into it without a seam.
  const seamless = pathname === '/collaborations'

  // Phone layout (below `md`): the nav links collapse behind a hamburger button that unfolds them as a vertical list
  // under the logo row. Research / Projects (which only host a dropdown on desktop) are accordion groups in it.
  const [menuOpen, setMenuOpen] = useState(false)
  const [openGroup, setOpenGroup] = useState(null)
  useEffect(() => {
    setMenuOpen(false) // any navigation (a menu link, the logo, back/forward) folds the menu away
    setOpenGroup(null)
  }, [key])
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  // On the Home page: hide the header on scroll-down (slides up and off the top), reveal it
  // again on scroll-up (slides back down into view).
  const [hidden, setHidden] = useState(false)
  const lastY = useRef(0)
  useEffect(() => {
    if (hidden) setMenuOpen(false) // scrolling the page away folds an open phone menu
  }, [hidden])

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
        className={`w-full backdrop-blur-sm ${menuOpen ? 'bg-mint md:bg-mint/30' : seamless ? 'bg-transparent' : 'bg-mint/30'} ${
          // Off the Home page the header is in the normal flow; `relative z-40` lifts it (and its dropdown / phone menu)
          // above page content that has its own z-index, e.g. the decorated page-header band.
          isHome ? 'fixed inset-x-0 top-0 z-50' : 'relative z-40'
        }`}
        style={{
          transition: 'transform 300ms ease-in-out, background-color 300ms ease',
          transform: isHome && hidden ? 'translateY(-100%)' : 'translateY(0)',
          willChange: isHome ? 'transform' : undefined,
        }}
      >
        {/* The measured row is just the logo + nav line: the phone menu unfolds below it and overlays the page, so it
            must not count towards the spacer / --header-h. */}
        <div
          ref={headerRef}
          className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-6 py-3 lg:flex-nowrap lg:px-[120px]"
        >
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
              const isActive = isActiveLink(pathname, link)
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

          <button
            type="button"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            onClick={() => setMenuOpen((o) => !o)}
            className="-mr-2 flex size-11 shrink-0 items-center justify-center md:hidden"
          >
            {/* Three bars that turn into a cross while the menu is open */}
            <span className="relative block h-4 w-6" aria-hidden="true">
              <span
                className={`absolute left-0 h-[2px] w-full bg-navy transition-all duration-300 ${
                  menuOpen ? 'top-[7px] rotate-45' : 'top-0'
                }`}
              />
              <span
                className={`absolute left-0 top-[7px] h-[2px] w-full bg-navy transition-opacity duration-200 ${
                  menuOpen ? 'opacity-0' : ''
                }`}
              />
              <span
                className={`absolute left-0 h-[2px] w-full bg-navy transition-all duration-300 ${
                  menuOpen ? 'top-[7px] -rotate-45' : 'top-[14px]'
                }`}
              />
            </span>
          </button>
        </div>

        {/* Phone menu: unfolds downwards (grid row 0fr -> 1fr) under the logo row. `inert` while folded so its links
            can't be tabbed to. */}
        <div
          id="mobile-nav"
          inert={!menuOpen}
          className={`grid transition-[grid-template-rows] duration-300 ease-out md:hidden ${
            menuOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          }`}
        >
          <div className="overflow-hidden">
            <ul className="mx-auto max-w-[1440px] px-6 pb-3">
              {NAV_LINKS.map((link) => {
                const groupOpen = openGroup === link.label
                return (
                  <li key={link.to} className="border-t border-navy/10">
                    {link.dropdown ? (
                      <>
                        <button
                          type="button"
                          aria-expanded={groupOpen}
                          onClick={() => setOpenGroup(groupOpen ? null : link.label)}
                          className={`flex w-full items-center justify-between py-3.5 font-heading text-lg text-navy ${
                            isActiveLink(pathname, link) ? 'font-bold' : 'font-medium'
                          }`}
                        >
                          {link.label}
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={`size-5 transition-transform duration-300 ${groupOpen ? 'rotate-180' : ''}`}
                            aria-hidden="true"
                          >
                            <path d="m6 9 6 6 6-6" />
                          </svg>
                        </button>
                        <div
                          inert={!groupOpen}
                          className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                            groupOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                          }`}
                        >
                          <ul className="overflow-hidden">
                            {link.dropdown.map((item) => (
                              <li key={item.label}>
                                <NavLink
                                  to={item.to}
                                  className="block py-2.5 pl-4 font-body text-base text-navy active:bg-navy/10"
                                >
                                  {item.label}
                                </NavLink>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </>
                    ) : (
                      <NavLink
                        to={link.to}
                        end
                        className={`block py-3.5 font-heading text-lg text-navy ${
                          isActiveLink(pathname, link) ? 'font-bold' : 'font-medium'
                        }`}
                      >
                        {link.label}
                      </NavLink>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </header>
      {isHome && <div style={{ height: spacerHeight }} aria-hidden="true" />}
    </>
  )
}
