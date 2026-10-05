import PageIntroBand from '../components/sections/PageIntroBand'
import ResearchTopicsAndPeople from '../components/sections/ResearchTopicsAndPeople'
import FeatureCard from '../components/sections/FeatureCard'
import { Navigate, useLocation, useParams } from 'react-router-dom'
import { themeBySlug, decorVariantFor } from '../themes'
import thesisImage from '../assets/images/thesis-highlight.png'
import fundedProjectsImage from '../assets/images/funded-projects-highlight.png'

// One Research page per theme: VLSI-CAD at /research, the others at /research/:theme (placeholder copies of it for now).
export default function Research() {
  const { theme: slug = 'vlsi-cad' } = useParams()
  // Preview switch while the two looks are compared: /research?hl=light makes the Thesis card light too.
  const thesisTone = new URLSearchParams(useLocation().search).get('hl') === 'light' ? 'light' : 'dark'
  const theme = themeBySlug(slug)
  if (!theme) return <Navigate to="/research" replace />
  return (
    <main>
      <PageIntroBand category="Research" title={theme.name} decorated light decorVariant={decorVariantFor(theme, 'research')} decorColor={theme.color} decorPage="research">
        The EDA group undertakes research and development in Design Automation for standard digital CMOS ICs,
        Beyond-CMOS circuits and Electrical Energy Systems. For standard CMOS, the main activities are computer-aided
        design (CAD) algorithms, methodologies and prototype tools for low-power, variation-tolerant integrated
        circuits, with particular emphasis on logical and physical synthesis. In Beyond-CMOS technologies, the focus
        is on Graphene-based devices: electrical modeling and circuit-level simulation of Graphene P-N junctions and
        Field-Effect Transistors, and the integration and optimization strategies that enable flexible circuits with
        ultra low-power features.
      </PageIntroBand>

      <ResearchTopicsAndPeople />

      <FeatureCard
        tone={thesisTone}
        eyebrow="Highlight thesis"
        title="L2MU: a spiking Legendre Memory Unit"
        image={thesisImage}
        imageAlt="Neuromorphic L2MU research visualization"
        meta="Leto, Urgese, Macii, Fra · 2025"
        tags={['Neuromorphic computing', 'State Space Models', 'Spiking networks']}
        cta="Discover more theses"
        to="#"
        imageSide="left"
      >
        Redesigning the Legendre Memory Unit with Leaky Integrate-and-Fire neurons brings State Space Models to
        neuromorphic computing: the resulting L2MU outperforms recurrent spiking neural networks on event-based Braille
        letter reading.
      </FeatureCard>

      <FeatureCard
        tone="light"
        eyebrow="Funded projects"
        title="The projects that fund our research"
        image={fundedProjectsImage}
        imageAlt="TRISTAN project visualization"
        stats
        cta="Explore all funded projects"
        to={theme.projects}
        button
        imageSide="right"
      >
        Featured: TRISTAN expands the European RISC-V ecosystem by tackling Electronic Design Automation challenges
        through open-source and industrial synergy.
      </FeatureCard>

      <div className="h-10 md:h-14" />
    </main>
  )
}
