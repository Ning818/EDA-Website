import { createContext } from 'react'
import { SITE_DEFAULTS } from './site'

// The footer's phone and fax numbers as the pages see them: the API's (SiteProvider.jsx), or the code's defaults (site.js) where there is none.
export const SiteContext = createContext(SITE_DEFAULTS)
