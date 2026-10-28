/**
 * The order of the projects in a list: alphabetically by code, as the website's Funded Projects page has them (digits in numeric order, capitals and accents ignored), and the projects that
 * have no code last, in the order they came (the sort is stable). For `Array.prototype.sort`.
 */
export const byCode = (a, b) => (a.code && b.code ? a.code.localeCompare(b.code, 'en', { sensitivity: 'base', numeric: true }) : Boolean(b.code) - Boolean(a.code))
