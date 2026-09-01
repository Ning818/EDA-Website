import { NavLink } from 'react-router-dom'
import edaLogo from '../../assets/images/eda-logo.png'

const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Research', to: '/research' },
  { label: 'Projects', to: '/research/funded-projects' },
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
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 font-heading text-lg font-medium text-navy lg:text-2xl ${
                  isActive ? 'border-b-2 border-navy' : ''
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}
