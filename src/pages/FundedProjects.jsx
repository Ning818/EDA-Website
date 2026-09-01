import PageIntroBand from '../components/sections/PageIntroBand'
import StatsRow from '../components/sections/StatsRow'
import ProjectCardsGrid from '../components/sections/ProjectCardsGrid'
import FundedProjectsListSection from '../components/sections/FundedProjectsListSection'
import HighlightBand from '../components/sections/HighlightBand'
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

export default function FundedProjects() {
  return (
    <main>
      <PageIntroBand category="Funded Projects" title="VLSI-CAD" />
      <StatsRow />

      <ProjectCardsGrid title="Ongoing Projects" projects={ONGOING_PROJECTS} />

      <HighlightBand
        title="Hightlight Project"
        image={projectImage}
        imageAlt="TRISTAN project visualization"
        ctaLabel="Discover More Thesis"
        ctaTo="#"
        imageSide="left"
        dark
      >
        The TRISTAN project aims to expand the European RISC-V ecosystem by tackling Electronic Design Automation
        (EDA) challenges through open-source and industrial synergy. This paper presents an overview of TRISTAN's EDA
        flow and methodologies, highlighting tools that streamline the early design phases of RISC-V systems.
      </HighlightBand>

      <FundedProjectsListSection title="Ended Projects" items={ENDED_PROJECTS} splitAt={6} />
    </main>
  )
}
