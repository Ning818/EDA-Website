const STATS = [
  { value: 5, label: 'ONGOING' },
  { value: 30, label: 'ENDED' },
  { value: 35, label: 'TOLTAL' },
]

export default function StatsRow() {
  return (
    <section className="bg-navy">
      <div className="mx-auto flex max-w-[1440px] gap-12 px-8 py-12 text-center lg:px-[120px]">
        {STATS.map((stat) => (
          <div key={stat.label} className="flex flex-col items-center">
            <p className="font-heading text-[32px] font-medium text-[#f5f4f6]">{stat.value}</p>
            <p className="font-body text-lg text-white">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
