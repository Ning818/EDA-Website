// A person's role as written on the small people cards (the Research pages' "Involved people", the Funded Projects pages' "Refer to"):
// the same wherever they appear, so it is kept once, here. From the group's People page (April 2026 snapshot): the professors by their
// rank, the PhD candidates, and "Former member" for those on its Wall of Fame.
export const ROLES = {
  'Enrico Macii': 'Full Prof.',
  'Alberto Macii': 'Full Prof.',
  'Massimo Poncino': 'Full Prof.',
  'Andrea Calimera': 'Full Prof.',
  'Daniele Jahier Pagliari': 'Assoc. Prof.',
  'Edoardo Patti': 'Assoc. Prof.',
  'Gianvito Urgese': 'Assoc. Prof.',
  'Lorenzo Bottaccioli': 'Assoc. Prof.',
  'Santa Di Cataldo': 'Assoc. Prof.',
  'Sara Vinco': 'Assoc. Prof.',
  'Alessandro Aliberti': 'Asst. Prof.',
  'Francesco Ponzio': 'Asst. Prof.',
  'Luca Barbierato': 'Asst. Prof.',
  'Valentino Peluso': 'Asst. Prof.',
  'Marta Lovino': 'Former member',
  'Yukai Chen': 'Former member',
  'Alberto Bocca': 'PhD Student',
  'Antonio Cipolletta': 'Former member',
  'Chen Xie': 'PhD Student',
  'Davide Cannizzaro': 'PhD Student',
  'Evelina Forno': 'PhD Student',
  'Luca Mocerino': 'Former member',
  'Marco Massano': 'PhD Student',
  'Matteo Grimaldi': 'PhD Student',
  'Matteo Orlando': 'PhD Student',
  'Roberto Giorgio Rizzo': 'Former member',
}

// The people on the small cards (the Research pages' groups, the Funded Projects pages' "Refer to") are shown by rank - full professors, then associate and assistant professors,
// research fellows, PhD students and former members - and within a rank in the order they are written in.
const RANK = ['Full Prof.', 'Assoc. Prof.', 'Asst. Prof.', 'Research Fellow', 'PhD Student', 'Former member']
const rankOf = (name) => {
  const rank = RANK.indexOf(ROLES[name])
  return rank === -1 ? RANK.length : rank
}
export const byRank = (people) => [...people].sort((a, b) => rankOf(a) - rankOf(b)) // the sort is stable

// How a name is written on the small cards: a middle name is cut to its initial (the full name stays the key everywhere else, and in what a screen reader is told).
// Only a given name that is followed by a second given name, which a program cannot tell from a double surname (Jahier Pagliari, Di Cataldo), is listed here.
const CARD_NAMES = { 'Roberto Giorgio Rizzo': 'Roberto G. Rizzo' }
export const cardName = (name) => CARD_NAMES[name] ?? name
