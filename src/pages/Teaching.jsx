import { useSearchParams } from 'react-router-dom'
import CanvasBoundary from '../components/ui/CanvasBoundary'
import PageIntroBand from '../components/sections/PageIntroBand'
import TeachingSidebar from '../components/sections/TeachingSidebar'
import NetworkParticles from '../components/sections/NetworkParticles'
import ProfessorGrid from '../components/sections/ProfessorGrid'
import { LoadError, TextSkeleton } from '../components/ui/LoadStatus'
import { PEOPLE_AREA, PeopleEmpty, PeopleSkeleton } from '../components/sections/PeopleStatus'
import { apiUrl } from '../api/client'
import { useApi } from '../api/useApi'

// The three groups, each with an address of its own - /people?group=<slug> (Professors, the first, is plain /people) - so the group a visitor is looking at
// survives a refresh, the back button and a shared link. An unknown ?group= shows Professors. Who is in a group comes from the API (GET /api/people, backend/):
// the people of the group's title, in the order of the group's own People page - for the PhD students & research fellows, the research fellows first.
const GROUPS = [
  { slug: 'professors', name: 'Professors', to: '/people' },
  { slug: 'phd-students', name: 'Research Fellows & PhD Students', to: '/people?group=phd-students' },
  { slug: 'alumni', name: 'Alumni', to: '/people?group=alumni' },
]

// A person of the API as a card of the grid wants them: the photo's address in full, and the links by kind (polito, orcid, linkedin, dept, iris).
const asCard = ({ slug, name, title, photo_url, links }) => ({ slug, name, title, photo: apiUrl(photo_url), links })

export default function Teaching() {
  const [params] = useSearchParams()
  const { slug, name } = GROUPS.find((group) => group.slug === params.get('group')) ?? GROUPS[0]
  // everybody in one request: the three groups are a few dozen people, and picking another group then needs no waiting
  const { status, data, error, retry } = useApi('/api/people')
  // the paragraph under the title (GET /api/pages/people): a placeholder while it is on its way
  const intro = useApi('/api/pages/people')
  const people = (data ?? []).filter((person) => person.group === slug).map(asCard)

  return (
    // A light page: the site's mint ground with a faint dot grid and a soft teal glow behind the sidebar. The header band has no background
    // of its own, so it flows into the content (no hairline under it). Behind everything is a
    // network of particles whose nodes sit on the dots of this grid (NetworkParticles, a canvas as big as the page, scrolling with it); the paragraph runs the full
    // width over it, the white sidebar and cards cover it.
    <main className="relative pb-6">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(0,40,67,0.10)_1px,transparent_1.3px)] bg-[length:24px_24px] [mask-image:linear-gradient(to_bottom,black_94%,transparent)]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_14%_52%,rgba(63,176,184,0.12),transparent)]" />
      <CanvasBoundary>
        <NetworkParticles />
      </CanvasBoundary>
      <PageIntroBand category="EDA Group" title="People" light bandRule={false} titleVeil bandBg="" backdrop={null}>
        {intro.status === 'ok' ? intro.data.intro : intro.status === 'loading' ? <TextSkeleton lines={3} /> : 'The introduction of this page could not be loaded.'}
      </PageIntroBand>

      <div className="relative mx-auto flex max-w-[1440px] flex-col gap-6 px-8 pt-4 lg:flex-row lg:gap-8 lg:px-[120px]">
        <TeachingSidebar items={GROUPS} active={slug} />
        {/* what the change of group - or the loading - does to the list, for a screen reader (nothing to see); a failure announces itself (LoadError) */}
        <p role="status" className="sr-only">
          {status === 'loading' && 'Loading people...'}
          {status === 'ok' && `Showing ${name}: ${people.length} ${people.length === 1 ? 'person' : 'people'}`}
        </p>
        {status === 'loading' && <PeopleSkeleton />}
        {status === 'error' && <LoadError what="the people" error={error} onRetry={retry} className={PEOPLE_AREA} />}
        {status === 'ok' && (people.length > 0 ? <ProfessorGrid professors={people} /> : <PeopleEmpty />)}
      </div>
    </main>
  )
}
