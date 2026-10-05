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
  { name: 'Alessio Burrello', title: 'Asst. Prof.' },
  { name: 'Luca Barbierato', title: 'Asst. Prof.' },
  { name: 'Santa Di Cataldo', title: 'Assoc. Prof.' },
  { name: 'Sara Vinco', title: 'Assoc. Prof.' },
  { name: 'Giuseppe Fanuli', title: 'PhD Student' },
  { name: 'Alberto Bocca', title: 'PhD Student' },
]

export default function ResearchTopicsAndPeople() {
  return (
    <section className="mx-auto max-w-[1440px] px-8 py-10 lg:px-[120px]">
      <div className="flex flex-col gap-10 lg:flex-row">
        <div className="flex-1">
          <h2 className="border-b border-[rgba(0,40,75,0.15)] py-2 font-heading text-2xl font-bold text-navy md:text-4xl">Research Topics</h2>
          <ul>
            {TOPICS.map((topic) => (
              <li key={topic} className="border-b border-[rgba(182,176,156,0.5)] py-2 font-heading text-base text-navy md:text-xl">
                {topic}
              </li>
            ))}
          </ul>
        </div>

        <div className="w-full lg:w-[352px] lg:shrink-0">
          <h2 className="py-2 font-heading text-2xl font-bold text-navy md:text-[32px]">Involved people</h2>
          <div className="flex flex-wrap justify-between gap-x-4 gap-y-4">
            {PEOPLE.map((person, i) => (
              // Name at the top (up to two lines), role pinned to the bottom as a small all-caps line with a teal dot, so the
              // role sits at the same height on every card whether the name takes one line or two.
              <div key={`${person.name}-${i}`} className="flex min-h-[84px] w-[168px] flex-col justify-between gap-2 rounded-2xl border border-navy/15 bg-white px-4 py-3 transition-[border-color] duration-300 ease-out hover:border-[#279aae]">
                <p className="font-heading text-sm font-semibold leading-snug text-navy md:text-[15px]">{person.name}</p>
                <p className="inline-flex items-center gap-1.5 font-body text-[11px] uppercase tracking-[0.06em] text-[#839794] md:text-xs">
                  <span className="size-1.5 shrink-0 rounded-full bg-[#279aae]" />
                  {person.title}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
