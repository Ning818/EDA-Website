// The faint dot grid under a decorated page header: a 24px grid of dots that fades out away from the top right. It is the same for
// every theme's header (VLSI-CAD's circuit, Smart City's skyline, the ones whose artwork isn't designed yet), so the pages
// share one ground; the artwork (HeaderDecor, SkylineParticles, ...) sits on top of it. `light`: navy dots for a light band,
// white ones for a dark band.
export default function HeaderDots({ light = false }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 bg-[length:24px_24px] [mask-image:radial-gradient(ellipse_at_85%_10%,black_8%,transparent_78%)] ${
        light ? 'bg-[radial-gradient(rgba(0,40,67,0.2)_1px,transparent_1.3px)]' : 'bg-[radial-gradient(rgba(255,255,255,0.16)_1px,transparent_1.3px)]'
      }`}
    />
  )
}
