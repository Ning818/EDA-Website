// The words the admin uses for what the API calls by code. All of the admin's text is English.

export const PRESETS = [
  { value: 'administrative', label: 'Administrative staff', description: 'Adds and changes people, keeps the site pages, and manages accounts.' },
  { value: 'theme-owner', label: 'Theme owner', description: 'Adds people and keeps the content of every theme.' },
  { value: 'projects-owner', label: 'Projects owner', description: 'Keeps the funded projects.' },
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
  theme: 'Theme pages',
  accounts: 'Accounts',
}

export const TITLES = ['Full Professor', 'Associate Professor', 'Assistant Professor', 'Research Fellow', 'PhD Student', 'Former member']

export const GROUPS = [
  { value: 'professors', label: 'Professors' },
  { value: 'phd-students', label: 'PhD students and research fellows' },
  { value: 'alumni', label: 'Former members' },
]

// the person's pages elsewhere: the API's key, the label of the field, an example of the address
export const LINK_FIELDS = [
  { key: 'polito', label: 'Politecnico page', example: 'https://www.polito.it/…' },
  { key: 'orcid', label: 'ORCID', example: 'https://orcid.org/…' },
  { key: 'linkedin', label: 'LinkedIn', example: 'https://www.linkedin.com/in/…' },
  { key: 'dept', label: 'Department page', example: 'https://www.dauin.polito.it/…' },
  { key: 'iris', label: 'IRIS profile', example: 'https://iris.polito.it/…' },
]
