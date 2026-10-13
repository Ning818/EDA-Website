import PageIntroBand from '../components/sections/PageIntroBand'
import GlobeParticles from '../components/sections/GlobeParticles'
import LogoGrid from '../components/sections/LogoGrid'

import { COLLABORATIONS_INTRO, UNIVERSITIES, INSTITUTES, COMPANIES } from '../content/collaborations'

export default function Collaborations() {
  return (
    // A light page, like Teaching: the site's mint ground with a faint dot grid and soft glows of teal (behind the globe) and blue (down the
    // left); the glows' layer reaches up 96px, behind the (translucent) nav bar, so they carry on into it - the dot grid does not. The header band has no background of its own, so the globe and the text sit straight on the page; the paragraph runs on as far as the
    // globe's left edge (the width follows the globe's size and position, GlobeParticles.jsx); the logos sit on plates.
    <main className="relative pb-6">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 -top-24 bg-[radial-gradient(ellipse_55%_40%_at_82%_calc(96px+(100%-96px)*0.1),rgba(63,176,184,0.16),transparent_70%),radial-gradient(ellipse_45%_30%_at_6%_calc(96px+(100%-96px)*0.42),rgba(47,134,179,0.10),transparent_70%)]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(0,40,67,0.10)_1px,transparent_1.3px)] bg-[length:24px_24px] [mask-image:linear-gradient(to_bottom,black_30%,transparent_92%)]" />

      <PageIntroBand category="EDA Group" title="Collaborations" light bandRule={false} bandBg="" backdrop={<GlobeParticles light />} textWidth="lg:max-w-[clamp(380px,min(max(calc(17vw+285px),calc(100vw-711px)),calc(50vw+9px)),900px)]">
        {COLLABORATIONS_INTRO}
      </PageIntroBand>

      <LogoGrid tone="light" title="Collaboration Universities" logos={UNIVERSITIES} />
      <LogoGrid tone="light" title="Collaboration Institutes" logos={INSTITUTES} />
      <LogoGrid tone="light" title="Collaboration Companies" logos={COMPANIES} />
    </main>
  )
}
