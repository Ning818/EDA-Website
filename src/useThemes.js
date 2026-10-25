import { useContext } from 'react'
import { ThemesContext } from './themesContext'

/** The themes, in the site's order, with their names and home-page paragraphs from the API (see ThemesProvider.jsx). */
export const useThemes = () => useContext(ThemesContext)

/** One theme by its slug, or undefined where the site has no such theme. */
export const useTheme = (slug) => useThemes().find((theme) => theme.slug === slug)
