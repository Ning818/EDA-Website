// People shown on the site.
//
//   PROFESSORS        the cards on the Teaching page (photo, full title, contact links)
//   TEACHING_GROUPS   the Teaching page's sidebar tabs and what each tab lists
//   INVOLVED_PEOPLE   the small "Involved people" cards on the Research page (short titles)
//
// To add a person: add an entry (the photo goes in src/assets/images/professors/).
// `npm run check` verifies that every referenced photo file exists and that every link is a valid URL.

// Photos are written as `new URL('../assets/images/...', import.meta.url).href` (a literal path, so the bundler can find the file)
// - this also works in plain Node, which lets scripts/check-content.mjs load and verify this file.

// `links` (Polito Page / ORCID Publication / LinkedIn) show on the card's hover state; a missing key hides its row.
// Taken from each person's own polito.it staff page (the ORCID ids were also checked against pub.orcid.org's name
// for that id); the LinkedIn links of Burrello, Ponzio, Bottaccioli, Di Cataldo and Vinco were given by the user.
// Macii has no LinkedIn yet, so that row is hidden on his card.
export const PROFESSORS = [
  {
    photo: new URL('../assets/images/professors/enrico-macii.png', import.meta.url).href,
    name: 'Enrico Macii',
    title: 'Full Professor',
    links: {
      polito: 'https://www.polito.it/personale?p=002042',
      orcid: 'https://orcid.org/0000-0001-9046-5618',
    },
  },
  {
    photo: new URL('../assets/images/professors/alessandro-aliberti.jpg', import.meta.url).href,
    name: 'Alessandro Aliberti',
    title: 'Assistant Professor',
    links: {
      polito: 'https://www.polito.it/personale?p=040463',
      orcid: 'https://orcid.org/0000-0001-8828-608X',
      linkedin: 'https://www.linkedin.com/in/alessandro-aliberti/',
    },
  },
  {
    photo: new URL('../assets/images/professors/alessio-burrello.jpg', import.meta.url).href,
    name: 'Alessio Burrello',
    title: 'Assistant Professor',
    links: {
      polito: 'https://www.polito.it/personale?p=036284',
      orcid: 'https://orcid.org/0000-0002-6215-8220',
      linkedin: 'https://www.linkedin.com/in/alessio-burrello-750533107/',
    },
  },
  {
    photo: new URL('../assets/images/professors/daniele-jahier-pagliari.jpg', import.meta.url).href,
    name: 'Daniele Jahier Pagliari',
    title: 'Associate Professor',
    links: {
      polito: 'https://www.polito.it/personale?p=035148',
      orcid: 'https://orcid.org/0000-0002-2872-7071',
      linkedin: 'https://www.linkedin.com/in/danielejahierpagliari/',
    },
  },
  {
    photo: new URL('../assets/images/professors/edoardo-patti.jpg', import.meta.url).href,
    name: 'Edoardo Patti',
    title: 'Associate Professor',
    links: {
      polito: 'https://www.polito.it/personale?p=024365',
      orcid: 'https://orcid.org/0000-0002-6043-6477',
      linkedin: 'https://www.linkedin.com/in/edoardopatti/',
    },
  },
  {
    photo: new URL('../assets/images/professors/francesco-ponzio.jpg', import.meta.url).href,
    name: 'Francesco Ponzio',
    title: 'Assistant Professor',
    links: {
      polito: 'https://www.polito.it/personale?p=038677',
      orcid: 'https://orcid.org/0000-0002-8472-8247',
      linkedin: 'https://www.linkedin.com/in/francesco-ponzio-biomedical-engineer/',
    },
  },
  {
    photo: new URL('../assets/images/professors/gianvito-urgese.jpg', import.meta.url).href,
    name: 'Gianvito Urgese',
    title: 'Associate Professor',
    links: {
      polito: 'https://www.polito.it/personale?p=018489',
      orcid: 'https://orcid.org/0000-0003-2672-7593',
      linkedin: 'https://www.linkedin.com/in/gianvito-urgese-5bb2668a/',
    },
  },
  {
    photo: new URL('../assets/images/professors/lorenzo-bottaccioli.jpg', import.meta.url).href,
    name: 'Lorenzo Bottaccioli',
    title: 'Associate Professor',
    links: {
      polito: 'https://www.polito.it/personale?p=036638',
      orcid: 'https://orcid.org/0000-0001-7445-3975',
      linkedin: 'https://www.linkedin.com/in/lorenzo-bottaccioli-4342806a/',
    },
  },
  {
    photo: new URL('../assets/images/professors/luca-barbierato.jpg', import.meta.url).href,
    name: 'Luca Barbierato',
    title: 'Assistant Professor',
    links: {
      polito: 'https://www.polito.it/personale?p=038687',
      orcid: 'https://orcid.org/0000-0001-6470-3299',
      linkedin: 'https://www.linkedin.com/in/luca-barbierato-ph-d-3937a75b/',
    },
  },
  {
    photo: new URL('../assets/images/professors/santa-di-cataldo.jpg', import.meta.url).href,
    name: 'Santa Di Cataldo',
    title: 'Associate Professor',
    links: {
      polito: 'https://www.polito.it/personale?p=019491',
      orcid: 'https://orcid.org/0000-0002-6239-8945',
      linkedin: 'https://www.linkedin.com/in/santadicataldo/',
    },
  },
  {
    photo: new URL('../assets/images/professors/sara-vinco.jpg', import.meta.url).href,
    name: 'Sara Vinco',
    title: 'Associate Professor',
    links: {
      polito: 'https://www.polito.it/personale?p=032283',
      orcid: 'https://orcid.org/0000-0001-9666-5194',
      linkedin: 'https://www.linkedin.com/in/sara-vinco/',
    },
  },
]

// The other sidebar tabs (PhD Students / Alumni / Administrative Clerks) have no real content yet: they show a
// placeholder grid that repeats the first professor's card, as many cards as there are real professors.
// TODO(content): replace the placeholder with the real people of each group.
const PLACEHOLDER_PEOPLE = Array.from({ length: PROFESSORS.length }, () => PROFESSORS[0])

/** The Teaching page's sidebar: one tab per group, in this order. */
export const TEACHING_GROUPS = [
  { label: 'Professors', people: PROFESSORS },
  { label: 'Phd Students', people: PLACEHOLDER_PEOPLE },
  { label: 'Alumni', people: PLACEHOLDER_PEOPLE },
  { label: 'Administrative Clerks', people: PLACEHOLDER_PEOPLE },
]

/** The introduction under the Teaching page's title. */
export const TEACHING_INTRO =
  "Our academic community is structured around four foundational pillars that sustain our research and educational mission. Our Professors spearhead advanced pedagogical and scientific inquiry within the domains of design automation and complex systems. Working in close synergy with them are our PhD Students, who drive empirical and theoretical innovation, alongside our distinguished Alumni, whose professional trajectories extend our institutional impact globally. Furthermore, our Administrative Clerks provide essential operational infrastructure, ensuring an optimized and cohesive environment for our entire academic collective."

// Short titles on purpose: they have to fit the small cards (e.g. "Assoc. Prof.", "Ext. Lecturer").
export const INVOLVED_PEOPLE = [
  { name: 'Gianvito Urgese', title: 'Assoc. Prof.' },
  { name: 'Alessandro Aliberti', title: 'Asst. Prof.' },
  { name: 'Lorenzo Bottaccioli', title: 'Assoc. Prof.' },
  { name: 'Daniele Jahier Pagliari', title: 'Assoc. Prof.' },
  { name: 'Edoardo Patti', title: 'Assoc. Prof.' },
  { name: 'Enrico Macii', title: 'Full Prof.' },
  { name: 'Alessio Burrello', title: 'Asst. Prof.' },
  { name: 'Luca Barbierato', title: 'Asst. Prof.' },
  { name: 'Santa Di Cataldo', title: 'Assoc. Prof.' },
  { name: 'Sara Vinco', title: 'Assoc. Prof.' },
  { name: 'Giuseppe Fanuli', title: 'Ext. Lecturer' }, // external teacher
  { name: 'Alberto Bocca', title: 'PhD Student' },
]
