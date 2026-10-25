import PageIntroBand from '../components/sections/PageIntroBand'
import GlobeParticles from '../components/sections/GlobeParticles'
import LogoGrid from '../components/sections/LogoGrid'
import IntroFacts from '../components/sections/IntroFacts'
import JointProjects from '../components/sections/JointProjects'
import { LoadError, SectionSkeleton, TextSkeleton } from '../components/ui/LoadStatus'
import { apiUrl } from '../api/client'
import { useApi } from '../api/useApi'

// The logo cards of the three walls come from the API (GET /api/collaborations, backend/): each organisation's name, its own website - which the card links to (in a new tab); a
// company's address is the one of its Italian or English site, not its bare domain, which sends visitors on to the site of the country they are in (Intel's, for one, to its Chinese
// site) - and its logo's address. The joint projects are examples of projects with collaborators from the walls, from the projects' records on CORDIS (the EU's research information
// service): the project, its funding programme and years, who coordinated it, and its other partners that are among the collaborators (the record names Fraunhofer as the
// Fraunhofer-Gesellschaft, not its institute FIT).
const asLogo = ({ name, url, logo_url: logo }) => ({ src: apiUrl(logo), alt: name, url })

// A wall's list padded with empty slots to a whole number of rows of the desktop layout's five columns (the slots stay invisible; LogoGrid does not draw them below `lg`).
const COLUMNS = 5
const fillRow = (logos) => [...logos, ...Array((COLUMNS - (logos.length % COLUMNS)) % COLUMNS).fill(null)]

export default function Collaborations() {
  const { status, data, error, retry } = useApi('/api/collaborations')
  const ok = status === 'ok'
  // a dash in the place of each figure while the lists are on their way
  const count = (list) => (ok ? list.length : '–')

  return (
    // A light page, like Teaching: the site's mint ground with a faint dot grid and soft glows of teal (behind the globe) and blue (down the
    // left); the glows' layer reaches up 96px, behind the (translucent) nav bar, so they carry on into it - the dot grid does not. The header band has no background of its own, so the globe and the text sit straight on the page; the paragraph runs on as far as the
    // globe's left edge (the width follows the globe's size and position, GlobeParticles.jsx); the logos sit on plates.
    <main className="relative pb-6">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 -top-24 bg-[radial-gradient(ellipse_55%_40%_at_82%_calc(96px+(100%-96px)*0.1),rgba(63,176,184,0.16),transparent_70%),radial-gradient(ellipse_45%_30%_at_6%_calc(96px+(100%-96px)*0.42),rgba(47,134,179,0.10),transparent_70%)]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(0,40,67,0.10)_1px,transparent_1.3px)] bg-[length:24px_24px] [mask-image:linear-gradient(to_bottom,black_30%,transparent_92%)]" />

      <PageIntroBand category="EDA Group" title="Collaborations" light bandRule={false} bandBg="" backdrop={<GlobeParticles light />} textWidth="lg:max-w-[clamp(380px,min(max(calc(17vw+285px),calc(100vw-711px)),calc(50vw+9px)),900px)]"
        after={
          <IntroFacts
            items={[
              [count(data?.universities ?? []), 'Universities'],
              [count(data?.institutes ?? []), 'Institutes'],
              [count(data?.companies ?? []), 'Companies'],
            ]}
          />
        }
      >
        {ok ? data.intro : status === 'loading' ? <TextSkeleton lines={3} /> : 'The introduction of this page could not be loaded.'}
      </PageIntroBand>
      {/* what the loading does to the page, for a screen reader (nothing to see); a failure announces itself (LoadError) */}
      <p role="status" className="sr-only">
        {status === 'loading' && 'Loading the page...'}
      </p>

      {status === 'loading' && <SectionSkeleton />}
      {status === 'error' && (
        <section className="relative mx-auto max-w-[1440px] px-8 py-10 lg:px-[120px]">
          <LoadError what="this page" error={error} onRetry={retry} />
        </section>
      )}
      {ok && (
        <>
          <JointProjects title="Examples of Joint Projects" projects={data.joint_projects} />
          <LogoGrid tone="light" title="Collaboration Universities" logos={fillRow(data.universities.map(asLogo))} />
          <LogoGrid tone="light" title="Collaboration Institutes" logos={fillRow(data.institutes.map(asLogo))} />
          <LogoGrid tone="light" title="Collaboration Companies" logos={fillRow(data.companies.map(asLogo))} />
        </>
      )}
    </main>
  )
}
