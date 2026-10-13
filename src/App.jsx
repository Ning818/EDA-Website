import { Routes, Route, useLocation } from 'react-router-dom'
import Header from './components/layout/Header'
import Footer from './components/layout/Footer'
import Home from './pages/Home'
import Research from './pages/Research'
import FundedProjects from './pages/FundedProjects'
import Collaborations from './pages/Collaborations'
import Teaching from './pages/Teaching'
import DNABackgroundDemo from './pages/DNABackgroundDemo'

export default function App() {
  const { pathname } = useLocation()
  // Full-screen preview of the DNA particle background, without the site header/footer.
  if (pathname === '/dna-background') return <DNABackgroundDemo />

  return (
    <div className="min-h-screen bg-mint text-navy">
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/research" element={<Research />} />
        <Route path="/research/funded-projects" element={<FundedProjects />} />
        <Route path="/collaborations" element={<Collaborations />} />
        <Route path="/teaching" element={<Teaching />} />
      </Routes>
      <Footer />
    </div>
  )
}
