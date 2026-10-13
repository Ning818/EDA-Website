// Checks the content layer (src/content/*.js): every theme has its texts, every field a page needs is there, every image file
// exists, every link is a well-formed URL. Plain Node, no build needed:  node scripts/check-content.mjs
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createReport } from './lib/report.mjs'
import { THEMES } from '../src/themes.js'
import { PROFESSORS, TEACHING_GROUPS, TEACHING_INTRO, INVOLVED_PEOPLE } from '../src/content/people.js'
import { RESEARCH_BY_THEME, TOPICS } from '../src/content/research.js'
import { PROJECTS_BY_THEME, ONGOING_COUNT, ENDED_COUNT } from '../src/content/projects.js'
import { COLLABORATIONS_INTRO, UNIVERSITIES, INSTITUTES, COMPANIES } from '../src/content/collaborations.js'
import { HOME_HERO, HOME_THEME_COPY } from '../src/content/home.js'
import { FOOTER } from '../src/content/site.js'
import { YOUTUBE_COPY, LINKEDIN_COPY } from '../src/content/social.js'

const r = createReport('content')
const text = (v) => typeof v === 'string' && v.trim().length > 0
const list = (v) => Array.isArray(v) && v.length > 0
const isUrl = (v) => {
  try {
    return ['http:', 'https:', 'mailto:'].includes(new URL(v).protocol)
  } catch {
    return false
  }
}
const imageFile = (where, url) => {
  if (!r.check(typeof url === 'string' && url.startsWith('file:'), `${where}: image is not a file URL (${String(url)})`)) return
  r.check(fs.existsSync(fileURLToPath(url)), `${where}: image file is missing - ${fileURLToPath(url)}`)
}

// ---- themes <-> content ----
for (const t of THEMES) {
  r.check(RESEARCH_BY_THEME[t.slug], `research: no entry for theme "${t.slug}" in RESEARCH_BY_THEME`)
  r.check(PROJECTS_BY_THEME[t.slug], `projects: no entry for theme "${t.slug}" in PROJECTS_BY_THEME`)
  r.check(text(HOME_THEME_COPY[t.name]), `home: no copy for theme "${t.name}" in HOME_THEME_COPY`)
}
const vlsiResearch = RESEARCH_BY_THEME['vlsi-cad']
const vlsiProjects = PROJECTS_BY_THEME['vlsi-cad']
for (const t of THEMES) {
  if (t.slug === 'vlsi-cad') continue
  if (RESEARCH_BY_THEME[t.slug] === vlsiResearch) r.warn(`research: "${t.slug}" still shows the VLSI-CAD texts (placeholder)`)
  if (PROJECTS_BY_THEME[t.slug] === vlsiProjects) r.warn(`projects: "${t.slug}" still shows the VLSI-CAD projects (placeholder)`)
}

// ---- research ----
r.check(text(TEACHING_INTRO) && list(TOPICS), 'research/people: TEACHING_INTRO and TOPICS must not be empty')
for (const [slug, e] of Object.entries(RESEARCH_BY_THEME)) {
  const w = `research[${slug}]`
  r.check(text(e.intro), `${w}.intro is empty`)
  r.check(list(e.topics) && e.topics.every(text), `${w}.topics must be a non-empty list of texts`)
  for (const block of ['thesis', 'fundedTeaser']) {
    const b = e[block]
    if (!r.check(b, `${w}.${block} is missing`)) continue
    for (const k of ['title', 'cta', 'body', 'imageAlt']) r.check(text(b[k]), `${w}.${block}.${k} is empty`)
    imageFile(`${w}.${block}`, b.image)
  }
  if (e.thesis) r.check(list(e.thesis.tags) && text(e.thesis.meta), `${w}.thesis needs tags and meta`)
}

// ---- projects ----
for (const [slug, e] of Object.entries(PROJECTS_BY_THEME)) {
  const w = `projects[${slug}]`
  r.check(list(e.ongoing) && e.ongoing.every((p) => text(p.code) && text(p.description) && text(p.status)), `${w}.ongoing: every project needs code, description and status`)
  r.check(list(e.ended) && e.ended.every((p) => text(p.code) && text(p.description)), `${w}.ended: every project needs code and description`)
  r.check(Number.isInteger(e.endedSplitAt) && e.endedSplitAt > 0 && e.endedSplitAt < e.ended.length, `${w}.endedSplitAt must cut the ended list in two (1..${e.ended.length - 1})`)
  const h = e.highlight
  if (r.check(h, `${w}.highlight is missing`)) {
    r.check(list(h.title) && h.title.every(text), `${w}.highlight.title must be a list of title lines`)
    for (const k of ['cta', 'body', 'imageAlt']) r.check(text(h[k]), `${w}.highlight.${k} is empty`)
    r.check(list(h.tags), `${w}.highlight.tags is empty`)
    imageFile(`${w}.highlight`, h.image)
  }
  if (e.ongoing.length !== ONGOING_COUNT) r.warn(`${w}: ONGOING_COUNT is ${ONGOING_COUNT} but the list has ${e.ongoing.length} projects`)
  if (e.ended.length !== ENDED_COUNT) r.warn(`${w}: ENDED_COUNT is ${ENDED_COUNT} but the list has ${e.ended.length} projects`)
  if (e.ended.some((p) => p.code === 'Funded Projects code' || p.description === 'Description')) r.warn(`${w}: the ended list contains placeholder rows`)
}

// ---- people ----
for (const [i, p] of PROFESSORS.entries()) {
  const w = `people.PROFESSORS[${i}]${p.name ? ` (${p.name})` : ''}`
  r.check(text(p.name) && text(p.title), `${w}: name and title are required`)
  imageFile(w, p.photo)
  for (const [k, url] of Object.entries(p.links ?? {})) r.check(isUrl(url), `${w}.links.${k} is not a valid URL: ${url}`)
}
r.check(INVOLVED_PEOPLE.every((p) => text(p.name) && text(p.title)), 'people.INVOLVED_PEOPLE: name and title are required')
const labels = TEACHING_GROUPS.map((g) => g.label)
r.check(new Set(labels).size === labels.length, `people.TEACHING_GROUPS: labels must be unique (${labels.join(', ')})`)
for (const g of TEACHING_GROUPS) {
  r.check(text(g.label) && list(g.people), `people.TEACHING_GROUPS "${g.label}": needs a label and people`)
  for (const [i, p] of g.people.entries()) {
    imageFile(`TEACHING_GROUPS "${g.label}"[${i}]`, p.photo)
    r.check(text(p.name) && text(p.title), `TEACHING_GROUPS "${g.label}"[${i}]: name and title are required`)
  }
}
const profNames = new Set(PROFESSORS.map((p) => p.name))
for (const g of TEACHING_GROUPS.filter((g) => g.label !== 'Professors')) {
  if (g.people.every((p) => profNames.has(p.name))) r.warn(`people: "${g.label}" repeats the professors (placeholder)`)
}

// ---- collaborations (null = an empty cell kept for the grid's alignment) ----
r.check(text(COLLABORATIONS_INTRO), 'collaborations: COLLABORATIONS_INTRO is empty')
for (const [name, items] of Object.entries({ UNIVERSITIES, INSTITUTES, COMPANIES })) {
  for (const [i, l] of items.entries()) {
    if (l === null) continue
    r.check(text(l.alt), `collaborations.${name}[${i}]: alt text is required`)
    imageFile(`collaborations.${name}[${i}] (${l.alt})`, l.src)
  }
}

// ---- home, footer, social ----
r.check(text(HOME_HERO.title) && text(HOME_HERO.text), 'home: HOME_HERO needs title and text')
r.check([FOOTER.university, FOOTER.department, FOOTER.copyright.owner, FOOTER.copyright.rest].every(text) && list(FOOTER.address), 'site: FOOTER is missing a field')
r.check(FOOTER.links.every((l) => text(l.label) && isUrl(l.url)) && isUrl(FOOTER.copyright.ownerUrl), 'site: FOOTER links must be valid URLs')
for (const [name, c] of Object.entries({ YOUTUBE_COPY, LINKEDIN_COPY })) {
  r.check(text(c.label) && text(c.text) && text(c.cta) && isUrl(c.url), `social.${name}: label, text, cta and a valid url are required`)
}

process.exit(r.finish())
