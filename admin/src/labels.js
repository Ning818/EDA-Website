// The words the admin uses for what the API calls by code. All of the admin's text is English.

export const PRESETS = [
  { value: 'administrative', label: 'Administrative staff', description: 'Adds and changes people, updates the site pages, and manages accounts.' },
  { value: 'theme-owner', label: 'Theme owner', description: 'Adds people and updates the content of every theme.' },
  { value: 'projects-owner', label: 'Projects owner', description: 'Updates the funded projects.' },
  { value: 'developer', label: 'Developer', description: 'Answers the requests of people who cannot find what they need, reads the activity log and checks how the system is doing.' },
]

export const presetLabel = (account) => {
  if (account.preset) return PRESETS.find((p) => p.value === account.preset)?.label ?? account.preset
  return account.grants.length ? 'Custom access' : 'No access'
}

export const AREA_LABELS = {
  people_add: 'Add people',
  people_edit: 'Change people',
  people_delete: 'Delete people',
  site: 'Site pages',
  projects: 'Funded projects',
  theme: 'Theme-related changes',
  accounts: 'Accounts',
  system: 'System',
}

export const TITLES = ['Full Professor', 'Associate Professor', 'Assistant Professor', 'Research Fellow', 'PhD Student', 'Former member']

export const GROUPS = [
  { value: 'professors', label: 'Professors' },
  { value: 'phd-students', label: 'PhD students and research fellows' },
  { value: 'alumni', label: 'Former members' },
]

// the languages a project's description can be in; English is no code at all (empty). The same list as the API's (backend/app/services/projects.py)
export const LANGUAGES = [
  { value: '', label: 'English' },
  { value: 'it', label: 'Italian' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'es', label: 'Spanish' },
]

// a funded project is ongoing or ended; it is never deleted
export const PROJECT_STATUSES = [
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'ended', label: 'Ended' },
]

// the three logo walls of the Collaborations page, in the order of the page
export const KINDS = [
  { value: 'university', label: 'University', wall: 'Universities' },
  { value: 'institute', label: 'Institute', wall: 'Institutes' },
  { value: 'company', label: 'Company', wall: 'Companies' },
]

// the pages that have a paragraph under their title (the slug the API uses, and the name of the page)
export const INTRO_PAGES = [
  { slug: 'people', label: 'People' },
  { slug: 'collaborations', label: 'Collaborations' },
]

// the person's pages elsewhere: the API's key, the label of the field, an example of the address
export const LINK_FIELDS = [
  { key: 'polito', label: 'Politecnico page', example: 'https://www.polito.it/…' },
  { key: 'orcid', label: 'ORCID', example: 'https://orcid.org/…' },
  { key: 'linkedin', label: 'LinkedIn', example: 'https://www.linkedin.com/in/…' },
  { key: 'dept', label: 'Department page', example: 'https://www.dauin.polito.it/…' },
  { key: 'iris', label: 'IRIS profile', example: 'https://iris.polito.it/…' },
]
