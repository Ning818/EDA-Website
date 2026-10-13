import PageIntroBand from '../components/sections/PageIntroBand'
import ResearchTopicsAndPeople from '../components/sections/ResearchTopicsAndPeople'
import FeatureCard from '../components/sections/FeatureCard'
import { Navigate, useLocation, useParams } from 'react-router-dom'
import { themeBySlug } from '../themes'
import { RESEARCH_BY_THEME } from '../content/research'
import { INVOLVED_PEOPLE } from '../content/people'

// One Research page per theme: VLSI-CAD at /research, the others at /research/:theme. The text is in src/content/research.js,
// the header artwork is chosen by the theme's `header` in src/themes.js.
export default function Research() {
  const { theme: slug = 'vlsi-cad' } = useParams()
  // Preview switch while the two looks are compared: /research?hl=light makes the Thesis card light too.
  const thesisTone = new URLSearchParams(useLocation().search).get('hl') === 'light' ? 'light' : 'dark'
  const theme = themeBySlug(slug)
  if (!theme) return <Navigate to="/research" replace />
  const text = RESEARCH_BY_THEME[theme.slug]
  return (
    <main style={{ '--theme': theme.color }}>
      <PageIntroBand category="Research" title={theme.name} decorated light decorVariant={theme.header} decorColor={theme.color} decorPage="research">
        {text.intro}
      </PageIntroBand>

      <ResearchTopicsAndPeople topics={text.topics} people={INVOLVED_PEOPLE} />

      <FeatureCard
        tone={thesisTone}
        eyebrow="Highlight thesis"
        title={text.thesis.title}
        image={text.thesis.image}
        imageAlt={text.thesis.imageAlt}
        meta={text.thesis.meta}
        tags={text.thesis.tags}
        cta={text.thesis.cta}
        to="#"
        imageSide="left"
      >
        {text.thesis.body}
      </FeatureCard>

      <FeatureCard
        tone="light"
        eyebrow="Funded projects"
        title={text.fundedTeaser.title}
        image={text.fundedTeaser.image}
        imageAlt={text.fundedTeaser.imageAlt}
        stats
        cta={text.fundedTeaser.cta}
        to={theme.projects}
        button
        imageSide="right"
      >
        {text.fundedTeaser.body}
      </FeatureCard>

      <div className="h-10 md:h-14" />
    </main>
  )
}
