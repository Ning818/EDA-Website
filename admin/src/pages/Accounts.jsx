import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../auth/useAuth'
import FlashNotice from '../components/FlashNotice'
import { LinkButton, Loading, LoadError, PageHeading } from '../components/ui'
import { presetLabel } from '../labels'
import { useLoad } from '../useLoad'

export default function Accounts() {
  const { user } = useAuth()
  const { status, data, error, reload } = useLoad(() => api.get('/api/admin/accounts'), [])
  return (
    <div className="page">
      <div className="page-head">
        <PageHeading>Accounts</PageHeading>
        <LinkButton to="/accounts/new" variant="primary">
          Make a new account
        </LinkButton>
      </div>
      <FlashNotice />
      {status === 'loading' && <Loading>Loading the accounts…</Loading>}
      {status === 'error' && <LoadError error={error} onRetry={reload} />}
      {status === 'ok' && (
        <div className="card table-wrap" role="region" aria-label="Accounts, scrolls sideways on a narrow screen" tabIndex={0}>
          <table>
            <caption>
              {data.length} {data.length === 1 ? 'account' : 'accounts'}
            </caption>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">What they may do</th>
                <th scope="col">State</th>
                <th scope="col">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((account) => (
                <tr key={account.id}>
                  <th scope="row">
                    {account.name}
                    {account.id === user.id && <span className="muted"> (you)</span>}
                  </th>
                  <td>{account.email}</td>
                  <td>{presetLabel(account)}</td>
                  <td>
                    <span className="row" style={{ gap: '0.375rem' }}>
                      <span className={`badge ${account.is_active ? 'badge-ok' : 'badge-off'}`}>{account.is_active ? 'Active' : 'Switched off'}</span>
                      {account.must_change_password && <span className="badge badge-warn">Temporary password</span>}
                    </span>
                  </td>
                  <td>
                    <Link to={`/accounts/${account.id}`}>
                      Change{' '}
                      <span className="visually-hidden">the account of {account.name}</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
