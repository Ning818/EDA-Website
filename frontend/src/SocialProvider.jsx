import { useMemo } from 'react'
import { SocialContext } from './socialContext'
import { socialFrom } from './social'
import { useKeptApi } from './api/useKeptApi'

// The words of the home page's social media blocks, and where their buttons and the footer's icons lead, live in the database (GET /api/site/social, backend/). The footer is on every page
// and the blocks are the home page's: neither may wait or break, so until the answer is in, the visitor's last one stands in (kept in the browser), and failing that the defaults written in social.js.
export function SocialProvider({ children }) {
  const answer = useKeptApi('/api/site/social', 'eda-social')
  const social = useMemo(() => socialFrom(answer), [answer])
  return <SocialContext.Provider value={social}>{children}</SocialContext.Provider>
}
