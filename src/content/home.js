// Text of the home page: the hero paragraph and the paragraph beside each theme's particle cloud.
// (The clouds themselves, and the order they appear in, are set up in src/pages/Home.jsx and src/three/.)

export const HOME_HERO = {
  title: "EDA Group",
  text: "EDA (Electronic Design Automation) Group is an interdepartmental research group including researchers from the Department of Control and Computer Engineering (DAUIN) and the Interuniversity Department of Regional and Urban Studies and Planning (DIST) of Politecnico di Torino.",
}

/** The paragraph shown beside each theme's cloud, by theme name (the `name` in src/themes.js). */
export const HOME_THEME_COPY = {
  "VLSI-CAD": "Our group conducts research in Design Automation for standard digital CMOS circuits and Beyond-CMOS technologies. We develop computer-aided design algorithms, methodologies and prototype tools for low-power, variation-tolerant integrated circuits, with a focus on logical and physical synthesis. We also model and simulate Graphene-based devices to enable flexible, ultra-low-power circuits.",
  "Bioinformatics": "We apply our design-automation expertise to the life sciences, building computational tools that accelerate the analysis of large-scale biological and genomic data. By combining high-performance, energy-aware computing with machine learning, we help researchers turn complex biological data into reliable insights faster and at a lower energy cost.",
  "Smart City": "Our research supports the digital transformation of cities and energy systems. We build digital twins, co-simulation environments and data-driven models of cyber-physical infrastructures, from buildings and batteries to smart grids. These tools help planners and operators predict, optimize and manage urban resources in a more sustainable way.",
  "Industry 4.0": "We bring design automation and artificial intelligence to the factory floor. Our work covers digital twins, edge machine learning and co-simulation of cyber-physical production systems, enabling predictive maintenance, quality monitoring and flexible, efficient manufacturing across connected industrial processes.",
}
