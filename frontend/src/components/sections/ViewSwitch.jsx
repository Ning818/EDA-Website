import { useFooterInView } from './homeChapters'

// The home page's switch between its two looks: the animated page (the particle clouds that regather as it scrolls) and the simplified one (each theme a plain screen with its
// picture, none of the scroll length that is only there for the animation). A small pill fixed to the bottom right of the screen that names the look it switches TO.
// `still`: the page is the simplified one now. It leaves the screen when the footer comes into view, so it does not sit over it.
export default function ViewSwitch({ still, onSwitch }) {
  const hidden = useFooterInView()
  return (
    <button
      type="button"
      onClick={onSwitch}
      className={`fixed bottom-4 right-4 z-30 inline-flex cursor-pointer items-center gap-2 rounded-full border border-navy/25 bg-mint/90 px-4 py-2.5 type-meta text-navy shadow-sm backdrop-blur-sm transition-[opacity,background-color] duration-300 hover:bg-white ${hidden ? 'invisible opacity-0' : ''}`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4 shrink-0" aria-hidden="true">
        {still ? (
          // sparkles: the animated page
          <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />
        ) : (
          // a plain frame with its lines: the simplified page
          <>
            <rect x="4" y="4" width="16" height="16" rx="3" />
            <path d="M8 9h8M8 13h8M8 17h5" />
          </>
        )}
      </svg>
      {still ? 'Animated view' : 'Simplified view'}
    </button>
  )
}
