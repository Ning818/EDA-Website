import { fundedProjectsFor } from './fundedProjectsData'

// The funded-project numbers shown on the Funded Projects page header (StatsRow) and teased on the Research page's
// Funded Projects card (FeatureCard): how many projects a theme lists as ongoing and as ended, and their sum.
export function projectStatsFor(slug) {
  const { ongoing, ended } = fundedProjectsFor(slug)
  return { ongoing: ongoing.length, ended: ended.length, total: ongoing.length + ended.length }
}
