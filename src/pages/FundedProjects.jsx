import { Navigate, useParams } from 'react-router-dom'
import PageIntroBand from '../components/sections/PageIntroBand'
import { themeBySlug } from '../themes'
import StatsRow from '../components/sections/StatsRow'
import ProjectCardsGrid from '../components/sections/ProjectCardsGrid'
import FundedProjectsListSection from '../components/sections/FundedProjectsListSection'
import FeatureCard from '../components/sections/FeatureCard'
import { PROJECTS_BY_THEME } from '../content/projects'

// One Funded Projects page per theme: VLSI-CAD at /research/funded-projects, the others at /research/funded-projects/:theme.
// The projects and the highlight text are in src/content/projects.js.
export default function FundedProjects() {
  const { theme: slug = 'vlsi-cad' } = useParams()
  const theme = themeBySlug(slug)
  if (!theme) return <Navigate to="/research/funded-projects" replace />
  const data = PROJECTS_BY_THEME[theme.slug]
  const { highlight } = data
  return (
    <main style={{ '--theme': theme.color }}>
      <PageIntroBand category="Funded Projects" title={theme.name} decorated light decorVariant={theme.header} decorColor={theme.color} decorPage="projects" after={<StatsRow light />} />

      <ProjectCardsGrid title="Ongoing Projects" projects={data.ongoing} />

      <FeatureCard
        tone="dark"
        eyebrow="Highlight project"
        title={highlight.title.map((line, i) => (
          <span key={line}>
            {i > 0 && <br />}
            {line}
          </span>
        ))}
        image={highlight.image}
        imageAlt={highlight.imageAlt}
        tags={highlight.tags}
        cta={highlight.cta}
        to="#"
        imageSide="left"
      >
        {highlight.body}
      </FeatureCard>

      <FundedProjectsListSection title="Ended Projects" items={data.ended} splitAt={data.endedSplitAt} />
    </main>
  )
}
