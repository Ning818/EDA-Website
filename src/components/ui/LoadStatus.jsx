// What a part of a page shows in place of its content while the content is on its way from the API (backend/), and when it could not be fetched. Each is made to stand where
// the content will, so the page does not jump when it arrives. A screen reader is told by the page itself (a role="status" line); an error announces itself.

const bar = 'rounded bg-navy/10 motion-safe:animate-pulse'

/** The content could not be fetched: what went wrong in a line, and a button to ask again. `what`: what was being loaded ("the people", "this page"); `onRetry` asks again. */
export function LoadError({ what, error, onRetry, className = '' }) {
  return (
    <div role="alert" className={`flex flex-col items-start gap-3 rounded-xl border border-navy/10 bg-white p-8 ${className}`}>
      <h3 className="type-h3 text-navy">We could not load {what}</h3>
      <p className="type-body text-navy">It could not be fetched just now. Check your connection and try again.</p>
      {error?.message && <p className="type-meta text-[#5f7370]">{error.message}</p>}
      <button
        type="button"
        onClick={onRetry}
        className="mt-1 cursor-pointer rounded-full bg-navy px-5 py-2 type-action text-white transition-colors duration-200 hover:bg-[#1a7d90] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
      >
        Try again
      </button>
    </div>
  )
}

const LINE_WIDTHS = ['w-full', 'w-[96%]', 'w-full', 'w-[92%]', 'w-[60%]']

/** Lines of text still blank, for a paragraph (spans, so it can stand inside a <p>). */
export function TextSkeleton({ lines = 5 }) {
  return (
    <span aria-hidden="true" className="flex flex-col gap-2.5 py-1">
      {Array.from({ length: lines }, (_, i) => (
        <span key={i} className={`block h-4 ${LINE_WIDTHS[i % LINE_WIDTHS.length]} ${bar}`} />
      ))}
    </span>
  )
}

/** A few sections of a page still blank: a heading bar over some lines of text, as many times as `blocks`. */
export function SectionSkeleton({ blocks = 3 }) {
  return (
    <section aria-hidden="true" className="mx-auto flex max-w-[1440px] flex-col gap-12 px-8 py-12 lg:px-[120px]">
      {Array.from({ length: blocks }, (_, i) => (
        <div key={i} className="flex flex-col gap-3">
          <div className={`h-8 w-2/5 max-w-[420px] ${bar}`} />
          <div className={`h-4 w-full ${bar}`} />
          <div className={`h-4 w-[94%] ${bar}`} />
          <div className={`h-4 w-[70%] ${bar}`} />
        </div>
      ))}
    </section>
  )
}
