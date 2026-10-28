import { Link } from 'react-router-dom'

// The page for an address that leads nowhere: a path no route matches, or a theme the site does not have (`what`: what is missing).
export default function NotFound({ what = 'page' }) {
  return (
    <main>
      <section className="mx-auto flex min-h-[50svh] max-w-[1440px] flex-col items-start gap-6 px-8 pb-24 pt-16 lg:px-[120px]">
        <h1 className="type-h1 tracking-tight text-navy">This {what} does not exist.</h1>
        <Link to="/" className="type-action py-2 text-navy underline decoration-[#279aae] decoration-2 underline-offset-4 hover:decoration-navy">
          Go to the home page
        </Link>
      </section>
    </main>
  )
}
