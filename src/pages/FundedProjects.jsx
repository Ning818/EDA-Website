import { useParams } from 'react-router-dom'
import NotFound from './NotFound'
import PageIntroBand from '../components/sections/PageIntroBand'
import { themeBySlug, decorVariantFor } from '../themes'
import StatsRow from '../components/sections/StatsRow'
import ProjectCardsGrid from '../components/sections/ProjectCardsGrid'
import FundedProjectsListSection from '../components/sections/FundedProjectsListSection'
import ReferToSection from '../components/sections/ReferToSection'
import FeatureCard from '../components/sections/FeatureCard'
import { LoadError, SectionSkeleton } from '../components/ui/LoadStatus'
import { highlightImage } from '../components/sections/highlightImages'
import { useApi } from '../api/useApi'
import { useTheme } from '../useThemes'

// Both lists run alphabetically by project code (digits in order, case ignored); projects without a code come last, in the
// order they are listed (the sort is stable).
const byCode = (a, b) =>
  a.code && b.code ? a.code.localeCompare(b.code, 'en', { sensitivity: 'base', numeric: true }) : Boolean(b.code) - Boolean(a.code)

// One Funded Projects page per theme: VLSI-CAD at /research/funded-projects, the others at /research/funded-projects/:theme.
// Each lists the theme's own ongoing and ended projects and a highlight project of its own. The theme's look is in the code (themes.js); everything it says - the numbers, the projects, the
// highlight project, the people to refer to - comes from the API (GET /api/themes/<slug>, backend/), so the page shows placeholders while it is on its way and a message with
// a "Try again" button if it cannot be fetched.
function FundedProjectsPage({ slug }) {
  const theme = useTheme(slug) // the theme's name is the API's (ThemesProvider.jsx); its colour, artwork and addresses are the code's
  const { status, data, error, retry } = useApi(`/api/themes/${slug}`)
  const ok = status === 'ok'
  const ongoing = ok ? [...data.projects.ongoing].sort(byCode).map((project) => ({ ...project, status: 'Ongoing' })) : []
  const ended = ok ? [...data.projects.ended].sort(byCode) : []
  const highlight = data?.highlight_project
  return (
    <main style={{ '--theme': theme.color }}>
      <PageIntroBand category="Funded Projects" title={theme.name} decorated light decorVariant={decorVariantFor(theme, 'projects')} decorColor={theme.color} decorPage="projects" after={<StatsRow counts={ok ? data.stats : null} light />} />
      {/* what the loading does to the page, for a screen reader (nothing to see); a failure announces itself (LoadError) */}
      <p role="status" className="sr-only">
        {status === 'loading' && 'Loading the page...'}
      </p>

      {status === 'loading' && <SectionSkeleton />}
      {status === 'error' && (
        <section className="mx-auto max-w-[1440px] px-8 py-10 lg:px-[120px]">
          <LoadError what="this page" error={error} onRetry={retry} />
        </section>
      )}
      {ok && (
        <>
          <ProjectCardsGrid title="Ongoing Projects" projects={ongoing} />

          {highlight && (
            <FeatureCard
              tone="dark"
              eyebrow="Highlight project"
              title={
                <>
                  {highlight.title}
                  <br />
                  {highlight.subtitle}
                </>
              }
              image={highlightImage(highlight.image_url)}
              imageAlt={`Illustration for the project ${highlight.title.replace(':', '')}`}
              tags={highlight.tags}
              cta="Discover this project"
              to={highlight.url}
              imageSide="left"
            >
              {highlight.text}
            </FeatureCard>
          )}

          {ended.length > 0 && <FundedProjectsListSection title="Ended Projects" items={ended} />}

          <ReferToSection people={data.refer_to} tight={ended.length > 0} />
        </>
      )}
    </main>
  )
}

export default function FundedProjects() {
  const { theme: slug = 'vlsi-cad' } = useParams()
  const theme = themeBySlug(slug)
  return theme ? <FundedProjectsPage slug={slug} /> : <NotFound what="theme" />
}
