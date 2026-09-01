/**
 * Placeholder for a particle/shader background effect that hasn't been built yet.
 * Swap the contents of this component for the real react-three-fiber scene later —
 * every call site (Hero, theme sections) stays untouched.
 */
export default function ParticlePlaceholder({ label, className = '' }) {
  return (
    <div
      className={`flex items-center justify-center bg-placeholder p-10 text-left font-body text-[40px] leading-normal text-black ${className}`}
    >
      <p>{label}</p>
    </div>
  )
}
