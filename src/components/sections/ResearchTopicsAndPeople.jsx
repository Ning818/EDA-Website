// What the group lists on each theme's Research page: the research topics and the people involved (names in the order the group's
// own page gives them). A person's role is the same wherever they appear, so it is kept once (peopleRoles.js).
import PersonCard from './PersonCard'

const CONTENT = {
  'vlsi-cad': {
    topics: [
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
    ],
    people: [
      'Alberto Bocca',
      'Alberto Macii',
      'Andrea Calimera',
      'Antonio Cipolletta',
      'Chen Xie',
      'Daniele Jahier Pagliari',
      'Enrico Macii',
      'Luca Mocerino',
      'Massimo Poncino',
      'Matteo Grimaldi',
      'Roberto Giorgio Rizzo',
      'Sara Vinco',
      'Valentino Peluso',
      'Yukai Chen',
    ],
  },
  bioinformatics: {
    topics: [
      'High-throughput data mining for biomedical applications, classification and clustering',
      'Algorithms for clinical functional genomics and gene expression analysis',
      'Biological and molecular image analysis',
      'Image processing applied to quantitative immunohistochemistry and fluorescence microscopy imaging',
      'Design of image processing techniques for medical images (US, PET and MRI)',
      'Biological systems modeling',
      'Artificial intelligence and pattern recognition techniques',
      'Reconstruction and analysis of regulatory gene and biochemical networks',
      'Temporal modeling of gene pathways activity',
      'Biological text mining',
      'Algorithms for molecular dynamics applications',
      'Gene Fusions Detection and Prioritization',
      'BCR and TCR clonality assessment',
      'miRNAs and isoforms detection and quantification',
      'Design and optimization of Sequence Alignment Algorithms',
      'Design of HW accelerators for bioinformatics algorithms',
      'Neuromorphic computing',
    ],
    people: ['Enrico Macii', 'Evelina Forno', 'Francesco Ponzio', 'Gianvito Urgese', 'Marta Lovino', 'Santa Di Cataldo'],
  },
  'smart-city': {
    topics: [
      'Internet of Things',
      'Ubiquitous Computing',
      'Pervasive Computing',
      'Ambient Intelligence',
      'Wireless Sensor and Actuator Network for environment monitoring and control',
      'Middleware for enabling the interoperability across heterogeneous data-sources (HW and SW)',
      'Distributed software architectures for Ambient Intelligence',
      'Software solutions for simulating and optimizing energy demand response',
      'Interactive visualization of energy information',
    ],
    people: [
      'Alberto Macii',
      'Alessandro Aliberti',
      'Davide Cannizzaro',
      'Edoardo Patti',
      'Enrico Macii',
      'Lorenzo Bottaccioli',
      'Luca Barbierato',
      'Marco Massano',
      'Matteo Orlando',
    ],
  },
  'industry-4-0': {
    topics: [
      'Internet of Things',
      'Ubiquitous Computing',
      'Pervasive Computing',
      'Wireless Sensor and Actuator Networks for Industry 4.0',
      'Cyber-Physical Energy Systems',
      'Middleware for enabling the interoperability across heterogeneous data-sources (HW and SW)',
      'Distributed software architectures for Industry 4.0',
      'Software Solutions for Additive Manufacturing',
      'Data Analytics for processes optimization',
      'Interactive visualization of production processes',
    ],
    people: ['Davide Cannizzaro', 'Edoardo Patti', 'Enrico Macii', 'Lorenzo Bottaccioli', 'Marco Massano', 'Massimo Poncino', 'Santa Di Cataldo'],
  },
}


export default function ResearchTopicsAndPeople({ theme = 'vlsi-cad' }) {
  const { topics, people } = CONTENT[theme] ?? CONTENT['vlsi-cad']
  return (
    <section className="mx-auto max-w-[1440px] px-8 py-10 lg:px-[120px]">
      <div className="flex flex-col gap-10 lg:flex-row">
        <div className="flex-1">
          <h2 className="border-b border-[rgba(0,40,75,0.15)] py-2 type-h2 text-navy">Research Topics</h2>
          <ul>
            {topics.map((topic) => (
              <li key={topic} className="border-b border-[rgba(182,176,156,0.5)] py-2 type-body text-navy">
                {topic}
              </li>
            ))}
          </ul>
        </div>

        <div className="w-full lg:w-[352px] lg:shrink-0">
          <h2 className="pb-4 pt-2 type-h2 text-navy">Involved people</h2>
          {/* always two cards to a row on a phone, as many as fit from `md` up (cards are at least 150px wide); in the 352px desktop column, two of 168px */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-[repeat(auto-fill,minmax(150px,1fr))]">
            {people.map((name) => (
              <PersonCard key={name} name={name} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
