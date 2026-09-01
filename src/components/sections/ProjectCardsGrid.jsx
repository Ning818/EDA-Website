function ProjectCard({ code, description, status }) {
  return (
    <div className="flex w-[384px] flex-col gap-1 rounded-lg bg-[#fff4da] px-6 py-4 shadow-[2px_2px_4px_0px_rgba(0,0,0,0.2)]">
      <p className="font-heading text-2xl font-medium text-navy">{code}</p>
      <p className="font-body text-lg leading-6 text-navy">{description}</p>
      <p className="pt-2 font-body text-sm text-[#839794]">{status}</p>
    </div>
  )
}

export default function ProjectCardsGrid({ title, projects }) {
  return (
    <section className="mx-auto max-w-[1440px] px-8 lg:px-[120px]">
      <h2 className="border-b border-[rgba(0,40,75,0.15)] py-2 font-heading text-4xl font-bold text-navy">{title}</h2>
      <div className="flex flex-wrap justify-center gap-6 py-10">
        {projects.map((project, i) => (
          <ProjectCard key={i} {...project} />
        ))}
      </div>
    </section>
  )
}
