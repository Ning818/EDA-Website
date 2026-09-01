import { Routes, Route } from 'react-router-dom'
import Header from './components/layout/Header'
import Footer from './components/layout/Footer'
import Home from './pages/Home'
import Research from './pages/Research'
import FundedProjects from './pages/FundedProjects'
import Collaborations from './pages/Collaborations'
import Teaching from './pages/Teaching'

export default function App() {
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
