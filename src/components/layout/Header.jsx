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

  return (
    <header className="w-full bg-mint">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-6 py-3 lg:flex-nowrap lg:px-[120px]">
        <NavLink to="/" className="flex shrink-0 items-center gap-3 lg:gap-[30px]">
          <img src={edaLogo} alt="EDA Group logo" className="size-16 object-cover lg:size-[98px]" />
          <span className="font-heading text-2xl font-medium text-navy lg:text-[32px]">EDA Group</span>
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
                  <span className="flex cursor-default flex-col items-center gap-1 font-heading text-lg font-medium text-navy lg:text-2xl">
                    {label}
                  </span>
                ) : (
                  <NavLink
                    to={link.to}
                    end
                    className="flex flex-col items-center gap-1 font-heading text-lg font-medium text-navy lg:text-2xl"
                  >
                    {label}
                  </NavLink>
                )}

                {link.dropdown && (
                  <div className="invisible absolute left-0 top-full z-20 w-56 pt-3 group-hover:visible">
                    <ul className="bg-mint shadow-lg">
                      {link.dropdown.map((item, i) => (
                        <li key={item.label}>
                          {/* Each item slides/fades in on its own, staggered after the one above it,
                              so the menu reads as unfolding top-to-bottom instead of moving as one block. */}
                          <NavLink
                            to={item.to}
                            // Stagger only the entrance (opacity/transform); the hover color-swap
                            // (background-color/color) stays instant regardless of item position.
                            style={{ transitionDelay: `${i * 50}ms, ${i * 50}ms, 0ms, 0ms` }}
                            className="block -translate-y-2 px-5 py-2.5 font-body text-base text-navy opacity-0 transition-[opacity,transform,background-color,color] duration-200 ease-out hover:bg-navy hover:text-mint group-hover:translate-y-0 group-hover:opacity-100"
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
  )
}
