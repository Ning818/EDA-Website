import { useEffect, useLayoutEffect, useRef } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Header from './components/layout/Header'
import Footer from './components/layout/Footer'
import Home from './pages/Home'
import Research from './pages/Research'
import FundedProjects from './pages/FundedProjects'
import Collaborations from './pages/Collaborations'
import Teaching from './pages/Teaching'
import NotFound from './pages/NotFound'
import { ThemesProvider } from './ThemesProvider'
import { SiteProvider } from './SiteProvider'
import { SocialProvider } from './SocialProvider'
import { useThemes } from './useThemes'

// Every navigation (nav bar, in-page links, same-page links, hash links) lands at the top of the page. Keyed on
// `location.key` rather than the path so clicking a link to the page you are already on also goes to the top;
// 'instant' so no smooth-scroll setting turns the jump into a long glide.
// The exception: picking another group on the People page (?group=) leaves the visitor where they are.
function ScrollToTop() {
  const { key, pathname, search } = useLocation()
  const last = useRef({ pathname, search })
  useLayoutEffect(() => {
    const prev = last.current
    last.current = { pathname, search }
    if (pathname === '/people' && prev.pathname === '/people' && prev.search !== search) return
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [key, pathname, search])
  return null
}

const SITE = 'EDA Group | Politecnico di Torino'

// a theme's name for a tab: its short form where it has one ("Industry 4.0" for "Industry 4.0 and Smart Manufacturing"); the names are the API's (ThemesProvider.jsx)
const themeLabel = (themes, slug = 'vlsi-cad') => {
  const theme = themes.find((t) => t.slug === slug)
  return theme && (theme.short ?? theme.name)
}

// The title of the browser tab for each page, so the tabs, the history and the bookmarks tell the pages apart: "<the page> | EDA Group | Politecnico di Torino"
// (the home page is just the group's name). It is set on every navigation - the pages are one document, so the browser does not do it.
function pageTitle(pathname, themes) {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (path === '/') return SITE
  if (path === '/collaborations') return `Collaborations | ${SITE}`
  if (path === '/people' || path === '/teaching') return `People | ${SITE}`
  // /research and /research/funded-projects are VLSI-CAD's pages (themeLabel's default); a theme the site does not have, like any other path, is the not-found page
  const projects = path.match(/^\/research\/funded-projects(?:\/([^/]+))?$/)
  if (projects && themeLabel(themes, projects[1])) return `${themeLabel(themes, projects[1])} Funded Projects | ${SITE}`
  const research = !projects && path.match(/^\/research(?:\/([^/]+))?$/)
  if (research && themeLabel(themes, research[1])) return `${themeLabel(themes, research[1])} Research | ${SITE}`
  return `Page not found | ${SITE}`
}

// After a change of page (not the first load) the keyboard focus moves to the new page's title, so the screen reader says where the visitor now is and the next
// Tab starts from the page's content rather than from wherever the focus was in the nav bar. The title is not a control: it takes the focus without
// showing a focus ring (index.css, [data-page-title]).
function RouteFocus() {
  const { pathname } = useLocation()
  const shown = useRef(pathname) // the page the focus was last placed for (the first load places none)
  useEffect(() => {
    if (shown.current === pathname) return
    shown.current = pathname
    const title = document.querySelector('main h1')
    if (!title) return
    title.setAttribute('tabindex', '-1')
    title.setAttribute('data-page-title', '')
    title.focus({ preventScroll: true })
  }, [pathname])
  return null
}

// The first control in the page: invisible until it has the focus, then a button-like link at the top left. It moves the focus to the page's main content,
// past the nav bar, so a keyboard visitor does not have to Tab through the nav on every page.
function SkipLink() {
  const skip = (event) => {
    event.preventDefault()
    const main = document.querySelector('main')
    if (!main) return
    main.setAttribute('tabindex', '-1')
    main.setAttribute('data-page-title', '')
    main.focus()
    main.scrollIntoView({ block: 'start' })
  }
  return (
    <a
      href="#main"
      onClick={skip}
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-navy focus:px-5 focus:py-3 focus:type-action focus:text-white focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[#279aae]"
    >
      Skip to main content
    </a>
  )
}

function DocumentTitle() {
  const { pathname } = useLocation()
  const themes = useThemes()
  useEffect(() => {
    document.title = pageTitle(pathname, themes)
  }, [pathname, themes])
  return null
}

export default function App() {
  return (
    <ThemesProvider>
    <SiteProvider>
    <SocialProvider>
    <div className="min-h-screen bg-mint text-navy">
      <SkipLink />
      <ScrollToTop />
      <DocumentTitle />
      <RouteFocus />
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/research" element={<Research />} />
        <Route path="/research/funded-projects" element={<FundedProjects />} />
        <Route path="/research/funded-projects/:theme" element={<FundedProjects />} />
        <Route path="/research/:theme" element={<Research />} />
        <Route path="/collaborations" element={<Collaborations />} />
        <Route path="/people" element={<Teaching />} />
        <Route path="/teaching" element={<Navigate to="/people" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Footer />
    </div>
    </SocialProvider>
    </SiteProvider>
    </ThemesProvider>
  )
}
