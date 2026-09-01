import PageIntroBand from '../components/sections/PageIntroBand'
import ResearchTopicsAndPeople from '../components/sections/ResearchTopicsAndPeople'
import HighlightBand from '../components/sections/HighlightBand'
import thesisImage from '../assets/images/thesis-highlight.png'
import fundedProjectsImage from '../assets/images/funded-projects-highlight.png'

export default function Research() {
  return (
    <main>
      <PageIntroBand category="Research" title="VLSI-CAD">
        The EDA group undertakes research and development in the field of Design Automation for standard digital
        CMOS ICs, Beyond-CMOS circuits and Electrical Energy Systems. Concerning standard CMOS technologies, the
        main activities include computer-aided design (CAD) algorithms methodologies and prototype tools for
        low-power and variation tolerant Integrated Circuits, with particular emphasis on logical- and
        physical-synthesis. In the field of Beyond-CMOS technologies, the main focus is given to Graphene-based
        devices. Activities include, but are not limited to electrical modeling and circuit-level simulation of
        Graphene P-N junctions and Graphene Field-Effect-Transistors, with particular attention on integration and
        optimization strategies that can enable the implementation of flexible circuits with ultra low-power
        features.
      </PageIntroBand>

      <ResearchTopicsAndPeople />

      <HighlightBand
        title="Hightlight Thesis"
        image={thesisImage}
        imageAlt="Neuromorphic L2MU research visualization"
        ctaLabel="Discover More Thesis"
        ctaTo="#"
        imageSide="left"
        dark
      >
        To achieve energy efficiency, neuromorphic computing integrates State Space Models (SSMs) by redesigning the
        Legendre Memory Unit (LMU) with Leaky Integrate-and-Fire (LIF) neurons. This LIF-based LMU (L2MU) outperforms
        recurrent Spiking Neural Networks (SNNs) on event-based Braille letter reading tasks, highlighting SSMs as a
        promising neuromorphic alternative.
      </HighlightBand>

      <HighlightBand
        title="Funded Projects"
        image={fundedProjectsImage}
        imageAlt="TRISTAN project visualization"
        ctaLabel="Discover Funded Projects"
        ctaTo="/research/funded-projects"
        imageSide="right"
      >
        The TRISTAN project aims to expand the European RISC-V ecosystem by tackling Electronic Design Automation
        (EDA) challenges through open-source and industrial synergy. This paper presents an overview of TRISTAN's EDA
        flow and methodologies, highlighting tools that streamline the early design phases of RISC-V systems.
      </HighlightBand>
    </main>
  )
}
