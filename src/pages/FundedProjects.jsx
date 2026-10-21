import { Navigate, useParams } from 'react-router-dom'
import PageIntroBand from '../components/sections/PageIntroBand'
import { themeBySlug, decorVariantFor } from '../themes'
import StatsRow from '../components/sections/StatsRow'
import ProjectCardsGrid from '../components/sections/ProjectCardsGrid'
import FundedProjectsListSection from '../components/sections/FundedProjectsListSection'
import ReferToSection from '../components/sections/ReferToSection'
import FeatureCard from '../components/sections/FeatureCard'
import { highlightImage } from '../components/sections/highlightImages'
import { fundedProjectsFor } from '../components/sections/fundedProjectsData'
import { projectStatsFor } from '../components/sections/projectStats'

// Both lists run alphabetically by project code (digits in order, case ignored); projects without a code come last, in the
// order they are listed (the sort is stable).
const byCode = (a, b) =>
  a.code && b.code ? a.code.localeCompare(b.code, 'en', { sensitivity: 'base', numeric: true }) : Boolean(b.code) - Boolean(a.code)

// The project in the "Highlight project" card of each theme's Funded Projects page: one from the theme's own list above, with the group's role
// as the European Commission's CORDIS record gives it. `title` is two lines (the project, then what it is); the text is condensed from the
// record's objective. `to` is the project's website where it still works, else its CORDIS record.
const HIGHLIGHT_PROJECT = {
  'vlsi-cad': {
    title: ['R3-PowerUP:', 'a 300mm pilot line for smart power'],
    tags: ['Smart power', 'Pilot line', 'ECSEL / Horizon 2020'],
    text: 'R3-PowerUP builds a new 300mm pilot line in Europe for smart power and power discrete technologies, strengthening the competitiveness of European industry while supporting energy efficiency and CO2 reduction. Politecnico di Torino is one of the project partners.',
    to: 'https://cordis.europa.eu/project/id/737417',
  },
  bioinformatics: {
    title: ['HBP:', 'the Human Brain Project'],
    tags: ['Human brain', 'Brain-inspired computing', 'European project'],
    text: 'The Human Brain Project uses information and communication technologies to advance the understanding of the human brain and its diseases, to develop new treatments and to build new computing technologies. Politecnico di Torino took part in the project.',
    to: 'https://www.humanbrainproject.eu/',
  },
  'smart-city': {
    title: ['DIMMER:', 'district-level energy modeling and management'],
    tags: ['District energy', 'Building information models', 'Real-time feedback'],
    text: 'Coordinated by Politecnico di Torino, DIMMER links building and district-level 3D models with real-time sensor data and user feedback, to give occupants live feedback on their energy use. It was validated in public and private buildings in Turin and Manchester.',
    to: 'https://cordis.europa.eu/project/id/609084',
  },
  'industry-4-0': {
    title: ['SERENA:', 'plug-and-play predictive maintenance'],
    tags: ['Predictive maintenance', 'Industrial IoT', 'Augmented reality'],
    text: 'SERENA combines a cloud-based plug-and-play data platform, IoT sensing, AI-based analytics and augmented reality support for remote predictive maintenance, with demonstrators in white goods, metrology and elevator production. Politecnico di Torino is one of the project partners.',
    to: 'https://www.serena-project.eu/',
  },
}

// One Funded Projects page per theme: VLSI-CAD at /research/funded-projects, the others at /research/funded-projects/:theme.
// Each lists the theme's own ongoing and ended projects (fundedProjectsData.js) and a highlight project of its own.
export default function FundedProjects() {
  const { theme: slug = 'vlsi-cad' } = useParams()
  const theme = themeBySlug(slug)
  if (!theme) return <Navigate to="/research/funded-projects" replace />
  const { ongoing: ongoingAsListed, ended: endedAsListed, referTo } = fundedProjectsFor(slug)
  const ongoing = [...ongoingAsListed].sort(byCode)
  const ended = [...endedAsListed].sort(byCode)
  const ongoingCards = ongoing.map((project) => ({ ...project, status: 'Ongoing' }))
  return (
    <main style={{ '--theme': theme.color }}>
      <PageIntroBand category="Funded Projects" title={theme.name} decorated light decorVariant={decorVariantFor(theme, 'projects')} decorColor={theme.color} decorPage="projects" after={<StatsRow counts={projectStatsFor(slug)} light />} />

      <ProjectCardsGrid title="Ongoing Projects" projects={ongoingCards} />

      <FeatureCard
        tone="dark"
        eyebrow="Highlight project"
        title={
          <>
            {HIGHLIGHT_PROJECT[slug].title[0]}
            <br />
            {HIGHLIGHT_PROJECT[slug].title[1]}
          </>
        }
        image={highlightImage('project', slug)}
        imageAlt={`Illustration for the project ${HIGHLIGHT_PROJECT[slug].title[0].replace(':', '')}`}
        tags={HIGHLIGHT_PROJECT[slug].tags}
        cta="Discover this project"
        to={HIGHLIGHT_PROJECT[slug].to}
        imageSide="left"
      >
        {HIGHLIGHT_PROJECT[slug].text}
      </FeatureCard>

      {ended.length > 0 && <FundedProjectsListSection title="Ended Projects" items={ended} />}

      <ReferToSection people={referTo} tight={ended.length > 0} />
    </main>
  )
}
