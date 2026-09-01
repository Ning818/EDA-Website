import PageIntroBand from '../components/sections/PageIntroBand'
import LogoGrid from '../components/sections/LogoGrid'

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

export default function Collaborations() {
  return (
    <main>
      <PageIntroBand category="Collaborations">
        Our research thrives on a vast, global network of strategic partnerships, bridging the gap between
        cutting-edge academic inquiry and practical industrial implementation. By working in close collaboration
        with prestigious universities, specialized research institutes, and industry-leading companies, we foster an
        environment of continuous innovation. These synergistic relationships allow us to push the boundaries of
        design automation, integrate interdisciplinary expertise, and deliver robust technological solutions that
        address the complex challenges of tomorrow's digital and energy landscapes.
      </PageIntroBand>

      <LogoGrid title="Collaboration Universities" logos={UNIVERSITIES} />
      <LogoGrid title="Collaboration Institutes" logos={INSTITUTES} />
      <LogoGrid title="Collaboration Companies" logos={COMPANIES} />

      <div className="h-16" />
    </main>
  )
}
