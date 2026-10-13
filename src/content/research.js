// Text of the Research page (one set per research theme).
//
// The page shows: an introduction, the research topics, the people involved (see people.js) and two highlight cards
// (a thesis, and a teaser for the Funded Projects page). Every theme has its own entry in RESEARCH_BY_THEME; until a
// theme gets its own text it reuses the VLSI-CAD one (placeholder copies - see the TODOs below).

export const TOPICS = [
  'Low-power Design Techniques and Implementation Strategies',
  'Power Modeling, Estimation and Optimization',
  'Thermal-Aware and PV-tolerant Design Solutions',
  'Design Techniques for Mitigating Aging Effects',
  'Modeling and Estimation of Indirect Metrics: Temperature, Aging',
  'System-Level, Behavioral-Level and RTL Synthesis',
  'Layout-Driven Synthesis and Physical Design',
  'Logic Synthesis and Optimization',
  'Battery Modeling, Design and Management for Mobile Systems',
  'Cyber-Physical Energy Systems',
  'Electrical Modeling and Simulation of Graphene-based Devices',
  'Implementation Strategies of Graphene-based Flexible Circuits',
  'Ultra-low Power Solution for Graphene-based Flexible Circuits',
  'Logic Synthesis Algorithms for Graphene-based Flexible Circuits',
]

const VLSI_CAD = {
  intro:
    "The EDA group undertakes research and development in Design Automation for standard digital CMOS ICs, Beyond-CMOS circuits and Electrical Energy Systems. For standard CMOS, the main activities are computer-aided design (CAD) algorithms, methodologies and prototype tools for low-power, variation-tolerant integrated circuits, with particular emphasis on logical and physical synthesis. In Beyond-CMOS technologies, the focus is on Graphene-based devices: electrical modeling and circuit-level simulation of Graphene P-N junctions and Field-Effect Transistors, and the integration and optimization strategies that enable flexible circuits with ultra low-power features.",
  topics: TOPICS,
  // The "Highlight thesis" card.
  thesis: {
    title: "L2MU: a spiking Legendre Memory Unit",
    meta: "Leto, Urgese, Macii, Fra · 2025",
    tags: ["Neuromorphic computing", "State Space Models", "Spiking networks"],
    cta: "Discover more theses",
    body: "Redesigning the Legendre Memory Unit with Leaky Integrate-and-Fire neurons brings State Space Models to neuromorphic computing: the resulting L2MU outperforms recurrent spiking neural networks on event-based Braille letter reading.",
    image: new URL('../assets/images/thesis-highlight.png', import.meta.url).href,
    imageAlt: "Neuromorphic L2MU research visualization",
  },
  // The "Funded projects" teaser card (its numbers come from projects.js).
  fundedTeaser: {
    title: "The projects that fund our research",
    cta: "Explore all funded projects",
    body: "Featured: TRISTAN expands the European RISC-V ecosystem by tackling Electronic Design Automation challenges through open-source and industrial synergy.",
    image: new URL('../assets/images/funded-projects-highlight.png', import.meta.url).href,
    imageAlt: "TRISTAN project visualization",
  },
}

/** Research page text by theme slug (see src/themes.js for the slugs). */
export const RESEARCH_BY_THEME = {
  'vlsi-cad': VLSI_CAD,
  // TODO(content): write the real text of the other three themes; for now they show the VLSI-CAD text.
  bioinformatics: VLSI_CAD,
  'smart-city': VLSI_CAD,
  'industry-4-0': VLSI_CAD,
}
