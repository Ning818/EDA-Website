// The four research themes (the Home page's clouds) and the two pages each has: its Research page and its Funded Projects
// page. VLSI-CAD's pages sit at /research and /research/funded-projects; the other themes' are under their own slug.
// `short` (optional) is a shorter name for places where the full one is too long, e.g. the Home page's two links per theme.
// `header` is the artwork in the page headers: 'circuit' (VLSI-CAD's particle circuit), 'skyline-particles' (Smart City's
// city of flat particles; 'skyline' is the same city in thin lines), 'helix-particles' (Bioinformatics' DNA of flat particles; 'helix' is the same in thin lines), 'factory-particles' (Industry 4.0's smart factory of flat particles; 'factory' is the same in thin lines), or null - nothing, that area is left empty (no theme is in that state now). `color` is the theme's colour.
// `name`, `short` and `homeSummary` are the DEFAULTS: the words the site shows until the API's (the theme's name, short name and home-page paragraph, backend/) arrive, or when
// it cannot be reached. Everywhere a theme's name is written (the nav bar, the page titles, the home page, the chapter dots) it is the API's that is shown (ThemesProvider.jsx,
// useThemes.js); the colour, the artwork and the addresses stay here - they are the theme's look, which the code draws.
export const THEMES = [
  { slug: 'vlsi-cad', name: 'VLSI-CAD', research: '/research', projects: '/research/funded-projects', header: 'circuit', color: '#3fb0b8', homeSummary: 'The EDA group works on Design Automation for standard digital CMOS circuits, Beyond-CMOS technologies and Electrical Energy Systems. We develop CAD algorithms and prototype tools for low-power, variation-tolerant integrated circuits, model Graphene-based devices for flexible, ultra-low-power circuits, and build simulation and run-time charge and thermal management for hybrid-source energy systems.' },
  { slug: 'bioinformatics', name: 'Bioinformatics', research: '/research/bioinformatics', projects: '/research/funded-projects/bioinformatics', header: 'helix-particles', color: '#4ab47a', homeSummary: 'With long-term experience in bioinformatics, the EDA group designs software and hardware-software solutions to manage, analyze and interpret complex biological and medical data. Our work spans gene expression and regulatory networks, sequencing data, medical image analysis, GPU and FPGA acceleration and neuromorphic computing, with hospitals and research centers.' },
  { slug: 'smart-city', name: 'Smart City', research: '/research/smart-city', projects: '/research/funded-projects/smart-city', header: 'skyline-particles', color: '#2f86b3', homeSummary: 'ICT is key to optimizing energy use in the Smart City, and that is where our software solutions come in. We research distributed software and middleware that make energy, environmental and user-feedback data interoperable, visual web interfaces giving real-time feedback on energy impact, and building information models linked to real-time data.' },
  { slug: 'industry-4-0', name: 'Industry 4.0 and Smart Manufacturing', short: 'Industry 4.0', research: '/research/industry-4-0', projects: '/research/funded-projects/industry-4-0', header: 'factory-particles', color: '#6a6fc4', homeSummary: 'In the fourth industrial revolution, connected products and massive IoT and Big Data usage demand a new technology infrastructure. The EDA group applies its expertise in IoT, cyber-physical systems, wireless sensor networks and machine learning to make manufacturing more efficient, responsive to demand and optimized across supply chains.' },
]

export const themeBySlug = (slug) => THEMES.find((t) => t.slug === slug)
export const themeByName = (name) => THEMES.find((t) => t.name === name)

/** The PageIntroBand `decorVariant` for a theme's page ('research' | 'projects'). */
export const decorVariantFor = (theme, page) => {
  if (theme.header === 'circuit') return page === 'research' ? 'research' : 'projects'
  return theme.header ?? 'none'
}
