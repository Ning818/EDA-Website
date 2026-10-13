// Site-wide information: the footer's address and links, and the copyright line.
// (The YouTube / LinkedIn links live in social.js; the navigation comes from src/themes.js and src/components/layout/Header.jsx.)

export const FOOTER = {
  university: 'Politecnico di Torino',
  department: 'Department of Control and Computer Engineering (DAUIN)',
  address: ['Corso Duca Degli Abruzzi, 24', '10129, Torino, Italy', 'Tel. +39 011 090 7042', 'Fax. +39 011 090 7099'],
  // The "Visit" links (open in a new tab).
  links: [
    { label: 'Polito website', url: 'https://www.polito.it/' },
    { label: 'Department website', url: 'https://www.dauin.polito.it/en/' },
  ],
  copyright: {
    year: 2026,
    owner: 'EDA',
    ownerUrl: 'https://eda.polito.it/',
    rest: 'All rights reserved. Theme Spacious by .... Powered by:...',
  },
}
