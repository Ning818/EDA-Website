import { useState } from 'react'
import PageIntroBand from '../components/sections/PageIntroBand'
import TeachingSidebar from '../components/sections/TeachingSidebar'
import NetworkParticles from '../components/sections/NetworkParticles'
import ProfessorGrid from '../components/sections/ProfessorGrid'

import { TEACHING_GROUPS, TEACHING_INTRO } from '../content/people'

export default function Teaching() {
  const [active, setActive] = useState(TEACHING_GROUPS[0].label)
  const people = (TEACHING_GROUPS.find((g) => g.label === active) ?? TEACHING_GROUPS[0]).people

  return (
    // A light page: the site's mint ground with a faint dot grid and a soft teal glow behind the sidebar. The header band has no background
    // of its own, so it flows into the content (no hairline under it). Behind everything is a
    // network of particles whose nodes sit on the dots of this grid (NetworkParticles, a canvas as big as the page, scrolling with it); the paragraph runs the full
    // width over it, the white sidebar and cards cover it.
    <main className="relative pb-6">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(0,40,67,0.10)_1px,transparent_1.3px)] bg-[length:24px_24px] [mask-image:linear-gradient(to_bottom,black_94%,transparent)]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_14%_52%,rgba(63,176,184,0.12),transparent)]" />
      <NetworkParticles />
      <PageIntroBand category="EDA Group" title="Teaching" light bandRule={false} titleVeil bandBg="" backdrop={null}>
        {TEACHING_INTRO}
      </PageIntroBand>

      <div className="relative mx-auto flex max-w-[1440px] flex-col gap-6 px-8 pt-4 lg:flex-row lg:gap-8 lg:px-[120px]">
        <TeachingSidebar groups={TEACHING_GROUPS} active={active} onSelect={setActive} />
        <ProfessorGrid professors={people} />
      </div>
    </main>
  )
}
