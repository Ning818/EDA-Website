import { useContext } from 'react'
import { SocialContext } from './socialContext'

/** The home page's social media blocks, `{ youtube, linkedin }`, each `{ label, text, cta, url }` (see SocialProvider.jsx). */
export const useSocial = () => useContext(SocialContext)
