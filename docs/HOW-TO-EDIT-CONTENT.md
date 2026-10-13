# How to edit content

Everything the site says is in `src/content/`. You do not need to touch a page file to change what it shows.
After any change run `npm run check:content` (fast) and look at the page in `npm run dev`.

## Find the thing you want to change

| I want to change ...                                      | File                           | What to edit                                              |
| --------------------------------------------------------- | ------------------------------ | --------------------------------------------------------- |
| a professor's name, title, photo, links                   | `src/content/people.js`        | `PROFESSORS`                                              |
| who is in the Teaching tabs (PhD students, alumni, clerks) | `src/content/people.js`       | `TEACHING_GROUPS` (each group is `{ label, people }`)     |
| the names listed under a Research page's topics           | `src/content/people.js`        | `INVOLVED_PEOPLE`                                         |
| the Teaching intro paragraph                              | `src/content/people.js`        | `TEACHING_INTRO`                                          |
| a Research page's intro, topics, highlight thesis         | `src/content/research.js`      | `RESEARCH_BY_THEME['<slug>']`                             |
| the Funded Projects lists and the highlight project       | `src/content/projects.js`      | `PROJECTS_BY_THEME['<slug>']`                             |
| the numbers on top of the Funded Projects page            | `src/content/projects.js`      | `ONGOING_COUNT`, `ENDED_COUNT` (see the note below)       |
| a university / institute / company logo                   | `src/content/collaborations.js`| `UNIVERSITIES`, `INSTITUTES`, `COMPANIES`                 |
| the Collaborations intro                                  | `src/content/collaborations.js`| `COLLABORATIONS_INTRO`                                    |
| the home hero, or the paragraph beside a theme's cloud    | `src/content/home.js`          | `HOME_HERO`, `HOME_THEME_COPY`                            |
| the footer address, links, copyright                      | `src/content/site.js`          | `FOOTER`                                                  |
| the YouTube / LinkedIn texts and links                    | `src/content/social.js`        | `YOUTUBE_COPY`, `LINKEDIN_COPY`                           |
| a theme's colour, or which artwork its header shows       | `src/themes.js`                | `color`, `header`                                         |
| the main navigation                                       | `src/components/layout/Header.jsx` | `NAV_LINKS` at the top (not in `src/content/` yet)    |

`<slug>` is one of `vlsi-cad`, `bioinformatics`, `smart-city`, `industry-4-0`.

## Recipes

### Add a professor

1. Put the photo in `src/assets/images/professors/` (a square-ish portrait, about 400 px wide is plenty).
2. In `PROFESSORS` add an entry in the same shape as its neighbours:

   ```js
   {
     photo: new URL('../assets/images/professors/jane-doe.jpg', import.meta.url).href,
     name: 'Jane Doe',
     title: 'Associate Professor',
     links: { polito: 'https://www.polito.it/personale?p=...', orcid: 'https://orcid.org/...', linkedin: '...' },
   },
   ```

   The `links` you leave out are simply not shown. Write the `new URL(...)` path out in full, do not build it from a variable.
3. `npm run check:content` confirms the file exists and the links are valid URLs.

### Fill the PhD students, alumni or clerks tab

`TEACHING_GROUPS` currently shows the professors in all four tabs (placeholder). Give a group its own list, in the same shape as
`PROFESSORS`, instead of `PLACEHOLDER_PEOPLE`. The content check stops warning when a group no longer repeats the professors.

### Replace the placeholder content of a theme

Bioinformatics, Smart City and Industry 4.0 reuse the VLSI-CAD object (`const VLSI_CAD`) in `research.js` and `projects.js`.
Write an object of the same shape for the theme and point `RESEARCH_BY_THEME['<slug>']` (or `PROJECTS_BY_THEME`) at it. The
shape is the VLSI-CAD object right above; the content check tells you which field is missing if you forget one.

### Add or remove a funded project

Edit `ongoing` or `ended` in `PROJECTS_BY_THEME['<slug>']`:

* ongoing: `{ code, description, status }`, with `status` like `"EU Funded · Active"`;
* ended: `{ code, description }`.

`endedSplitAt` is the number of ended projects in the left column; the rest go to the right.

**The counts are not computed.** `ONGOING_COUNT` and `ENDED_COUNT` are numbers written by hand (they also appear on the Research
page's teaser). When you change the lists, change them too; the check warns while they disagree with the list of a theme.

### Add a collaborator logo

1. Put the logo in `src/assets/images/` (PNG or SVG, transparent background; the existing ones are the reference for size).
2. Add `{ src: new URL('../assets/images/new-logo.png', import.meta.url).href, alt: 'Name of the organisation' }` to the right
   list. `null` entries are empty cells that keep the grid aligned; remove or fill them as you like.

### Change the text beside a home cloud

`HOME_THEME_COPY` in `src/content/home.js`, keyed by the theme's `name` (`'VLSI-CAD'`, `'Bioinformatics'`, `'Smart City'`,
`'Industry 4.0'`). Keep it about as long as the others; on a phone the cloud takes the space the text leaves.

## Rules that keep the checks green

* Text fields must not be empty; an image must exist; a link must be a full `https://...` URL (or `mailto:`).
* An image needs alt text (`alt` / `imageAlt`).
* Do not delete a key a page reads; the check script lists every field it needs.

## What cannot be changed here

The pictures made of particles are not content. See [HOW-TO-MODIFY-AN-EFFECT.md](HOW-TO-MODIFY-AN-EFFECT.md).
