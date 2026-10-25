import { useEffect, useMemo, useState } from 'react'
import { ThemesContext, withWords } from './themesContext'
import { useApi } from './api/useApi'

// The themes' names and home-page paragraphs live in the database (GET /api/themes, backend/), so that the staff can change them; the nav bar, the page titles, the home page and
// the chapter dots all show these. They are needed on every page, before anything else is drawn, so the site never waits for them or breaks without them: until the answer is in,
// the words of the visitor's last visit stand in (kept in the browser, where it is allowed), and failing that the defaults written in themes.js.
const KEY = 'eda-themes'

const readKept = () => {
  try {
    const kept = JSON.parse(localStorage.getItem(KEY))
    return Array.isArray(kept) ? kept : null
  } catch {
    return null
  }
}

export function ThemesProvider({ children }) {
  const { status, data } = useApi('/api/themes')
  const [kept] = useState(readKept)

  useEffect(() => {
    if (status !== 'ok') return
    try {
      localStorage.setItem(KEY, JSON.stringify(data))
    } catch {
      /* the words are not kept */
    }
  }, [status, data])

  const themes = useMemo(() => withWords(status === 'ok' ? data : kept), [status, data, kept])
  return <ThemesContext.Provider value={themes}>{children}</ThemesContext.Provider>
}
