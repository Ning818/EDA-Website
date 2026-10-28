// The footer's phone and fax numbers as the code has them: the DEFAULTS the site shows until the API's (GET /api/site, the database, backend/) arrive, or when it cannot be reached.
// Where the footer is shown, it is the API's that count (SiteProvider.jsx, useSite.js), so the staff can change the numbers without a new version of the site. The rest of the
// footer - the names, the address, the links - is written in Footer.jsx.
export const SITE_DEFAULTS = {
  phone: '+39 011 090 7042',
  // what the phone number's "tel:" link holds
  phone_dial: '+390110907042',
  fax: '+39 011 090 7099',
}

/** What the API says, if it says the footer's numbers; else the defaults. */
export const siteFrom = (answer) => (answer && 'phone' in answer && 'fax' in answer ? answer : SITE_DEFAULTS)
