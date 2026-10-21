import PageIntroBand from '../components/sections/PageIntroBand'
import GlobeParticles from '../components/sections/GlobeParticles'
import LogoGrid from '../components/sections/LogoGrid'
import IntroFacts from '../components/sections/IntroFacts'
import JointProjects from '../components/sections/JointProjects'

import brown from '../assets/images/universities/brown.png'
import columbia from '../assets/images/universities/columbia.png'
import cornell from '../assets/images/universities/cornell.png'
import nus from '../assets/images/universities/nus.png'
import southampton from '../assets/images/universities/southampton.png'
import stanford from '../assets/images/universities/stanford.png'
import bologna from '../assets/images/universities/bologna.png'
import turin from '../assets/images/universities/turin.png'
import usc from '../assets/images/universities/usc.png'
import colorado from '../assets/images/universities/colorado.png'
import epfl from '../assets/images/universities/epfl.png'
import helsinki from '../assets/images/universities/helsinki.png'
import manchester from '../assets/images/universities/manchester.png'
import verona from '../assets/images/universities/verona.png'
import polimi from '../assets/images/universities/polimi.png'

import fraunhofer from '../assets/images/institutes/fraunhofer.png'
import candioloIrccs from '../assets/images/institutes/candiolo-irccs.png'
import ceaLeti from '../assets/images/institutes/cea-leti.png'
import izsPlv from '../assets/images/institutes/izs-plv.png'

import arup from '../assets/images/companies/arup.png'
import cnet from '../assets/images/companies/cnet.png'
import hp from '../assets/images/companies/hp.png'
import intel from '../assets/images/companies/intel.png'
import nxp from '../assets/images/companies/nxp.png'
import philips from '../assets/images/companies/philips.png'
import tim from '../assets/images/companies/tim.png'
import infineon from '../assets/images/companies/infineon.png'
import iren from '../assets/images/companies/iren.png'
import offis from '../assets/images/companies/offis.png'
import stm from '../assets/images/companies/stm.png'

const UNIVERSITIES = [
  { src: brown, alt: 'Brown University' },
  { src: columbia, alt: 'Columbia University in the City of New York' },
  { src: cornell, alt: 'Cornell University' },
  { src: nus, alt: 'National University of Singapore' },
  { src: southampton, alt: 'University of Southampton' },
  { src: stanford, alt: 'Stanford University' },
  { src: bologna, alt: 'Università di Bologna' },
  { src: turin, alt: 'Università degli Studi di Torino' },
  { src: usc, alt: 'University of Southern California' },
  { src: colorado, alt: 'University of Colorado Boulder' },
  { src: epfl, alt: 'École Polytechnique Fédérale de Lausanne' },
  { src: helsinki, alt: 'University of Helsinki' },
  { src: manchester, alt: 'The University of Manchester' },
  { src: verona, alt: 'Università degli Studi di Verona' },
  { src: polimi, alt: 'Politecnico di Milano' },
]

const INSTITUTES = [
  { src: fraunhofer, alt: 'Fraunhofer FIT' },
  { src: candioloIrccs, alt: 'Istituto di Candiolo - IRCCS' },
  { src: ceaLeti, alt: 'CEA-Leti' },
  { src: izsPlv, alt: 'IZS PLV' },
  null,
]

const COMPANIES = [
  { src: arup, alt: 'Arup' },
  { src: cnet, alt: 'CNet Svenska AB' },
  { src: hp, alt: 'HP Inc.' },
  { src: intel, alt: 'Intel Corporation' },
  { src: nxp, alt: 'NXP Semiconductors' },
  { src: philips, alt: 'Philips' },
  { src: tim, alt: 'TIM S.p.A.' },
  { src: infineon, alt: 'Infineon Technologies' },
  { src: iren, alt: 'IREN S.p.A.' },
  { src: offis, alt: 'OFFIS e.V.' },
  { src: stm, alt: 'STMicroelectronics' },
  null,
  null,
  null,
  null,
]

// Examples of joint projects with collaborators from the logo walls, from the projects' records on CORDIS (the EU's research information service): the project, its
// funding programme and years, who coordinated it, and its other partners that are among the collaborators below (the record names Fraunhofer as the
// Fraunhofer-Gesellschaft, not its institute FIT).
const JOINT_PROJECTS = [
  {
    code: 'DIMMER',
    name: 'District Information Modeling and Management for Energy Reduction',
    funding: 'EU FP7',
    years: '2013–2016',
    coordinator: 'Politecnico di Torino',
    partners: ['Arup', 'CNet Svenska', 'IREN', 'Fraunhofer', 'The University of Manchester', 'Università degli Studi di Torino'],
    url: 'https://cordis.europa.eu/project/id/609084',
  },
  {
    code: 'CONTREX',
    name: 'Design of embedded mixed-criticality CONTRol systems under consideration of EXtra-functional properties',
    funding: 'EU FP7',
    years: '2013–2016',
    coordinator: 'OFFIS',
    partners: ['Intel', 'STMicroelectronics', 'Politecnico di Milano'],
    url: 'https://cordis.europa.eu/project/id/611146',
  },
  {
    code: 'R3-PowerUP',
    name: '300mm Pilot Line for Smart Power and Power Discretes',
    funding: 'EU H2020 (ECSEL)',
    years: '2017–2023',
    coordinator: 'STMicroelectronics',
    partners: ['Politecnico di Milano', 'Università di Bologna'],
    url: 'https://cordis.europa.eu/project/id/737417',
  },
]

export default function Collaborations() {
  return (
    // A light page, like Teaching: the site's mint ground with a faint dot grid and soft glows of teal (behind the globe) and blue (down the
    // left); the glows' layer reaches up 96px, behind the (translucent) nav bar, so they carry on into it - the dot grid does not. The header band has no background of its own, so the globe and the text sit straight on the page; the paragraph runs on as far as the
    // globe's left edge (the width follows the globe's size and position, GlobeParticles.jsx); the logos sit on plates.
    <main className="relative pb-6">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 -top-24 bg-[radial-gradient(ellipse_55%_40%_at_82%_calc(96px+(100%-96px)*0.1),rgba(63,176,184,0.16),transparent_70%),radial-gradient(ellipse_45%_30%_at_6%_calc(96px+(100%-96px)*0.42),rgba(47,134,179,0.10),transparent_70%)]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(0,40,67,0.10)_1px,transparent_1.3px)] bg-[length:24px_24px] [mask-image:linear-gradient(to_bottom,black_30%,transparent_92%)]" />

      <PageIntroBand category="EDA Group" title="Collaborations" light bandRule={false} bandBg="" backdrop={<GlobeParticles light />} textWidth="lg:max-w-[clamp(380px,min(max(calc(17vw+285px),calc(100vw-711px)),calc(50vw+9px)),900px)]"
        after={
          <IntroFacts
            items={[
              [UNIVERSITIES.length, 'Universities'],
              [INSTITUTES.filter(Boolean).length, 'Institutes'],
              [COMPANIES.filter(Boolean).length, 'Companies'],
            ]}
          />
        }
      >
        We carry out joint projects with universities, research institutes and companies, for example the EU projects DIMMER, CONTREX and R3-PowerUP, shown below.
      </PageIntroBand>

      <JointProjects title="Examples of Joint Projects" projects={JOINT_PROJECTS} />
      <LogoGrid tone="light" title="Collaboration Universities" logos={UNIVERSITIES} />
      <LogoGrid tone="light" title="Collaboration Institutes" logos={INSTITUTES} />
      <LogoGrid tone="light" title="Collaboration Companies" logos={COMPANIES} />
    </main>
  )
}
