import { useContext } from 'react'
import { SiteContext } from './siteContext'

/** The footer's numbers: `{ phone, phone_dial, fax }`, each possibly null (see SiteProvider.jsx). */
export const useSite = () => useContext(SiteContext)
