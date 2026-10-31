import { LINKEDIN_COPY, YOUTUBE_COPY } from './components/sections/socialCopyText'

// The two social media blocks of the home page as the code has them (components/sections/socialCopyText.js): the DEFAULTS the site shows until the API's (GET /api/site/social, the database,
// backend/) arrive, or when it cannot be reached. Where the blocks and the footer's icons are shown, it is the API's that count (SocialProvider.jsx, useSocial.js), so the staff can change the
// words and the addresses without a new version of the site.
export const SOCIAL_DEFAULTS = { youtube: YOUTUBE_COPY, linkedin: LINKEDIN_COPY }

const isBlock = (row) => row && ['label', 'text', 'cta', 'url'].every((key) => typeof row[key] === 'string' && row[key])

/** `{ youtube, linkedin }`, each a block of the API's answer if it has it whole, else the code's default for it (so a part the API lacks never leaves a hole). */
export function socialFrom(answer) {
  const rows = Array.isArray(answer) ? answer : []
  return Object.fromEntries(Object.entries(SOCIAL_DEFAULTS).map(([slug, fallback]) => [slug, isBlock(rows.find((row) => row?.slug === slug)) ? rows.find((row) => row.slug === slug) : fallback]))
}
