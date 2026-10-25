// What the group lists on each theme's Research page: its research topics (the group's own wording and order within a group), arranged in a few groups, and under each
// group the people whose own work lies in it. A person's role is the same wherever they appear, so it is kept once (peopleRoles.js).
//
// DRAFT, to be confirmed by the theme leads: the groups and the placing of people are ours, not the group's. A person is placed in a group where the keywords on their
// polito.it staff page, or (for students and former members, who have no keywords there) the titles of their publications on IRIS, point to the same subject; a person
// from the group's earlier flat list for a theme whom nothing placed (Cipolletta, Mocerino, Grimaldi under VLSI-CAD; Enrico Macii under Bioinformatics) is left off the page.
import PersonCard from './PersonCard'
import PersonChip from './PersonChip'
import { byRank } from './peopleRoles'

const CONTENT = {
  'vlsi-cad': {
    groups: [
      {
        title: 'Low-power, variation-tolerant and aging-aware design',
        topics: [
          'Low-power Design Techniques and Implementation Strategies',
          'Power Modeling, Estimation and Optimization',
          'Thermal-Aware and PV-tolerant Design Solutions',
          'Design Techniques for Mitigating Aging Effects',
          'Modeling and Estimation of Indirect Metrics: Temperature, Aging',
        ],
        people: ['Andrea Calimera', 'Massimo Poncino', 'Alberto Macii', 'Enrico Macii', 'Daniele Jahier Pagliari', 'Valentino Peluso', 'Roberto Giorgio Rizzo', 'Alberto Bocca'],
      },
      {
        title: 'Synthesis and physical design',
        topics: ['System-Level, Behavioral-Level and RTL Synthesis', 'Layout-Driven Synthesis and Physical Design', 'Logic Synthesis and Optimization'],
        people: ['Andrea Calimera', 'Massimo Poncino', 'Sara Vinco', 'Daniele Jahier Pagliari', 'Chen Xie', 'Roberto Giorgio Rizzo'],
      },
      {
        title: 'Electrical energy systems',
        topics: ['Battery Modeling, Design and Management for Mobile Systems', 'Cyber-Physical Energy Systems'],
        people: ['Alberto Macii', 'Massimo Poncino', 'Sara Vinco', 'Alberto Bocca', 'Yukai Chen'],
      },
      {
        title: 'Beyond-CMOS: graphene-based flexible circuits',
        topics: [
          'Electrical Modeling and Simulation of Graphene-based Devices',
          'Implementation Strategies of Graphene-based Flexible Circuits',
          'Ultra-low Power Solution for Graphene-based Flexible Circuits',
          'Logic Synthesis Algorithms for Graphene-based Flexible Circuits',
        ],
        people: ['Andrea Calimera', 'Massimo Poncino', 'Enrico Macii'],
      },
    ],
  },
  bioinformatics: {
    groups: [
      {
        title: 'Gene expression, regulatory networks and modeling',
        topics: [
          'High-throughput data mining for biomedical applications, classification and clustering',
          'Algorithms for clinical functional genomics and gene expression analysis',
          'Biological systems modeling',
          'Reconstruction and analysis of regulatory gene and biochemical networks',
          'Temporal modeling of gene pathways activity',
          'Biological text mining',
          'Algorithms for molecular dynamics applications',
        ],
        people: ['Marta Lovino'],
      },
      {
        title: 'Sequencing data analysis',
        topics: [
          'Gene Fusions Detection and Prioritization',
          'BCR and TCR clonality assessment',
          'miRNAs and isoforms detection and quantification',
          'Design and optimization of Sequence Alignment Algorithms',
        ],
        people: ['Marta Lovino', 'Gianvito Urgese'],
      },
      {
        title: 'Image analysis and pattern recognition',
        topics: [
          'Biological and molecular image analysis',
          'Image processing applied to quantitative immunohistochemistry and fluorescence microscopy imaging',
          'Design of image processing techniques for medical images (US, PET and MRI)',
          'Artificial intelligence and pattern recognition techniques',
        ],
        people: ['Santa Di Cataldo', 'Francesco Ponzio', 'Marta Lovino'],
      },
      {
        title: 'Hardware acceleration and neuromorphic computing',
        topics: ['Design of HW accelerators for bioinformatics algorithms', 'Neuromorphic computing'],
        people: ['Gianvito Urgese', 'Evelina Forno'],
      },
    ],
  },
  'smart-city': {
    groups: [
      {
        title: 'Internet of Things and pervasive computing',
        topics: [
          'Internet of Things',
          'Ubiquitous Computing',
          'Pervasive Computing',
          'Ambient Intelligence',
          'Wireless Sensor and Actuator Network for environment monitoring and control',
        ],
        people: ['Edoardo Patti', 'Luca Barbierato', 'Enrico Macii', 'Davide Cannizzaro', 'Matteo Orlando'],
      },
      {
        title: 'Middleware and distributed software',
        topics: [
          'Middleware for enabling the interoperability across heterogeneous data-sources (HW and SW)',
          'Distributed software architectures for Ambient Intelligence',
        ],
        people: ['Edoardo Patti', 'Luca Barbierato'],
      },
      {
        title: 'Energy demand response and visualization',
        topics: ['Software solutions for simulating and optimizing energy demand response', 'Interactive visualization of energy information'],
        people: ['Alberto Macii', 'Enrico Macii', 'Edoardo Patti', 'Lorenzo Bottaccioli', 'Luca Barbierato', 'Alessandro Aliberti', 'Marco Massano', 'Matteo Orlando'],
      },
    ],
  },
  'industry-4-0': {
    groups: [
      {
        title: 'IoT, sensor networks and cyber-physical systems',
        topics: ['Internet of Things', 'Ubiquitous Computing', 'Pervasive Computing', 'Wireless Sensor and Actuator Networks for Industry 4.0', 'Cyber-Physical Energy Systems'],
        people: ['Edoardo Patti', 'Enrico Macii', 'Davide Cannizzaro', 'Lorenzo Bottaccioli', 'Marco Massano'],
      },
      {
        title: 'Middleware and distributed software',
        topics: ['Middleware for enabling the interoperability across heterogeneous data-sources (HW and SW)', 'Distributed software architectures for Industry 4.0'],
        people: ['Edoardo Patti', 'Davide Cannizzaro'],
      },
      {
        title: 'Additive manufacturing and process analytics',
        topics: ['Software Solutions for Additive Manufacturing', 'Data Analytics for processes optimization', 'Interactive visualization of production processes'],
        people: ['Santa Di Cataldo', 'Edoardo Patti', 'Davide Cannizzaro', 'Massimo Poncino', 'Enrico Macii'],
      },
    ],
  },
}

export default function ResearchTopicsAndPeople({ theme = 'vlsi-cad' }) {
  const { groups } = CONTENT[theme] ?? CONTENT['vlsi-cad']
  return (
    <section className="mx-auto max-w-[1440px] px-8 py-10 lg:px-[120px]">
      <h2 className="py-2 type-h2 text-navy">Research Topics</h2>
      {groups.map(({ title, topics, people }) => (
        // From `xl` a group is two columns, the people in the last 37% of the width: the title and the topics on the left, "Involved people" and the people on the right, both starting at
        // the top of the group - so when the title takes two lines "Involved people" stands level with its first line. Below that everything is one column: title, topics,
        // "Involved people", then its people.
        <div key={title} className="py-8 xl:grid xl:grid-cols-[minmax(0,1fr)_37%] xl:gap-x-10">
          <div className="xl:min-w-0">
            <h3 className="border-b border-[rgba(182,176,156,0.5)] pb-2 type-h3 text-navy">{title}</h3>
            {/* numbered from 1 in every group (the number is drawn, not the list's own, which the list style would take away); it makes a topic's row a little fuller */}
            <ol>
              {topics.map((topic, i) => (
                <li key={topic} className="flex gap-4 border-b border-[rgba(182,176,156,0.5)] py-2 type-body text-navy">
                  <span aria-hidden="true" className="w-6 shrink-0 tabular-nums text-teal-text">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span>{topic}</span>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h4 className="pb-3 pt-6 type-h3 text-navy xl:pb-4 xl:pt-0">Involved people</h4>
            {/* a group's people: on a phone as cards, two to a row across the width (PersonCard); from `md` up as two-line tags (PersonChip: the name, the role under it), only as wide as
                their names and as high as their own two lines, wrapping along the row (`items-start` keeps a tag from being stretched to the height of its row) */}
            <div className="grid grid-cols-2 gap-4 md:hidden">
              {byRank(people).map((name) => (
                <PersonCard key={name} name={name} />
              ))}
            </div>
            <div className="hidden flex-wrap content-start items-start gap-3 md:flex">
              {byRank(people).map((name) => (
                <PersonChip key={name} name={name} />
              ))}
            </div>
          </div>
        </div>
      ))}
    </section>
  )
}
