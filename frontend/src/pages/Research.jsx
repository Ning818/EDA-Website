import PageIntroBand from '../components/sections/PageIntroBand'
import ResearchTopicsAndPeople from '../components/sections/ResearchTopicsAndPeople'
import FeatureCard from '../components/sections/FeatureCard'
import ProjectWall from '../components/sections/ProjectWall'
import { LoadError, SectionSkeleton, TextSkeleton } from '../components/ui/LoadStatus'
import { useLocation, useParams } from 'react-router-dom'
import NotFound from './NotFound'
import { themeBySlug, decorVariantFor } from '../themes'
import { highlightImage } from '../components/sections/highlightImages'
import { useApi } from '../api/useApi'
import { useTheme } from '../useThemes'

// One Research page per theme: VLSI-CAD at /research, the others at /research/:theme. The theme's look (its colour, the artwork in the header) is in the code (themes.js);
// its words - the paragraph under the title, the research areas with their topics and people, the highlight paper, the line about its funded projects - come from the API
// (GET /api/themes/<slug>, backend/), so the page shows placeholders while they are on their way and a message with a "Try again" button if they cannot be fetched.
function ResearchPage({ slug }) {
  const theme = useTheme(slug) // the theme's name is the API's (ThemesProvider.jsx); its colour, artwork and addresses are the code's
  // Preview switch while the two looks are compared: /research?hl=light makes the paper card light too.
  const thesisTone = new URLSearchParams(useLocation().search).get('hl') === 'light' ? 'light' : 'dark'
  const { status, data, error, retry } = useApi(`/api/themes/${slug}`)
  const paper = data?.highlight_paper
  return (
    <main style={{ '--theme': theme.color }}>
      <PageIntroBand category="Research" title={theme.name} decorated light decorVariant={decorVariantFor(theme, 'research')} decorColor={theme.color} decorPage="research" titleFit introVeil={slug === 'vlsi-cad'}>
        {status === 'ok' ? data.intro : status === 'loading' ? <TextSkeleton /> : 'The introduction of this page could not be loaded.'}
      </PageIntroBand>
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
      {status === 'ok' && (
        <>
          <ResearchTopicsAndPeople groups={data.topic_groups} />

          {paper && (
            <FeatureCard
              tone={thesisTone}
              eyebrow="Highlight paper"
              title={paper.title}
              image={highlightImage(paper.image_url)}
              imageAlt={paper.image_alt ?? `Illustration for the paper "${paper.title}"`}
              meta={[
                <>
                  <span className="max-md:hidden">{paper.authors_full}</span>
                  <span className="md:hidden">{paper.authors_short}</span>
                </>,
                paper.venue,
              ]}
              tags={paper.tags}
              cta="Read the paper on IRIS"
              to={paper.url}
              imageSide="left"
            >
              {paper.text}
            </FeatureCard>
          )}

          <FeatureCard
            tone="light"
            eyebrow="Funded projects"
            title="The projects that fund our research"
            visual={<ProjectWall theme={slug} projects={data.projects} />}
            stats={data.stats}
            cta="Explore all funded projects"
            to={theme.projects}
            button
            imageSide="right"
          >
            {data.funded_blurb}
          </FeatureCard>

          <div className="h-10 md:h-14" />
        </>
      )}
    </main>
  )
}

export default function Research() {
  const { theme: slug = 'vlsi-cad' } = useParams()
  const theme = themeBySlug(slug)
  return theme ? <ResearchPage slug={slug} /> : <NotFound what="theme" />
}
