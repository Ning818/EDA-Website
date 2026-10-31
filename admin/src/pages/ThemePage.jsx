import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import FlashNotice from '../components/FlashNotice'
import { LinkButton, Loading, LoadError, Notice, PageHeading } from '../components/ui'
import { useLoad } from '../useLoad'

const WHAT = { paper: 'Highlight paper', project: 'Highlight project' }

function Highlight({ slug, kind, card }) {
  return (
    <section aria-labelledby={`card-${kind}`} className="card stack">
      <h2 id={`card-${kind}`}>{WHAT[kind]}</h2>
      {card ? (
        <p>
          <strong>{card.title}</strong> {card.subtitle}
        </p>
      ) : (
        <p className="muted">There is no {kind} card yet.</p>
      )}
      <div>
        <LinkButton to={`/themes/${slug}/highlights/${kind}`}>
          {card ? 'Change' : 'Write'} the {kind} card
        </LinkButton>
      </div>
    </section>
  )
}

/** One theme: what each part of its page says now, and where to change it. */
export default function ThemePage() {
  const { slug } = useParams()
  const { status, data: theme, error, reload } = useLoad(() => api.get(`/api/admin/themes/${slug}`), [slug])

  if (status === 'loading') {
    return (
      <div className="page">
        <PageHeading title="Theme">Theme</PageHeading>
        <Loading>Loading the theme…</Loading>
      </div>
    )
  }
  if (status === 'error') {
    return (
      <div className="page page-narrow">
        <PageHeading title="Theme not found">{error.status === 404 ? 'Theme not found' : error.status === 403 ? 'You do not have access to this theme' : 'Could not load this theme'}</PageHeading>
        {error.status === 404 || error.status === 403 ? <Link to="/themes">Back to the theme pages</Link> : <LoadError error={error} onRetry={reload} />}
      </div>
    )
  }

  return (
    <div className="page">
      <Link to="/themes" className="back-link">
        Back to the theme pages
      </Link>
      <PageHeading title={theme.name}>{theme.name}</PageHeading>
      <FlashNotice />
      {theme.on_site === false && (
        <Notice kind="info" title="This theme is not on the website yet">
          <p>You can write all of it now. Visitors cannot read any of it until the developer puts the theme on the website, so there is no hurry and nothing half written is seen.</p>
        </Notice>
      )}

      <section aria-labelledby="words-heading" className="card stack">
        <h2 id="words-heading">Words</h2>
        <dl className="stack" style={{ margin: 0 }}>
          <div>
            <dt className="meta">Name</dt>
            <dd style={{ margin: 0 }}>
              {theme.name}
              {theme.short_name ? <span className="muted"> (short: {theme.short_name})</span> : null}
            </dd>
          </div>
          <div>
            <dt className="meta">Paragraph on the home page</dt>
            <dd style={{ margin: 0 }}>{theme.home_summary ?? <span className="muted">None; the site shows the text it has built in.</span>}</dd>
          </div>
          <div>
            <dt className="meta">Introduction of the Research page</dt>
            <dd style={{ margin: 0 }}>{theme.intro}</dd>
          </div>
        </dl>
        <div>
          <LinkButton to={`/themes/${slug}/words`}>Change the words</LinkButton>
        </div>
      </section>

      <section aria-labelledby="areas-heading" className="card stack">
        <h2 id="areas-heading">Research areas</h2>
        {theme.areas.length === 0 ? (
          <p className="muted">There are no research areas.</p>
        ) : (
          <ol className="plain-list people-list">
            {theme.areas.map((area) => (
              <li key={area.id}>
                <Link to={`/themes/${slug}/areas/${area.id}`}>
                  <span className="person-name">{area.title}</span>
                  <span className="muted">
                    {area.topics.length} {area.topics.length === 1 ? 'topic' : 'topics'}, {area.people.length} {area.people.length === 1 ? 'person' : 'people'}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
        <div>
          <LinkButton to={`/themes/${slug}/areas`}>Add, order or change the research areas</LinkButton>
        </div>
      </section>

      <section aria-labelledby="contacts-heading" className="card stack">
        <h2 id="contacts-heading">Contacts ("Refer to")</h2>
        {theme.contacts.length === 0 ? (
          <p className="muted">There are no contacts, so the Refer to section is not on the page.</p>
        ) : (
          <ul>
            {theme.contacts.map((person) => (
              <li key={person.slug}>
                {person.name} <span className="muted">{person.title}</span>
              </li>
            ))}
          </ul>
        )}
        <div>
          <LinkButton to={`/themes/${slug}/contacts`}>Change the contacts</LinkButton>
        </div>
      </section>

      <Highlight slug={slug} kind="paper" card={theme.highlight_paper} />
      <Highlight slug={slug} kind="project" card={theme.highlight_project} />
    </div>
  )
}
