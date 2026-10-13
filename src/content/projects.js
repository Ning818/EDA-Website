// Text and numbers of the Funded Projects page (one set per research theme, like research.js).
//
// The numbers also appear on the Research page's Funded Projects card.

// TODO(content): the real counts and lists. The ended-projects list below is one placeholder row repeated; the page
// header counts (ONGOING_COUNT / ENDED_COUNT) are written by hand and are not derived from the lists.
export const ONGOING_COUNT = 5
export const ENDED_COUNT = 30
export const TOTAL_COUNT = ONGOING_COUNT + ENDED_COUNT

// An ongoing project: code, description and "<funding source> · <state>" (e.g. "EU Funded · Active").
const ONGOING_PLACEHOLDER = {
  code: "R2POWER300",
  description: "PREPARING R2 EXTENSIONS TO 300mm FOR BCD SMART POWER",
  status: "EU Funded · Active",
}
// An ended project: code and description.
const ENDED_PLACEHOLDER = { code: "Funded Projects code", description: "Description" }

const VLSI_CAD = {
  ongoing: Array.from({ length: 5 }, () => ONGOING_PLACEHOLDER),
  ended: Array.from({ length: 16 }, () => ENDED_PLACEHOLDER),
  // Where the ended list is cut into its two columns (6 left, 10 right in the design).
  endedSplitAt: 6,
  // The "Highlight project" card.
  highlight: {
    title: ["TRISTAN:", "open-source EDA for RISC-V"],
    tags: ["RISC-V", "Open-source EDA", "European project"],
    cta: "Discover this project",
    body: "TRISTAN expands the European RISC-V ecosystem by tackling Electronic Design Automation challenges through open-source and industrial synergy, with an EDA flow that streamlines the early design phases of RISC-V systems.",
    image: new URL('../assets/images/project-highlight.png', import.meta.url).href,
    imageAlt: "TRISTAN project visualization",
  },
}

/** Funded Projects page content by theme slug. */
export const PROJECTS_BY_THEME = {
  'vlsi-cad': VLSI_CAD,
  // TODO(content): real projects of the other themes; for now they show the VLSI-CAD ones.
  bioinformatics: VLSI_CAD,
  'smart-city': VLSI_CAD,
  'industry-4-0': VLSI_CAD,
}
