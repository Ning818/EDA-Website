function ProfessorCard({ photo, name, title }) {
  return (
    <div className="flex w-[282px] flex-col overflow-hidden rounded-lg bg-white shadow-sm">
      <img src={photo} alt={name} className="h-[203px] w-full object-cover" />
      <div className="flex flex-col gap-1 p-4">
        <p className="font-heading text-lg font-bold text-navy">{name}</p>
        <p className="font-body text-base text-[#839794]">{title}</p>
      </div>
    </div>
  )
}

export default function ProfessorGrid({ professors }) {
  return (
    <div className="flex flex-1 flex-wrap justify-center gap-6 p-6 lg:justify-start">
      {professors.map((p, i) => (
        <ProfessorCard key={i} {...p} />
      ))}
    </div>
  )
}
