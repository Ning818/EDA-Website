import { useState } from 'react'
import PageIntroBand from '../components/sections/PageIntroBand'
import TeachingSidebar from '../components/sections/TeachingSidebar'
import NetworkParticles from '../components/sections/NetworkParticles'
import ProfessorGrid from '../components/sections/ProfessorGrid'

import enricoMacii from '../assets/images/professors/enrico-macii.png'
import alessandroAliberti from '../assets/images/professors/alessandro-aliberti.jpg'
import danieleJahierPagliari from '../assets/images/professors/daniele-jahier-pagliari.jpg'
import edoardoPatti from '../assets/images/professors/edoardo-patti.jpg'
import francescoPonzio from '../assets/images/professors/francesco-ponzio.jpg'
import gianvitoUrgese from '../assets/images/professors/gianvito-urgese.jpg'
import lorenzoBottaccioli from '../assets/images/professors/lorenzo-bottaccioli.jpg'
import lucaBarbierato from '../assets/images/professors/luca-barbierato.jpg'
import santaDiCataldo from '../assets/images/professors/santa-di-cataldo.jpg'
import saraVinco from '../assets/images/professors/sara-vinco.jpg'

// The photos added from the group's People page, by file name (the person's name in lower case, words joined by hyphens).
const PHOTOS = import.meta.glob('../assets/images/people/*.{jpg,png}', { eager: true, import: 'default' })
const photoFor = (slug) => PHOTOS[`../assets/images/people/${slug}.jpg`] ?? PHOTOS[`../assets/images/people/${slug}.png`]

// The professors, as the group's own People page lists them (eda.polito.it/people, April 2026), in its order. `links` show on the card's
// hover state; a missing key hides its row: Polito Page / ORCID Publication / LinkedIn (from each person's own polito.it staff page and ORCID
// record - the LinkedIn links of Ponzio, Bottaccioli, Di Cataldo and Vinco were given by the user), and Department Website / IRIS,
// which are the links on the person's own page of the group's site. The professors added from that page have those two and, where polito.it's staff directory lists them, their Polito Page.
const PROFESSORS = [
  {
    photo: enricoMacii,
    name: 'Enrico Macii',
    title: 'Full Professor',
    links: { polito: 'https://www.polito.it/personale?p=002042', orcid: 'https://orcid.org/0000-0001-9046-5618', dept: 'http://www.dist.polito.it/en/personale/scheda/(nominativo)/enrico.macii', iris: 'https://iris.polito.it/cris/rp/rp14924' },
  },
  { photo: photoFor('massimo-poncino'), name: 'Massimo Poncino', title: 'Full Professor', links: { linkedin: 'https://www.linkedin.com/in/massimo-poncino-95470935/', polito: 'https://www.polito.it/personale?p=002156', dept: 'http://www.dauin.polito.it/personale/scheda/(nominativo)/massimo.poncino', iris: 'https://iris.polito.it/cris/rp/rp06119' } },
  { photo: photoFor('alberto-macii'), name: 'Alberto Macii', title: 'Full Professor', links: { polito: 'https://www.polito.it/personale?p=003783', dept: 'http://www.dauin.polito.it/personale/scheda/(nominativo)/alberto.macii', iris: 'https://iris.polito.it/cris/rp/rp05986' } },
  { photo: photoFor('andrea-calimera'), name: 'Andrea Calimera', title: 'Full Professor', links: { linkedin: 'https://www.linkedin.com/in/andrea-calimera/', polito: 'https://www.polito.it/personale?p=018408', dept: 'http://www.dauin.polito.it/personale/scheda/(nominativo)/andrea.calimera', iris: 'https://iris.polito.it/cris/rp/rp00690' } },
  {
    photo: santaDiCataldo,
    name: 'Santa Di Cataldo',
    title: 'Associate Professor',
    links: { polito: 'https://www.polito.it/personale?p=019491', orcid: 'https://orcid.org/0000-0002-6239-8945', linkedin: 'https://www.linkedin.com/in/santadicataldo/', dept: 'http://www.dauin.polito.it/personale/scheda/(nominativo)/santa.dicataldo', iris: 'https://iris.polito.it/cris/rp/rp00547' },
  },
  {
    photo: saraVinco,
    name: 'Sara Vinco',
    title: 'Associate Professor',
    links: { polito: 'https://www.polito.it/personale?p=032283', orcid: 'https://orcid.org/0000-0001-9666-5194', linkedin: 'https://www.linkedin.com/in/sara-vinco/', dept: 'http://www.dauin.polito.it/personale/scheda/(nominativo)/sara.vinco', iris: 'https://iris.polito.it/cris/rp/rp19917' },
  },
  {
    photo: edoardoPatti,
    name: 'Edoardo Patti',
    title: 'Associate Professor',
    links: { polito: 'https://www.polito.it/personale?p=024365', orcid: 'https://orcid.org/0000-0002-6043-6477', linkedin: 'https://www.linkedin.com/in/edoardopatti/', dept: 'http://www.dauin.polito.it/personale/scheda/(nominativo)/edoardo.patti', iris: 'https://iris.polito.it/cris/rp/rp11009' },
  },
  {
    photo: lorenzoBottaccioli,
    name: 'Lorenzo Bottaccioli',
    title: 'Associate Professor',
    links: { polito: 'https://www.polito.it/personale?p=036638', orcid: 'https://orcid.org/0000-0001-7445-3975', linkedin: 'https://www.linkedin.com/in/lorenzo-bottaccioli-4342806a/', dept: 'http://www.dauin.polito.it/personale/scheda/(nominativo)/lorenzo.bottaccioli', iris: 'https://iris.polito.it/cris/rp/rp22820' },
  },
  {
    photo: danieleJahierPagliari,
    name: 'Daniele Jahier Pagliari',
    title: 'Associate Professor',
    links: { polito: 'https://www.polito.it/personale?p=035148', orcid: 'https://orcid.org/0000-0002-2872-7071', linkedin: 'https://www.linkedin.com/in/danielejahierpagliari/', dept: 'http://www.dauin.polito.it/personale/scheda/(nominativo)/daniele.jahier', iris: 'https://iris.polito.it/cris/rp/rp21401' },
  },
  {
    photo: gianvitoUrgese,
    name: 'Gianvito Urgese',
    title: 'Associate Professor',
    links: { polito: 'https://www.polito.it/personale?p=018489', orcid: 'https://orcid.org/0000-0003-2672-7593', linkedin: 'https://www.linkedin.com/in/gianvito-urgese-5bb2668a/', dept: 'http://www.dist.polito.it/en/personale/scheda/(nominativo)/gianvito.urgese', iris: 'https://iris.polito.it/cris/rp/rp21802' },
  },
  { photo: photoFor('vittorio-fra'), name: 'Vittorio Fra', title: 'Assistant Professor', links: { linkedin: 'https://www.linkedin.com/in/vittorio-fra-1766171ba/', dept: 'https://www.dist.polito.it/personale/scheda/(nominativo)/vittorio.fra', iris: 'https://iris.polito.it/browse?type=author&authority=rp48748&authority_lang=en' } },
  {
    photo: alessandroAliberti,
    name: 'Alessandro Aliberti',
    title: 'Assistant Professor',
    links: { polito: 'https://www.polito.it/personale?p=040463', orcid: 'https://orcid.org/0000-0001-8828-608X', linkedin: 'https://www.linkedin.com/in/alessandro-aliberti/', dept: 'http://www.dauin.polito.it/personale/scheda/(nominativo)/alessandro.aliberti', iris: 'https://iris.polito.it/cris/rp/rp29226' },
  },
  { photo: photoFor('valentino-peluso'), name: 'Valentino Peluso', title: 'Assistant Professor', links: { linkedin: 'https://www.linkedin.com/in/valentino-peluso-693372a3/', polito: 'https://www.polito.it/personale?p=032364', dept: 'http://www.dauin.polito.it/personale/scheda/(nominativo)/valentino.peluso', iris: 'https://iris.polito.it/cris/rp/rp18796' } },
  {
    photo: francescoPonzio,
    name: 'Francesco Ponzio',
    title: 'Assistant Professor',
    links: { polito: 'https://www.polito.it/personale?p=038677', orcid: 'https://orcid.org/0000-0002-8472-8247', linkedin: 'https://www.linkedin.com/in/francesco-ponzio-biomedical-engineer/', dept: 'http://www.dauin.polito.it/personale/scheda/(nominativo)/francesco.ponzio', iris: 'https://iris.polito.it/cris/rp/rp22392' },
  },
  {
    photo: lucaBarbierato,
    name: 'Luca Barbierato',
    title: 'Assistant Professor',
    links: { polito: 'https://www.polito.it/personale?p=038687', orcid: 'https://orcid.org/0000-0001-6470-3299', linkedin: 'https://www.linkedin.com/in/luca-barbierato-ph-d-3937a75b/', dept: 'http://www.dauin.polito.it/personale/scheda/(nominativo)/luca.barbierato', iris: 'https://iris.polito.it/cris/rp/rp22421' },
  },
]

// The PhD students & research fellows and Alumni tabs, from the same People page: the PhD candidates it lists, and its "Wall of Fame (former
// EDA Group members)", both in the page's order (Luca Barbierato, who it lists with the professors, is in Professors above). Alessio Mascolini
// and Pietro Rando Mazzarino are listed there as PhD candidates, but polito.it's staff directory has them as research fellows (assegnisti
// di ricerca), so they are Research Fellows here, ahead of the PhD students. A card without a photo shows the person's initials. `links`:
// Department Website and IRIS as on the person's own page there, for those whose page has them.
const RESEARCH_FELLOWS = [
  { photo: photoFor('alessio-mascolini'), name: 'Alessio Mascolini', title: 'Research Fellow', links: { linkedin: 'https://www.linkedin.com/in/alessio-mascolini-5a3095193/', polito: 'https://www.polito.it/personale?p=036731', dept: 'https://www.dauin.polito.it/personale/scheda/(nominativo)/alessio.mascolini', iris: 'https://iris.polito.it/browse?type=author&authority=rp25050&authority_lang=en' } },
  { photo: photoFor('pietro-rando-mazzarino'), name: 'Pietro Rando Mazzarino', title: 'Research Fellow', links: { linkedin: 'https://www.linkedin.com/in/pietro-rando-mazzarino/', polito: 'https://www.polito.it/personale?p=071284', iris: 'https://iris.polito.it/cris/rp/rp127472' } },
]

const PHD_STUDENTS = [
  { photo: photoFor('matteo-grimaldi'), name: 'Matteo Grimaldi', title: 'PhD Student', links: { linkedin: 'https://www.linkedin.com/in/matteogrimaldi11/', dept: 'http://www.dauin.polito.it/personale/scheda/(nominativo)/matteo.grimaldi', iris: 'https://iris.polito.it/cris/rp/rp37182?sort_byall=2&orderall=DESC&open=all' } },
  { photo: photoFor('alberto-bocca'), name: 'Alberto Bocca', title: 'PhD Student', links: { linkedin: 'https://www.linkedin.com/in/alberto-bocca-0938bb111/', dept: 'http://www.dauin.polito.it/personale/scheda/(nominativo)/alberto.bocca', iris: 'https://iris.polito.it/cris/rp/rp06831' } },
  { photo: photoFor('marco-massano'), name: 'Marco Massano', title: 'PhD Student', links: { iris: 'https://iris.polito.it/cris/rp/rp58434', linkedin: 'https://www.linkedin.com/in/marcomassano90/', dept: 'http://www.dist.polito.it/en/personale/scheda/(nominativo)/marco.massano' } },
  { photo: photoFor('matteo-orlando'), name: 'Matteo Orlando', title: 'PhD Student', links: { linkedin: 'https://www.linkedin.com/in/matteo-orlando/', dept: 'http://www.dauin.polito.it/personale/scheda/(nominativo)/matteo.orlando', iris: 'https://iris.polito.it/cris/rp/rp35720?sort_byall=2&orderall=DESC&open=all' } },
  { photo: photoFor('davide-cannizzaro'), name: 'Davide Cannizzaro', title: 'PhD Student', links: { linkedin: 'https://www.linkedin.com/in/davidecannizzaro/', dept: 'http://www.dauin.polito.it/personale/scheda/(nominativo)/davide.cannizzaro', iris: 'https://iris.polito.it/cris/rp/rp30609' } },
  { photo: photoFor('evelina-forno'), name: 'Evelina Forno', title: 'PhD Student', links: { iris: 'https://iris.polito.it/cris/rp/rp00267', dept: 'http://www.dauin.polito.it/personale/scheda/(nominativo)/evelina.forno' } },
  { photo: photoFor('matteo-risso'), name: 'Matteo Risso', title: 'PhD Student', links: { linkedin: 'https://www.linkedin.com/in/matteo-risso-a66b01104/', iris: 'https://iris.polito.it/cris/rp/rp125528' } },
  { photo: photoFor('chen-xie'), name: 'Chen Xie', title: 'PhD Student', links: { linkedin: 'https://www.linkedin.com/in/chen-xie-293b93184/', dept: 'http://www.dauin.polito.it/personale/scheda/(nominativo)/chen.xie', iris: 'https://iris.polito.it/browse?type=author&authority=rp67670&authority_lang=en' } },
  { photo: photoFor('francesco-daghero'), name: 'Francesco Daghero', title: 'PhD Student', links: { linkedin: 'https://www.linkedin.com/in/francesco-daghero-7ba50a177/', dept: 'http://www.dauin.polito.it/personale/scheda/(nominativo)/francesco.daghero', iris: 'https://iris.polito.it/browse?type=author&authority=rp76296&authority_lang=en' } },
  { photo: photoFor('claudia-de-vizia'), name: 'Claudia De Vizia', title: 'PhD Student', links: { linkedin: 'https://www.linkedin.com/in/claudiadevizia/', dept: 'https://www.dauin.polito.it/it/personale/scheda/(nominativo)/claudia.devizia', iris: 'https://iris.polito.it/browse?type=author&authority=rp81158&authority_lang=en' } },
]

const ALUMNI = [
  { photo: photoFor('andrea-acquaviva'), name: 'Andrea Acquaviva', title: 'Former member', links: { linkedin: 'https://www.linkedin.com/in/andrea-acquaviva-3868ab4/', iris: 'https://iris.polito.it/cris/rp/rp22608' } },
  { photo: photoFor('elisa-ficarra'), name: 'Elisa Ficarra', title: 'Former member', links: { linkedin: 'https://www.linkedin.com/in/elisa-ficarra-4b3b0917/', dept: 'http://www.dauin.polito.it/personale/scheda/(nominativo)/elisa.ficarra', iris: 'https://iris.polito.it/cris/rp/rp08674' } },
  { photo: photoFor('carmelo-foti'), name: 'Carmelo Foti', title: 'Former member', links: { iris: 'https://iris.polito.it/cris/rp/rp14702' } },
  { photo: photoFor('francesco-abate'), name: 'Francesco Abate', title: 'Former member', links: { iris: 'https://iris.polito.it/cris/rp/rp22866', linkedin: 'https://www.linkedin.com/in/francescoabate17/' } },
  { photo: photoFor('ardita-shkurti'), name: 'Ardita Shkurti', title: 'Former member', links: { iris: 'https://iris.polito.it/cris/rp/rp04580', linkedin: 'https://www.linkedin.com/in/ashkurti/' } },
  { photo: photoFor('donghwa-shin'), name: 'Donghwa Shin', title: 'Former member', links: { iris: 'https://iris.polito.it/cris/rp/rp15276', linkedin: 'https://www.linkedin.com/in/donghwa-shin-5ab65028/' } },
  { photo: photoFor('massimo-petricca'), name: 'Massimo Petricca', title: 'Former member', links: { iris: 'https://iris.polito.it/cris/rp/rp16315' } },
  { photo: photoFor('haroon-mahmood'), name: 'Haroon Mahmood', title: 'Former member', links: { iris: 'https://iris.polito.it/cris/rp/rp11091' } },
  { photo: photoFor('sandeep-miryala'), name: 'Sandeep Miryala', title: 'Former member', links: { iris: 'https://iris.polito.it/cris/rp/rp11085', linkedin: 'https://www.linkedin.com/in/sandeep-miryala-b03b0820/' } },
  { photo: photoFor('gasser-ayad'), name: 'Gasser Ayad', title: 'Former member', links: { iris: 'https://iris.polito.it/cris/rp/rp15545' } },
  { photo: photoFor('simone-tonti'), name: 'Simone Tonti', title: 'Former member', links: { linkedin: 'https://www.linkedin.com/in/simone-tonti-1b438a50/', iris: 'https://iris.polito.it/browse?type=author&authority=rp16645&authority_lang=en' } },
  { photo: photoFor('alessandro-sassone'), name: 'Alessandro Sassone', title: 'Former member', links: { linkedin: 'https://www.linkedin.com/in/alessandrosassone/', iris: 'https://iris.polito.it/browse?type=author&authority=rp08269&authority_lang=en' } },
  { photo: photoFor('novella-tala'), name: "Novella Tala'", title: 'Former member', links: { iris: 'https://iris.polito.it/browse?type=author&authority=rp05231&authority_lang=it' } },
  { photo: photoFor('laura-cantini'), name: 'Laura Cantini', title: 'Former member' },
  { photo: photoFor('ramakrishna-nittala-venkata'), name: 'RamaKrishna Nittala Venkata', title: 'Former member', links: { iris: 'https://iris.polito.it/browse?type=author&authority=rp21093&authority_lang=en' } },
  { photo: photoFor('francesco-g-brundu'), name: 'Francesco G. Brundu', title: 'Former member', links: { linkedin: 'https://www.linkedin.com/in/francescobrundu/', iris: 'https://iris.polito.it/browse?type=author&authority=rp17759&authority_lang=en' } },
  { photo: photoFor('giulia-paciello'), name: 'Giulia Paciello', title: 'Former member', links: { linkedin: 'https://www.linkedin.com/in/giuliapaciello/', iris: 'https://iris.polito.it/browse?type=author&authority=rp19862&authority_lang=it' } },
  { photo: photoFor('orazio-maria-scicolone'), name: 'Orazio Maria Scicolone', title: 'Former member', links: { iris: 'https://iris.polito.it/cris/rp/rp41871' } },
  { photo: photoFor('valerio-tenace'), name: 'Valerio Tenace', title: 'Former member', links: { linkedin: 'https://www.linkedin.com/in/tenace/', iris: 'https://iris.polito.it/cris/rp/rp17410' } },
  { photo: photoFor('million-mengistu'), name: 'Million Mengistu', title: 'Former member', links: { linkedin: 'https://www.linkedin.com/in/millzon/', iris: 'https://iris.polito.it/cris/rp/rp33250' } },
  { photo: photoFor('maria-serena-ciaburri'), name: 'Maria Serena Ciaburri', title: 'Former member', links: { iris: 'https://iris.polito.it/cris/rp/rp13788', linkedin: 'https://www.linkedin.com/in/msciaburri/' } },
  { photo: photoFor('wenlong-wang'), name: 'Wenlong Wang', title: 'Former member', links: { iris: 'https://iris.polito.it/cris/rp/rp56040', linkedin: 'https://www.linkedin.com/in/wenlong-wang-8153b173/', dept: 'http://www.dauin.polito.it/personale/scheda/(nominativo)/wenlong.wang' } },
  { photo: photoFor('francesco-barchi'), name: 'Francesco Barchi', title: 'Former member', links: { linkedin: 'https://www.linkedin.com/in/francesco-barchi/', dept: 'http://www.dauin.polito.it/personale/scheda/(nominativo)/francesco.barchi', iris: 'https://iris.polito.it/cris/rp/rp26484' } },
  { photo: photoFor('emanuele-parisi'), name: 'Emanuele Parisi', title: 'Former member', links: { iris: 'https://iris.polito.it/cris/rp/rp30147' } },
  { photo: photoFor('marta-lovino'), name: 'Marta Lovino', title: 'Former member', links: { iris: 'https://iris.polito.it/cris/rp/rp38120', linkedin: 'https://www.linkedin.com/in/marta-lovino/' } },
  { photo: photoFor('yukai-chen'), name: 'Yukai Chen', title: 'Former member', links: { linkedin: 'https://www.linkedin.com/in/yukai-chen-88948675/', dept: 'http://www.dauin.polito.it/personale/scheda/(nominativo)/yukai.chen', iris: 'https://iris.polito.it/cris/rp/rp23241' } },
  { photo: photoFor('roberto-giorgio-rizzo'), name: 'Roberto Giorgio Rizzo', title: 'Former member', links: { iris: 'https://iris.polito.it/cris/rp/rp22865', linkedin: 'https://www.linkedin.com/in/roberto-g-rizzo/' } },
  { photo: photoFor('luca-mocerino'), name: 'Luca Mocerino', title: 'Former member', links: { iris: 'https://iris.polito.it/cris/rp/rp51333', linkedin: 'https://www.linkedin.com/in/lucamocerino/', dept: 'http://www.dauin.polito.it/personale/scheda/(nominativo)/luca.mocerino' } },
  { photo: photoFor('antonio-cipolletta'), name: 'Antonio Cipolletta', title: 'Former member', links: { iris: 'https://iris.polito.it/cris/rp/rp34371', linkedin: 'https://www.linkedin.com/in/antonio-cipolletta/', dept: 'http://www.dauin.polito.it/personale/scheda/(nominativo)/antonio.cipolletta' } },
  { photo: photoFor('donkyu-baek'), name: 'Donkyu Baek', title: 'Former member', links: { linkedin: 'https://www.linkedin.com/in/donkyu-baek-69b079bb/', dept: 'http://www.dauin.polito.it/personale/scheda/(nominativo)/donkyu.baek', iris: 'https://iris.polito.it/cris/rp/rp51411' } },
]

const PEOPLE_BY_TAB = {
  Professors: PROFESSORS,
  'PhD Students & Research Fellows': [...RESEARCH_FELLOWS, ...PHD_STUDENTS],
  Alumni: ALUMNI,
}

export default function Teaching() {
  const [active, setActive] = useState('Professors')
  const people = PEOPLE_BY_TAB[active] ?? []

  return (
    // A light page: the site's mint ground with a faint dot grid and a soft teal glow behind the sidebar. The header band has no background
    // of its own, so it flows into the content (no hairline under it). Behind everything is a
    // network of particles whose nodes sit on the dots of this grid (NetworkParticles, a canvas as big as the page, scrolling with it); the paragraph runs the full
    // width over it, the white sidebar and cards cover it.
    <main className="relative pb-6">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(0,40,67,0.10)_1px,transparent_1.3px)] bg-[length:24px_24px] [mask-image:linear-gradient(to_bottom,black_94%,transparent)]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_14%_52%,rgba(63,176,184,0.12),transparent)]" />
      <NetworkParticles />
      <PageIntroBand category="EDA Group" title="People" light bandRule={false} titleVeil bandBg="" backdrop={null}>
        Our academic community is structured around three groups that sustain our research and educational mission.
        Our Professors spearhead advanced pedagogical and scientific inquiry within the domains of design automation
        and complex systems. Working in close synergy with them are our PhD Students and Research Fellows, who drive
        empirical and theoretical innovation in the group's research. Our distinguished Alumni, whose professional
        trajectories extend our institutional impact globally, remain an essential part of the collective we form
        together.
      </PageIntroBand>

      <div className="relative mx-auto flex max-w-[1440px] flex-col gap-6 px-8 pt-4 lg:flex-row lg:gap-8 lg:px-[120px]">
        <TeachingSidebar active={active} onSelect={setActive} />
        <ProfessorGrid professors={people} />
      </div>
    </main>
  )
}
