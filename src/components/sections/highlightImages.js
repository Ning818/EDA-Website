// The picture of the Highlight cards: a paper's card on a Research page (`thesis-<slug>.jpg`) and a project's card on a Funded Projects page
// (`project-<slug>.jpg`), one per theme, 4:3. Where there is none yet a neutral placeholder is shown.
import placeholder from '../../assets/images/highlights/placeholder.svg'

const IMAGES = import.meta.glob('../../assets/images/highlights/*.jpg', { eager: true, import: 'default' })

/** `kind`: 'thesis' | 'project'; `slug`: a theme's slug (themes.js). */
export const highlightImage = (kind, slug) => IMAGES[`../../assets/images/highlights/${kind}-${slug}.jpg`] ?? placeholder
