import { Link } from 'react-router-dom'
import DNABackground from '../three/DNABackground'

/** Standalone preview of the DNA particle background with some sample content layered on top. */
export default function DNABackgroundDemo() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(ellipse_at_center,#06223a_0%,#021424_55%,#010a14_100%)] text-white">
      <DNABackground />

      <main className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-4 sm:px-8 pointer-events-none">
        <p className="font-heading text-sm font-medium uppercase tracking-[0.3em] text-[#4fd8a4]">
          Bioinformatics
        </p>
        <h1 className="mt-4 max-w-2xl font-heading text-4xl font-semibold leading-tight sm:text-6xl">
          Electronic Design Automation for life sciences
        </h1>
        <p className="mt-6 max-w-xl text-base text-white/70 sm:text-lg">
          4,000 particles sampled from the DNA6 model, rendered with a custom WebGL shader. Move your
          cursor across the strands.
        </p>
        <div className="mt-10">
          <Link
            to="/"
            className="pointer-events-auto inline-block rounded-full border border-white/30 px-6 py-3 font-heading text-sm font-medium backdrop-blur-sm transition hover:border-[#4fd8a4] hover:text-[#4fd8a4]"
          >
            Back to home
          </Link>
        </div>
      </main>
    </div>
  )
}
