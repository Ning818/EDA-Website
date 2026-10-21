import PageIntroBand from '../components/sections/PageIntroBand'
import ResearchTopicsAndPeople from '../components/sections/ResearchTopicsAndPeople'
import FeatureCard from '../components/sections/FeatureCard'
import { Navigate, useLocation, useParams } from 'react-router-dom'
import { themeBySlug, decorVariantFor } from '../themes'
import { projectStatsFor } from '../components/sections/projectStats'
import { highlightImage } from '../components/sections/highlightImages'
import fundedProjectsImage from '../assets/images/funded-projects-highlight.png'

// The paragraph under each theme's page title (the Home page has its own, shorter summary of each theme). Kept to about 9 lines
// in the header's text column on a desktop screen.
const INTRO = {
  'vlsi-cad':
    'Our Design Automation work spans three areas. For standard CMOS, we develop CAD algorithms, methodologies and prototype tools for low-power, variation-tolerant ICs, focusing on logic and physical synthesis. In Beyond-CMOS, we model Graphene P-N junctions and transistors, and study integration strategies for flexible, ultra-low-power circuits. For Electrical Energy Systems with hybrid sources such as batteries and solar cells, we build system-level simulation frameworks and run-time charge and thermal management.',
  bioinformatics:
    'Our research automates the management, analysis and interpretation of complex biological and medical data through software and hardware-software solutions. Activities include gene expression data mining to find molecular targets for personalized therapies, regulatory network reconstruction, sequencing analysis to spot genetic abnormalities, image processing and pattern recognition, GPU and FPGA acceleration, and neuromorphic computing. We work closely with biologists, doctors and statisticians, and with hospitals.',
  'smart-city':
    'Pervasive devices deliver real-time data on environmental conditions and energy consumption, and middleware can make heterogeneous hardware and software sources interoperable, with an abstract view of their functionalities. Building on this, we develop a distributed software infrastructure that unifies energy, environmental and user-feedback data, presents it through visual web interfaces so users see the energy impact of their behavior in real time, and links building information models with live data.',
  'industry-4-0':
    'Smart optimization of every step of a manufacturing process, from concept generation to production and product transaction, matters more and more, in traditional processes and new ones such as 3D printing and additive manufacturing. Our expertise in IoT technologies, cyber-physical systems, wireless sensor networks and machine learning supports innovative solutions for more efficient manufacturing of new products, dynamic response to product demand and real-time optimization of production and supply-chain networks.',
}

// The line in the Funded projects card, about the theme's own projects (their names are on its Funded Projects page).
const FUNDED_BLURB = {
  'vlsi-cad':
    'Ongoing projects include R2POWER300 and R3POWERUP, which work on 300mm technology for smart power and power discretes, and Lab4MEMS II, on micro-optical MEMS, micro-mirrors and pico-projectors.',
  bioinformatics:
    'Our funded work reaches from the Human Brain Project and devices for neurocontrol and neurorehabilitation (DeNeCor) to personalized diagnosis and novel therapeutic targets for acute lymphoblastic leukemia.',
  'smart-city':
    'Ongoing projects include EEB, on zero-energy buildings in smart urban districts, and ITS, an intelligent transportation system, while past ones covered smart metering, district energy modelling and middleware for public spaces.',
  'industry-4-0':
    'Our funded projects cover additive manufacturing (STAMP, MANUELA), shopfloor operation management (DISLOMAN), predictive maintenance with remote diagnostics and factory monitoring (SERENA) and metrology (MADEin4).',
}

// The paper in the "Highlight paper" card of each theme's Research page - from the group's own publications in IRIS (iris.polito.it);
// `to` is its IRIS record. The text is condensed from the paper's abstract there. `meta`: [the authors in full, the authors by initials (on a phone)], then the journal and year. The Smart City paper has eleven
// authors, so it uses initials everywhere.
const HIGHLIGHT_PAPER = {
  'vlsi-cad': {
    title: 'Design Techniques and Architectures for Low-Leakage SRAMs',
    meta: [['Andrea Calimera, Alberto Macii, Enrico Macii, Massimo Poncino', 'A. Calimera, A. Macii, E. Macii, M. Poncino'], 'IEEE Transactions on Circuits and Systems I · 2012'],
    tags: ['Low-power design', 'Leakage power', 'SRAM'],
    text: 'In high-performance systems-on-chip, leakage power now rivals dynamic power, and memories suffer the most. This survey reviews the academic and industrial techniques that minimize subthreshold leakage in SRAMs, from the cell level to architectures for system-level design.',
    to: 'https://iris.polito.it/handle/11583/2498516',
  },
  bioinformatics: {
    title: 'Automated segmentation of tissue images for computerized IHC analysis',
    meta: [['Santa Di Cataldo, Elisa Ficarra, Andrea Acquaviva, Enrico Macii', 'S. Di Cataldo, E. Ficarra, A. Acquaviva, E. Macii'], 'Computer Methods and Programs in Biomedicine · 2010'],
    tags: ['Image processing', 'Immunohistochemistry', 'Cancer tissue'],
    text: 'Two automated methods segment immunohistochemical tissue images: one recognizes the cancerous areas by unsupervised color clustering, the other the nuclear membranes of the cancer cells. Both prove more effective than approaches based on supervised learning or active contours.',
    to: 'https://iris.polito.it/handle/11583/2307078',
  },
  'smart-city': {
    title: 'IoT software infrastructure for Energy Management and Simulation in Smart Cities',
    meta: [['F. G. Brundu, E. Patti, A. Osello, M. Del Giudice, N. Rapetti, A. Krylovskiy, M. Jahn, V. Verda, E. Guelpa, L. Rietto, A. Acquaviva', 'F. G. Brundu, E. Patti, A. Osello, M. Del Giudice, N. Rapetti, A. Krylovskiy, M. Jahn, V. Verda, E. Guelpa, L. Rietto, A. Acquaviva'], 'IEEE Transactions on Industrial Informatics · 2017'],
    tags: ['Internet of Things', 'Smart city', 'Middleware', 'Energy saving'],
    text: 'An IoT platform correlates near-real-time building energy profiles with sensor data and with building and grid models, to simulate new energy policies at district level. Deployed in a real district, it was used to develop and test a new control policy for the heating network.',
    to: 'https://iris.polito.it/handle/11583/2655428',
  },
  'industry-4-0': {
    title: 'Optimizing Quality Inspection and Control in Powder Bed Metal Additive Manufacturing: Challenges and Research Directions',
    meta: [['Santa Di Cataldo, Sara Vinco, Gianvito Urgese, Flaviana Calignano, Elisa Ficarra, Alberto Macii, Enrico Macii', 'S. Di Cataldo, S. Vinco, G. Urgese, F. Calignano, E. Ficarra, A. Macii, E. Macii'], 'Proceedings of the IEEE · 2021'],
    tags: ['Additive manufacturing', 'In situ monitoring', 'Machine learning'],
    text: 'Additive manufacturing struggles to repeat its quality in mass production. This review covers the in situ sensing and machine-learning approaches that monitor and control metal powder bed fusion in real time, and sets out the open challenges and research directions.',
    to: 'https://iris.polito.it/handle/11583/2870072',
  },
}

// One Research page per theme: VLSI-CAD at /research, the others at /research/:theme.
export default function Research() {
  const { theme: slug = 'vlsi-cad' } = useParams()
  // Preview switch while the two looks are compared: /research?hl=light makes the paper card light too.
  const thesisTone = new URLSearchParams(useLocation().search).get('hl') === 'light' ? 'light' : 'dark'
  const theme = themeBySlug(slug)
  if (!theme) return <Navigate to="/research" replace />
  return (
    <main style={{ '--theme': theme.color }}>
      <PageIntroBand category="Research" title={theme.name} decorated light decorVariant={decorVariantFor(theme, 'research')} decorColor={theme.color} decorPage="research" titleFit introVeil={slug === 'vlsi-cad'}>
        {INTRO[slug]}
      </PageIntroBand>

      <ResearchTopicsAndPeople theme={slug} />

      <FeatureCard
        tone={thesisTone}
        eyebrow="Highlight paper"
        title={HIGHLIGHT_PAPER[slug].title}
        image={highlightImage('thesis', slug)}
        imageAlt={`Illustration for the paper "${HIGHLIGHT_PAPER[slug].title}"`}
        meta={[
          <>
            <span className="max-md:hidden">{HIGHLIGHT_PAPER[slug].meta[0][0]}</span>
            <span className="md:hidden">{HIGHLIGHT_PAPER[slug].meta[0][1]}</span>
          </>,
          HIGHLIGHT_PAPER[slug].meta[1],
        ]}
        tags={HIGHLIGHT_PAPER[slug].tags}
        cta="Read the paper on IRIS"
        to={HIGHLIGHT_PAPER[slug].to}
        imageSide="left"
      >
        {HIGHLIGHT_PAPER[slug].text}
      </FeatureCard>

      <FeatureCard
        tone="light"
        eyebrow="Funded projects"
        title="The projects that fund our research"
        image={fundedProjectsImage}
        imageAlt="TRISTAN project visualization"
        stats={projectStatsFor(slug)}
        cta="Explore all funded projects"
        to={theme.projects}
        button
        imageSide="right"
      >
        {FUNDED_BLURB[slug]}
      </FeatureCard>

      <div className="h-10 md:h-14" />
    </main>
  )
}
