import PageIntroBand from '../components/sections/PageIntroBand'
import TeachingSidebar from '../components/sections/TeachingSidebar'
import ProfessorGrid from '../components/sections/ProfessorGrid'

import enricoMacii from '../assets/images/professors/enrico-macii.png'
import alessandroAliberti from '../assets/images/professors/alessandro-aliberti.jpg'
import alessioBurrello from '../assets/images/professors/alessio-burrello.jpg'
import danieleJahierPagliari from '../assets/images/professors/daniele-jahier-pagliari.jpg'
import edoardoPatti from '../assets/images/professors/edoardo-patti.jpg'
import francescoPonzio from '../assets/images/professors/francesco-ponzio.jpg'
import gianvitoUrgese from '../assets/images/professors/gianvito-urgese.jpg'
import lorenzoBottaccioli from '../assets/images/professors/lorenzo-bottaccioli.jpg'
import lucaBarbierato from '../assets/images/professors/luca-barbierato.jpg'
import santaDiCataldo from '../assets/images/professors/santa-di-cataldo.jpg'
import saraVinco from '../assets/images/professors/sara-vinco.jpg'

const PROFESSORS = [
  { photo: enricoMacii, name: 'Enrico Macii', title: 'Full Professor' },
  { photo: alessandroAliberti, name: 'Alessandro Aliberti', title: 'Assistant Professor' },
  { photo: alessioBurrello, name: 'Alessio Burrello', title: 'Assistant Professor' },
  { photo: danieleJahierPagliari, name: 'Daniele Jahier Pagliari', title: 'Associate Professor' },
  { photo: edoardoPatti, name: 'Edoardo Patti', title: 'Associate Professor' },
  { photo: francescoPonzio, name: 'Francesco Ponzio', title: 'Assistant Professor' },
  { photo: gianvitoUrgese, name: 'Gianvito Urgese', title: 'Associate Professor' },
  { photo: lorenzoBottaccioli, name: 'Lorenzo Bottaccioli', title: 'Associate Professor' },
  { photo: lucaBarbierato, name: 'Luca Barbierato', title: 'Assistant Professor' },
  { photo: santaDiCataldo, name: 'Santa Di Cataldo', title: 'Associate Professor' },
  { photo: saraVinco, name: 'Sara Vinco', title: 'Associate Professor' },
]

export default function Teaching() {
  return (
    <main>
      <PageIntroBand category="Teaching">
        Our academic community is structured around four foundational pillars that sustain our research and
        educational mission. Our Professors spearhead advanced pedagogical and scientific inquiry within the domains
        of design automation and complex systems. Working in close synergy with them are our PhD Students, who drive
        empirical and theoretical innovation, alongside our distinguished Alumni, whose professional trajectories
        extend our institutional impact globally. Furthermore, our Administrative Clerks provide essential
        operational infrastructure, ensuring an optimized and cohesive environment for our entire academic
        collective.
      </PageIntroBand>

      <div className="mx-auto flex max-w-[1440px] flex-col px-8 py-6 lg:flex-row lg:gap-6 lg:px-[120px]">
        <TeachingSidebar active="Professors" />
        <ProfessorGrid professors={PROFESSORS} />
      </div>
    </main>
  )
}
