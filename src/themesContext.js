import { createContext } from 'react'
import { THEMES } from './themes'

// The themes as the pages see them: the code's templates (themes.js: colour, artwork, addresses) with the API's words over them (ThemesProvider.jsx). Before the provider has
// anything, or where there is none, it is the templates' own defaults.
export const ThemesContext = createContext(THEMES)

// The templates (themes.js) with the API's name, short name and paragraph over them where it has the theme. A theme the API lists that the code has no template for is not shown:
// the code decides which themes the site can draw.
export const withWords = (rows) =>
  THEMES.map((template) => {
    const row = rows?.find((r) => r.slug === template.slug)
    if (!row) return template
    return { ...template, name: row.name, short: row.short_name ?? undefined, homeSummary: row.home_summary || template.homeSummary }
  })
