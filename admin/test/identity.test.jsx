import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ADMINISTRATIVE, DEVELOPER, PROJECTS_OWNER, THEME_OWNER, me, renderAdmin } from './helpers'

describe('what a browser tab shows', () => {
  const app = process.cwd() // the tests run from the admin's folder
  const html = readFileSync(join(app, 'index.html'), 'utf8')

  it("has the group's logo as its icon, in the sizes a browser asks for, and the files exist", () => {
    const icons = [...html.matchAll(/<link rel="(?:icon|apple-touch-icon)"[^>]*href="([^"]+)"/g)].map((m) => m[1])
    expect(icons).toEqual(['/favicon-32.png', '/favicon.png', '/apple-touch-icon.png'])
    for (const icon of icons) expect(existsSync(join(app, 'public', icon)), icon).toBe(true)
  })

  it('has a title, a language and says it is not for search engines', () => {
    expect(html).toContain('<html lang="en">')
    expect(html).toContain('<title>EDA Group admin</title>')
    expect(html).toContain('noindex')
  })
})

// A link of the navigation is called what the page it leads to is called, so that the visitor knows where they arrived.
describe('the navigation and the pages it leads to', () => {
  const cases = [
    ['/themes', 'Themes', THEME_OWNER, { 'GET /api/admin/themes': { body: [] } }],
    ['/projects', 'Funded projects', PROJECTS_OWNER, { 'GET /api/admin/projects': { body: [] }, 'GET /api/themes': { body: [] } }],
    ['/system', 'System status', DEVELOPER, { 'GET /api/admin/system': { status: 500, body: { detail: 'x' } } }],
    ['/people', 'People', ADMINISTRATIVE, { 'GET /api/people': { body: [] } }],
    ['/accounts', 'Accounts', ADMINISTRATIVE, { 'GET /api/admin/accounts': { body: [] } }],
    ['/links', 'Broken links', ADMINISTRATIVE, { 'GET /api/admin/links/problems': { body: { problems: [], last_check: null, threshold: 3 } } }],
    ['/audit', 'Activity log', DEVELOPER, { 'GET /api/admin/audit?limit=50': { body: { entries: [], next_before: null, actions: [] } } }],
    ['/requests', 'Requests', DEVELOPER, { 'GET /api/admin/requests': { body: { requests: [], open: 0 } } }],
  ]

  it.each(cases)('%s is called %s in both places', async (path, label, grants, routes) => {
    renderAdmin(path, { 'GET /api/auth/me': { body: me({ grants }) }, ...routes })
    expect(await screen.findByRole('heading', { level: 1, name: label })).toBeInTheDocument()
    const link = within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', { name: label })
    expect(link).toHaveAttribute('href', path)
  })
})

// Where a link stands in the navigation is part of what a visitor learns of the admin: the same order for everyone who has the same links.
describe('the order of the navigation', () => {
  const order = async (grants) => {
    const { unmount } = renderAdmin('/', { 'GET /api/auth/me': { body: me({ grants }) }, 'GET /api/admin/links/problems': { body: { problems: [], last_check: null, threshold: 3 } }, 'GET /api/admin/system': { status: 500, body: { detail: 'x' } } })
    await screen.findByRole('heading', { level: 1, name: 'What would you like to do?' })
    const names = within(screen.getByRole('navigation', { name: 'Main' }))
      .getAllByRole('link')
      .map((link) => link.textContent)
    unmount() // one app at a time: the next call draws its own
    return names
  }

  it('puts Accounts straight after Home for the administrative staff', async () => {
    expect(await order(ADMINISTRATIVE)).toEqual(['Home', 'Accounts', 'People', 'Collaborations', 'Site text', 'Broken links'])
  })

  it('keeps the others as they were', async () => {
    expect(await order(THEME_OWNER)).toEqual(['Home', 'People', 'Themes', 'Broken links'])
    expect(await order(PROJECTS_OWNER)).toEqual(['Home', 'Funded projects', 'Broken links'])
    expect(await order(DEVELOPER)).toEqual(['Home', 'Requests', 'Activity log', 'System status'])
  })
})
