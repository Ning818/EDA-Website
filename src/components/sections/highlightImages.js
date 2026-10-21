// The pictures of the Highlight cards (a paper on a Research page, a project on a Funded Projects page): one per theme, the art of the
// Funded Projects card tinted to the theme's colour. They are decorative - they do not show the paper or project itself.
const IMAGES = import.meta.glob('../../assets/images/highlights/*.jpg', { eager: true, import: 'default' })

/** `kind`: 'thesis' | 'project'; `slug`: a theme's slug (themes.js). */
export const highlightImage = (kind, slug) => IMAGES[`../../assets/images/highlights/${kind}-${slug}.jpg`]
