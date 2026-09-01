const TOPICS = [
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

const PEOPLE = [
  { name: 'Gianvito Urgese', title: 'Assoc. Prof.' },
  { name: 'Alessandro Aliberti', title: 'Asst. Prof.' },
  { name: 'Lorenzo Bottaccioli', title: 'Assoc. Prof.' },
  { name: 'Daniele Jahier Pagliari', title: 'Assoc. Prof.' },
  { name: 'Edoardo Patti', title: 'Assoc. Prof.' },
  { name: 'Enrico Macii', title: 'Full Prof.' },
  { name: 'Francesco Ponzio', title: 'Asst. Prof.' },
  { name: 'Gianvito Urgese', title: 'Assoc. Prof.' },
  { name: 'Alessio Burrello', title: 'Asst. Prof.' },
  { name: 'Luca Barbierato', title: 'Asst. Prof.' },
  { name: 'Santa Di Cataldo', title: 'Assoc. Prof.' },
  { name: 'Sara Vinco', title: 'Assoc. Prof.' },
  { name: 'Giuseppe Fanuli', title: 'Ph.D. Candidate' },
  { name: 'Alberto Bocca', title: 'Ph.D. Candidate' },
]

export default function ResearchTopicsAndPeople() {
  return (
    <section className="mx-auto max-w-[1440px] px-8 py-10 lg:px-[120px]">
      <div className="flex flex-col gap-10 lg:flex-row">
        <div className="flex-1">
          <h2 className="border-b border-[rgba(0,40,75,0.15)] py-2 font-heading text-4xl font-bold text-navy">Research Topics</h2>
          <ul>
            {TOPICS.map((topic) => (
              <li key={topic} className="border-b border-[rgba(182,176,156,0.5)] py-2 font-heading text-xl text-navy">
                {topic}
              </li>
            ))}
          </ul>
        </div>

        <div className="w-full lg:w-[352px] lg:shrink-0">
          <h2 className="py-2 font-heading text-[32px] font-bold text-navy">Involved people</h2>
          <div className="flex flex-wrap justify-between gap-x-4 gap-y-4">
            {PEOPLE.map((person, i) => (
              <div key={`${person.name}-${i}`} className="flex w-[168px] flex-col gap-1 rounded-lg bg-[#f3eac0] px-3 py-4">
                <p className="font-body text-lg font-bold leading-normal text-navy">{person.name}</p>
                <p className="font-body text-base text-[#839794]">{person.title}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
