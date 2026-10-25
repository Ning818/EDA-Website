import { useMemo } from 'react'
import { ThemesContext, withWords } from './themesContext'
import { useKeptApi } from './api/useKeptApi'

// The themes' names and home-page paragraphs live in the database (GET /api/themes, backend/), so that the staff can change them; the nav bar, the page titles, the home page and
// the chapter dots all show these. They are needed on every page, before anything else is drawn, so the site never waits for them or breaks without them: until the answer is in,
// the words of the visitor's last visit stand in (kept in the browser, where it is allowed, see useKeptApi.js), and failing that the defaults written in themes.js.
export function ThemesProvider({ children }) {
  const rows = useKeptApi('/api/themes', 'eda-themes')
  const themes = useMemo(() => withWords(Array.isArray(rows) ? rows : null), [rows])
  return <ThemesContext.Provider value={themes}>{children}</ThemesContext.Provider>
}
