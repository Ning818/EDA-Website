import { createContext } from 'react'
import { SOCIAL_DEFAULTS } from './social'

// The social media blocks as the pages see them: the API's (SocialProvider.jsx), or the code's defaults (social.js) where there is none.
export const SocialContext = createContext(SOCIAL_DEFAULTS)
