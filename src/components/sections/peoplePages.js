// A person's page on Politecnico di Torino's own sites, for the cards that link to it (the Funded Projects pages' "Refer to", the Research pages' people). The same
// addresses as the People page's "polito" and "iris" links (pages/Teaching.jsx), kept here by name so a section does not have to load that page's photos.
const staff = (id) => `https://www.polito.it/personale?p=${id}`

export const POLITO_PAGES = {
  'Alberto Macii': staff('003783'),
  'Andrea Calimera': staff('018408'),
  'Massimo Poncino': staff('002156'),
  'Sara Vinco': staff('032283'),
  'Santa Di Cataldo': staff('019491'),
  'Edoardo Patti': staff('024365'),
  'Lorenzo Bottaccioli': staff('036638'),
  'Enrico Macii': staff('002042'),
  'Daniele Jahier Pagliari': staff('035148'),
  'Gianvito Urgese': staff('018489'),
  'Alessandro Aliberti': staff('040463'),
  'Francesco Ponzio': staff('038677'),
  'Luca Barbierato': staff('038687'),
  'Valentino Peluso': staff('032364'),
}

// For those with no staff page on polito.it (PhD students, former members): their research profile on Politecnico's IRIS archive - also Politecnico's own site, and the
// only page of their own it has. (The department sites' profile pages, the "dept" links of the People page, no longer answer.)
const IRIS_PROFILES = {
  'Alberto Bocca': 'https://iris.polito.it/cris/rp/rp06831',
  'Chen Xie': 'https://iris.polito.it/browse?type=author&authority=rp67670&authority_lang=en',
  'Davide Cannizzaro': 'https://iris.polito.it/cris/rp/rp30609',
  'Evelina Forno': 'https://iris.polito.it/cris/rp/rp00267',
  'Marco Massano': 'https://iris.polito.it/cris/rp/rp58434',
  'Matteo Orlando': 'https://iris.polito.it/cris/rp/rp35720',
  'Roberto Giorgio Rizzo': 'https://iris.polito.it/cris/rp/rp22865',
  'Yukai Chen': 'https://iris.polito.it/cris/rp/rp23241',
  'Marta Lovino': 'https://iris.polito.it/cris/rp/rp38120',
}

/** A person's page for a card to link to: `{ href, kind }` - `kind` 'staff' (polito.it) or 'iris' - or null where there is none. */
export function personPage(name) {
  if (POLITO_PAGES[name]) return { href: POLITO_PAGES[name], kind: 'staff' }
  if (IRIS_PROFILES[name]) return { href: IRIS_PROFILES[name], kind: 'iris' }
  return null
}
