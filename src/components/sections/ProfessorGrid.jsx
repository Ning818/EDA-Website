/**
 * Figma: hovering a professor card triggers Smart Animate (QUICK/spring easing, ~0.744s)
 * from the front state (photo + 79px name/title strip) to a "back" state where the info
 * panel expands to fill the full 282x282 card in dark navy, photo fades out, and the name
 * is shown in white.
 *
 * NOTE: the Figma "back" variant also includes a bio/contact-links paragraph, but that
 * content is a copy-paste placeholder — every professor's card shows the same person's
 * (Gianvito Urgese's) real LinkedIn/ORCID/Polito links. Shipping that verbatim would show
 * incorrect personal contact info for 10 of the 11 professors, so it's intentionally
 * omitted here pending real per-professor bio data.
 */
function ProfessorCard({ photo, name, title }) {
  return (
    <div className="group relative h-[282px] w-[282px] overflow-hidden rounded-lg bg-white shadow-sm">
      <img
        src={photo}
        alt={name}
        className="absolute inset-0 h-[203px] w-full object-cover transition-opacity duration-[744ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:opacity-0"
      />
      <div
        className="absolute inset-x-0 bottom-0 flex h-[79px] flex-col justify-center gap-1 bg-white p-4 transition-[height,background-color] duration-[744ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:h-full group-hover:bg-navy"
      >
        <p className="font-heading text-lg font-bold text-navy transition-colors duration-[744ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:text-white">
          {name}
        </p>
        <p className="font-body text-base text-[#839794] opacity-100 transition-opacity duration-200 group-hover:opacity-0">
          {title}
        </p>
      </div>
    </div>
  )
}

export default function ProfessorGrid({ professors }) {
  return (
    <div className="flex flex-1 flex-wrap justify-center gap-6 lg:justify-start">
      {professors.map((p, i) => (
        <ProfessorCard key={i} {...p} />
      ))}
    </div>
  )
}
