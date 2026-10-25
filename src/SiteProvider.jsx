import { useMemo } from 'react'
import { SiteContext } from './siteContext'
import { siteFrom } from './site'
import { useKeptApi } from './api/useKeptApi'

// The footer's phone and fax numbers live in the database (GET /api/site, backend/). The footer is on every page and must never wait or break: until the answer is in, the visitor's
// last one stands in (kept in the browser), and failing that the defaults written in site.js.
export function SiteProvider({ children }) {
  const answer = useKeptApi('/api/site', 'eda-site')
  const site = useMemo(() => siteFrom(answer), [answer])
  return <SiteContext.Provider value={site}>{children}</SiteContext.Provider>
}
