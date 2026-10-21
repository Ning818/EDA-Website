// The four research themes (the Home page's clouds) and the two pages each has: its Research page and its Funded Projects
// page. VLSI-CAD's pages sit at the original paths; the other three have placeholder copies of them (same content, own title).
// `short` (optional) is a shorter name for places where the full one is too long, e.g. the Home page's two links per theme.
// `header` is the artwork in the page headers: 'circuit' (VLSI-CAD's particle circuit), 'skyline-particles' (Smart City's
// city of flat particles; 'skyline' is the same city in thin lines), 'helix-particles' (Bioinformatics' DNA of flat particles; 'helix' is the same in thin lines), 'factory-particles' (Industry 4.0's smart factory of flat particles; 'factory' is the same in thin lines), or null - nothing, that area is left empty (no theme is in that state now). `color` is the theme's colour.
export const THEMES = [
  { slug: 'vlsi-cad', name: 'VLSI-CAD', research: '/research', projects: '/research/funded-projects', header: 'circuit', color: '#3fb0b8' },
  { slug: 'bioinformatics', name: 'Bioinformatics', research: '/research/bioinformatics', projects: '/research/funded-projects/bioinformatics', header: 'helix-particles', color: '#4ab47a' },
  { slug: 'smart-city', name: 'Smart City', research: '/research/smart-city', projects: '/research/funded-projects/smart-city', header: 'skyline-particles', color: '#2f86b3' },
  { slug: 'industry-4-0', name: 'Industry 4.0 and Smart Manufacturing', short: 'Industry 4.0', research: '/research/industry-4-0', projects: '/research/funded-projects/industry-4-0', header: 'factory-particles', color: '#6a6fc4' },
]

export const themeBySlug = (slug) => THEMES.find((t) => t.slug === slug)
export const themeByName = (name) => THEMES.find((t) => t.name === name)

/** The PageIntroBand `decorVariant` for a theme's page ('research' | 'projects'). */
export const decorVariantFor = (theme, page) => {
  if (theme.header === 'circuit') return page === 'research' ? 'research' : 'projects'
  return theme.header ?? 'none'
}
