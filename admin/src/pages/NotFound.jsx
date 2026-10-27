import { LinkButton, PageHeading } from '../components/ui'

export default function NotFound() {
  return (
    <div className="page page-narrow">
      <PageHeading>Page not found</PageHeading>
      <p>There is no such page in the admin. Check the address, or go back to the home page.</p>
      <div>
        <LinkButton to="/">Back to the home page</LinkButton>
      </div>
    </div>
  )
}
