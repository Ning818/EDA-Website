import { useLayoutEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Header from './components/layout/Header'
import Footer from './components/layout/Footer'
import Home from './pages/Home'
import Research from './pages/Research'
import FundedProjects from './pages/FundedProjects'
import Collaborations from './pages/Collaborations'
import Teaching from './pages/Teaching'

// Every navigation (nav bar, in-page links, same-page links, hash links) lands at the top of the page. Keyed on
// `location.key` rather than the path so clicking a link to the page you are already on also goes to the top;
// 'instant' so no smooth-scroll setting turns the jump into a long glide.
function ScrollToTop() {
  const { key } = useLocation()
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [key])
  return null
}

export default function App() {
  return (
    <div className="min-h-screen bg-mint text-navy">
      <ScrollToTop />
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/research" element={<Research />} />
        <Route path="/research/funded-projects" element={<FundedProjects />} />
        <Route path="/research/funded-projects/:theme" element={<FundedProjects />} />
        <Route path="/research/:theme" element={<Research />} />
        <Route path="/collaborations" element={<Collaborations />} />
        <Route path="/teaching" element={<Teaching />} />
      </Routes>
      <Footer />
    </div>
  )
}
