import { Navigate, useParams } from 'react-router-dom'
import PageIntroBand from '../components/sections/PageIntroBand'
import { themeBySlug, decorVariantFor } from '../themes'
import StatsRow from '../components/sections/StatsRow'
import ProjectCardsGrid from '../components/sections/ProjectCardsGrid'
import FundedProjectsListSection from '../components/sections/FundedProjectsListSection'
import FeatureCard from '../components/sections/FeatureCard'
import projectImage from '../assets/images/project-highlight.png'

// The Figma source currently repeats this single placeholder card/list-item
// across all slots — reproduced faithfully rather than inventing real data.
const PROJECT = {
  code: 'R2POWER300',
  description: 'PREPARING R2 EXTENSIONS TO 300mm FOR BCD SMART POWER',
  status: 'EU Funded · Active',
}
const ONGOING_PROJECTS = Array.from({ length: 5 }, () => PROJECT)

const LIST_ITEM = { code: 'Funded Projects code', description: 'Description' }
const ENDED_PROJECTS = Array.from({ length: 16 }, () => LIST_ITEM)

// One Funded Projects page per theme: VLSI-CAD at /research/funded-projects, the others at /research/funded-projects/:theme
// (placeholder copies of it for now).
export default function FundedProjects() {
  const { theme: slug = 'vlsi-cad' } = useParams()
  const theme = themeBySlug(slug)
  if (!theme) return <Navigate to="/research/funded-projects" replace />
  return (
    <main>
      <PageIntroBand category="Funded Projects" title={theme.name} decorated light decorVariant={decorVariantFor(theme, 'projects')} decorColor={theme.color} decorPage="projects" after={<StatsRow light />} />

      <ProjectCardsGrid title="Ongoing Projects" projects={ONGOING_PROJECTS} />

      <FeatureCard
        tone="dark"
        eyebrow="Highlight project"
        title={
          <>
            TRISTAN:
            <br />
            open-source EDA for RISC-V
          </>
        }
        image={projectImage}
        imageAlt="TRISTAN project visualization"
        tags={['RISC-V', 'Open-source EDA', 'European project']}
        cta="Discover this project"
        to="#"
        imageSide="left"
      >
        TRISTAN expands the European RISC-V ecosystem by tackling Electronic Design Automation challenges through
        open-source and industrial synergy, with an EDA flow that streamlines the early design phases of RISC-V
        systems.
      </FeatureCard>

      <FundedProjectsListSection title="Ended Projects" items={ENDED_PROJECTS} splitAt={6} />
    </main>
  )
}
