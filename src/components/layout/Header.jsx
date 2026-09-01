import { NavLink } from 'react-router-dom'
import edaLogo from '../../assets/images/eda-logo.png'

// The four research themes shown on the Home page - reused here as the Research/Projects
// dropdown items. Research links jump to that theme's anchor on the Research page (same
// anchors ThemeShowcase already links to); Projects links go to the single Funded Projects
// list, which isn't split by theme, so all four point at the same page.
const RESEARCH_THEMES = ['VLSI-CAD', 'Bioinformatics', 'Smart City', 'Industry 4.0']

function slug(theme) {
  return theme.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

const NAV_LINKS = [
  { label: 'Home', to: '/' },
  {
    label: 'Research',
    to: '/research',
    dropdown: RESEARCH_THEMES.map((theme) => ({ label: theme, to: `/research#${slug(theme)}` })),
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
  return (
    <header className="w-full bg-mint">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-6 py-3 lg:flex-nowrap lg:px-[120px]">
        <NavLink to="/" className="flex shrink-0 items-center gap-3 lg:gap-[30px]">
          <img src={edaLogo} alt="EDA Group logo" className="size-16 object-cover lg:size-[98px]" />
          <span className="font-heading text-2xl font-medium text-navy lg:text-[32px]">EDA Group</span>
        </NavLink>

        <nav className="hidden flex-wrap items-center gap-4 md:flex lg:gap-10">
          {NAV_LINKS.map((link) => (
            <div key={link.to} className="group relative">
              <NavLink
                to={link.to}
                end
                className="flex flex-col items-center gap-1 font-heading text-lg font-medium text-navy lg:text-2xl"
              >
                {({ isActive }) => (
                  <>
                    {link.label}
                    {/* Underline fades in on hover (opacity 0 -> 1) instead of growing thicker */}
                    <span
                      className={`h-[2px] w-full bg-navy opacity-0 transition-opacity duration-100 ease-linear group-hover:opacity-100 ${
                        isActive ? 'opacity-100' : ''
                      }`}
                    />
                  </>
                )}
              </NavLink>

              {link.dropdown && (
                <div className="invisible absolute left-0 top-full z-20 w-56 pt-3 opacity-0 transition-[opacity,visibility] duration-150 ease-out group-hover:visible group-hover:opacity-100">
                  <ul className="max-h-0 overflow-hidden bg-white shadow-lg ring-1 ring-black/10 transition-[max-height] duration-150 ease-out group-hover:max-h-[300px]">
                    {link.dropdown.map((item) => (
                      <li key={item.label}>
                        <NavLink to={item.to} className="block px-5 py-2.5 font-body text-base text-navy hover:bg-mint">
                          {item.label}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>
    </header>
  )
}
