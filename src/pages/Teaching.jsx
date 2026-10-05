import { useState } from 'react'
import PageIntroBand from '../components/sections/PageIntroBand'
import TeachingSidebar from '../components/sections/TeachingSidebar'
import NetworkParticles from '../components/sections/NetworkParticles'
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

// `links` (Polito Page / ORCID Publication / LinkedIn) show on the card's hover state; a missing key hides its row.
// Taken from each person's own polito.it staff page (the ORCID ids were also checked against pub.orcid.org's name
// for that id); the LinkedIn links of Burrello, Ponzio, Bottaccioli, Di Cataldo and Vinco were given by the user.
// Macii has no LinkedIn yet, so that row is hidden on his card.
const PROFESSORS = [
  {
    photo: enricoMacii,
    name: 'Enrico Macii',
    title: 'Full Professor',
    links: {
      polito: 'https://www.polito.it/personale?p=002042',
      orcid: 'https://orcid.org/0000-0001-9046-5618',
    },
  },
  {
    photo: alessandroAliberti,
    name: 'Alessandro Aliberti',
    title: 'Assistant Professor',
    links: {
      polito: 'https://www.polito.it/personale?p=040463',
      orcid: 'https://orcid.org/0000-0001-8828-608X',
      linkedin: 'https://www.linkedin.com/in/alessandro-aliberti/',
    },
  },
  {
    photo: alessioBurrello,
    name: 'Alessio Burrello',
    title: 'Assistant Professor',
    links: {
      polito: 'https://www.polito.it/personale?p=036284',
      orcid: 'https://orcid.org/0000-0002-6215-8220',
      linkedin: 'https://www.linkedin.com/in/alessio-burrello-750533107/',
    },
  },
  {
    photo: danieleJahierPagliari,
    name: 'Daniele Jahier Pagliari',
    title: 'Associate Professor',
    links: {
      polito: 'https://www.polito.it/personale?p=035148',
      orcid: 'https://orcid.org/0000-0002-2872-7071',
      linkedin: 'https://www.linkedin.com/in/danielejahierpagliari/',
    },
  },
  {
    photo: edoardoPatti,
    name: 'Edoardo Patti',
    title: 'Associate Professor',
    links: {
      polito: 'https://www.polito.it/personale?p=024365',
      orcid: 'https://orcid.org/0000-0002-6043-6477',
      linkedin: 'https://www.linkedin.com/in/edoardopatti/',
    },
  },
  {
    photo: francescoPonzio,
    name: 'Francesco Ponzio',
    title: 'Assistant Professor',
    links: {
      polito: 'https://www.polito.it/personale?p=038677',
      orcid: 'https://orcid.org/0000-0002-8472-8247',
      linkedin: 'https://www.linkedin.com/in/francesco-ponzio-biomedical-engineer/',
    },
  },
  {
    photo: gianvitoUrgese,
    name: 'Gianvito Urgese',
    title: 'Associate Professor',
    links: {
      polito: 'https://www.polito.it/personale?p=018489',
      orcid: 'https://orcid.org/0000-0003-2672-7593',
      linkedin: 'https://www.linkedin.com/in/gianvito-urgese-5bb2668a/',
    },
  },
  {
    photo: lorenzoBottaccioli,
    name: 'Lorenzo Bottaccioli',
    title: 'Associate Professor',
    links: {
      polito: 'https://www.polito.it/personale?p=036638',
      orcid: 'https://orcid.org/0000-0001-7445-3975',
      linkedin: 'https://www.linkedin.com/in/lorenzo-bottaccioli-4342806a/',
    },
  },
  {
    photo: lucaBarbierato,
    name: 'Luca Barbierato',
    title: 'Assistant Professor',
    links: {
      polito: 'https://www.polito.it/personale?p=038687',
      orcid: 'https://orcid.org/0000-0001-6470-3299',
      linkedin: 'https://www.linkedin.com/in/luca-barbierato-ph-d-3937a75b/',
    },
  },
  {
    photo: santaDiCataldo,
    name: 'Santa Di Cataldo',
    title: 'Associate Professor',
    links: {
      polito: 'https://www.polito.it/personale?p=019491',
      orcid: 'https://orcid.org/0000-0002-6239-8945',
      linkedin: 'https://www.linkedin.com/in/santadicataldo/',
    },
  },
  {
    photo: saraVinco,
    name: 'Sara Vinco',
    title: 'Associate Professor',
    links: {
      polito: 'https://www.polito.it/personale?p=032283',
      orcid: 'https://orcid.org/0000-0001-9666-5194',
      linkedin: 'https://www.linkedin.com/in/sara-vinco/',
    },
  },
]

// The other sidebar tabs (Phd Students / Alumni / Administrative Clerks) don't have
// real content in Figma yet - reproduced as a placeholder grid that duplicates the
// first professor's card, matching the count of real Professor cards.
const PLACEHOLDER_PEOPLE = Array.from({ length: PROFESSORS.length }, () => PROFESSORS[0])

export default function Teaching() {
  const [active, setActive] = useState('Professors')
  const people = active === 'Professors' ? PROFESSORS : PLACEHOLDER_PEOPLE

  return (
    // A light page: the site's mint ground with a faint dot grid and a soft teal glow behind the sidebar. The header band has no background
    // of its own, so it flows into the content (no hairline under it). Behind everything is a
    // network of particles whose nodes sit on the dots of this grid (NetworkParticles, a canvas as big as the page, scrolling with it); the paragraph runs the full
    // width over it, the white sidebar and cards cover it.
    <main className="relative pb-6">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(0,40,67,0.10)_1px,transparent_1.3px)] bg-[length:24px_24px] [mask-image:linear-gradient(to_bottom,black_94%,transparent)]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_14%_52%,rgba(63,176,184,0.12),transparent)]" />
      <NetworkParticles />
      <PageIntroBand category="EDA Group" title="Teaching" light bandRule={false} titleVeil bandBg="" backdrop={null}>
        Our academic community is structured around four foundational pillars that sustain our research and
        educational mission. Our Professors spearhead advanced pedagogical and scientific inquiry within the domains
        of design automation and complex systems. Working in close synergy with them are our PhD Students, who drive
        empirical and theoretical innovation, alongside our distinguished Alumni, whose professional trajectories
        extend our institutional impact globally. Furthermore, our Administrative Clerks provide essential
        operational infrastructure, ensuring an optimized and cohesive environment for our entire academic
        collective.
      </PageIntroBand>

      <div className="relative mx-auto flex max-w-[1440px] flex-col gap-6 px-8 pt-4 lg:flex-row lg:gap-8 lg:px-[120px]">
        <TeachingSidebar active={active} onSelect={setActive} />
        <ProfessorGrid professors={people} />
      </div>
    </main>
  )
}
