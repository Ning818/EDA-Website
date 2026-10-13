// Partners shown on the Collaborations page: universities, research institutes and companies, with their logos.
//
// Each entry is { src, alt }: `src` is the logo file (put new logos in src/assets/images/<group>/ and write the path as below),
// `alt` is the partner's full name - it is also the label that appears when the logo is hovered.
// `null` entries are empty slots that only fill out the five-column desktop row; they are not drawn on tablet and phone.
// `npm run check` verifies that every logo file exists.

export const COLLABORATIONS_INTRO =
  "Our research thrives on a vast, global network of strategic partnerships, bridging the gap between cutting-edge academic inquiry and practical industrial implementation. By working in close collaboration with prestigious universities, specialized research institutes, and industry-leading companies, we foster an environment of continuous innovation. These synergistic relationships allow us to push the boundaries of design automation, integrate interdisciplinary expertise, and deliver robust technological solutions that address the complex challenges of tomorrow's digital and energy landscapes."

export const UNIVERSITIES = [
  { src: new URL('../assets/images/universities/brown.png', import.meta.url).href, alt: 'Brown University' },
  { src: new URL('../assets/images/universities/columbia.png', import.meta.url).href, alt: 'Columbia University in the City of New York' },
  { src: new URL('../assets/images/universities/cornell.png', import.meta.url).href, alt: 'Cornell University' },
  { src: new URL('../assets/images/universities/nus.png', import.meta.url).href, alt: 'National University of Singapore' },
  { src: new URL('../assets/images/universities/southampton.png', import.meta.url).href, alt: 'University of Southampton' },
  { src: new URL('../assets/images/universities/stanford.png', import.meta.url).href, alt: 'Stanford University' },
  { src: new URL('../assets/images/universities/bologna.png', import.meta.url).href, alt: 'Università di Bologna' },
  { src: new URL('../assets/images/universities/turin.png', import.meta.url).href, alt: 'Università degli Studi di Torino' },
  { src: new URL('../assets/images/universities/usc.png', import.meta.url).href, alt: 'University of Southern California' },
  { src: new URL('../assets/images/universities/colorado.png', import.meta.url).href, alt: 'University of Colorado Boulder' },
  { src: new URL('../assets/images/universities/epfl.png', import.meta.url).href, alt: 'École Polytechnique Fédérale de Lausanne' },
  { src: new URL('../assets/images/universities/helsinki.png', import.meta.url).href, alt: 'University of Helsinki' },
  { src: new URL('../assets/images/universities/manchester.png', import.meta.url).href, alt: 'The University of Manchester' },
  { src: new URL('../assets/images/universities/verona.png', import.meta.url).href, alt: 'Università degli Studi di Verona' },
  { src: new URL('../assets/images/universities/polimi.png', import.meta.url).href, alt: 'Politecnico di Milano' },
]

export const INSTITUTES = [
  { src: new URL('../assets/images/institutes/fraunhofer.png', import.meta.url).href, alt: 'Fraunhofer FIT' },
  { src: new URL('../assets/images/institutes/candiolo-irccs.png', import.meta.url).href, alt: 'Istituto di Candiolo - IRCCS' },
  { src: new URL('../assets/images/institutes/cea-leti.png', import.meta.url).href, alt: 'CEA-Leti' },
  { src: new URL('../assets/images/institutes/izs-plv.png', import.meta.url).href, alt: 'IZS PLV' },
  null,
]

export const COMPANIES = [
  { src: new URL('../assets/images/companies/arup.png', import.meta.url).href, alt: 'Arup' },
  { src: new URL('../assets/images/companies/cnet.png', import.meta.url).href, alt: 'CNet Svenska AB' },
  { src: new URL('../assets/images/companies/hp.png', import.meta.url).href, alt: 'HP Inc.' },
  { src: new URL('../assets/images/companies/intel.png', import.meta.url).href, alt: 'Intel Corporation' },
  { src: new URL('../assets/images/companies/nxp.png', import.meta.url).href, alt: 'NXP Semiconductors' },
  { src: new URL('../assets/images/companies/philips.png', import.meta.url).href, alt: 'Philips' },
  { src: new URL('../assets/images/companies/tim.png', import.meta.url).href, alt: 'TIM S.p.A.' },
  { src: new URL('../assets/images/companies/infineon.png', import.meta.url).href, alt: 'Infineon Technologies' },
  { src: new URL('../assets/images/companies/iren.png', import.meta.url).href, alt: 'IREN S.p.A.' },
  { src: new URL('../assets/images/companies/offis.png', import.meta.url).href, alt: 'OFFIS e.V.' },
  { src: new URL('../assets/images/companies/stm.png', import.meta.url).href, alt: 'STMicroelectronics' },
  null,
  null,
  null,
  null,
]
