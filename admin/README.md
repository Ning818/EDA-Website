# EDA Group admin

The interface the group's staff use to keep the EDA Group website up to date: add and correct people (a member who leaves is a change of title), and manage the accounts of those who may do so. It is a front-end
application of its own, written in React, and it talks to the API in `../backend` over HTTP. All of its text is English.

## A separate application

The website (the repository root), the API (`../backend`) and this admin are three different, isolated applications that share one repository for simplicity. So:

- this folder has its own `package.json`, build, settings and port (5174); it is never built into the website and nothing of it is in the website's `src/`;
- it imports nothing from `../src`, and the website imports nothing from here; the look of the website (its two typefaces and its colours) is copied into `src/index.css`, not shared;
- it reaches the API only through the routes the API offers: `/api/auth/...` (login, who is logged in, change of password) and `/api/admin/...`. The website never calls those.

## Run it

The API has to be running first (`../backend/README.md`, "Run it locally") and there has to be an account to log in with (`python -m app.manage create-user ... --preset administrative`).

```bash
npm install
npm run dev      # http://localhost:5174
```

The dev server forwards `/api` and `/media` to the API on port 8001, so the browser sees one address and there is no CORS to allow. It forwards with the browser's own `Host` header
(`changeOrigin: false` in `vite.config.js`): the API refuses a request that changes something when its `Origin` is not its own `Host`, and Vite's short form of a proxy rewrites the
`Host` to the API's. A web server in front of the admin in production must do the same (`proxy_set_header Host $host;`).

```bash
npm test         # the tests (Vitest, Testing Library, axe)
npm run lint
npm run build    # the files to serve, in dist/
```

## What is in it

| Screen | For | Does |
|---|---|---|
| Log in, Change password | everyone | the login; a user on a temporary password is sent to change it first and can do nothing else |
| Home | everyone | the tasks the user's grants allow, and the ones their grants allow but that have no screen yet |
| People, a person, Add a new person | `people_add`, `people_edit` | find a person; add one (with a photo that needs the confirmation that the person agreed, and a warning about a name that is there already); correct one, a change of title to Former member included (a member who leaves), after seeing which themes lose a contact; delete one added by mistake (grant `people_delete`, or the one who added the person, for 24 hours), after seeing what goes with them |
| Accounts, Make a new account, one account | `accounts` | make an account with a temporary password shown once; change the name or what the account may do; switch it off or on; give a new temporary password |

Not built yet: the screens for the themes, the funded projects, the collaborators and the site pages (the API does not have the routes yet either), and the list of broken links.

What a user sees is decided by the grants the API sends with `GET /api/auth/me`; the API checks them again on every request, so hiding a screen is only a convenience.

## The scenarios it serves

The admin is designed from the internal scenarios: who has to keep which part of the site up to date, what sets it off, and what has to be right afterwards. There are three kinds of user,
and what each may do is a set of grants (`../backend/README.md`, "Who may do what"):

| User | Preset | May |
|---|---|---|
| Administrative staff | `administrative` | add, correct and delete people; the collaborators, the footer numbers and the page introductions (`site`); make accounts |
| Theme content owner (one person, all themes) | `theme-owner` | add people; edit the theme pages |
| Funded-projects owner (one person) | `projects-owner` | keep the funded projects |

"Built" below means the screen exists in this admin and is tested; no real user has tried it yet. How often each scenario happens, and what a mistake costs, are not written here: that has to
come from the group.

**A. Administrative staff**

| Scenario | Trigger | What is done | What follows, what can go wrong | Done when | In the admin |
|---|---|---|---|---|---|
| A1 A new member | A professor, researcher or student joins | Enter the name, title, photo and links, and how the name is written on the small cards | The group comes from the title; a theme can only name the person once they are in the list; a wrong or unsafe link; the photo needs the person's agreement; a name that is in the list already | The People page shows the person in the right group, with a working photo and links | Built |
| A2 A member changes (a promotion, a new photo or link, leaving) | The person's situation changes | Change the title, photo or links. A member who leaves gets the title Former member: they are never deleted | A new title can move the person to another group, change their order and the short title on the small cards; the wrong person can be changed. A leaver is taken out of the contacts ("Refer to") of every theme: the admin says which themes lose a contact and asks to confirm, and a theme left with none shows no Refer to section. They stay in the research topics, as a former member | The new title is on every small card. A leaver is in the Former members group, last, and no theme names them as a contact | Built |
| A3 A member added by mistake | Someone was added who should not be there | Delete the person, after seeing which contacts and topics they are in | It also takes them out of those lists, so it is not for a member who left (A2); the deletion is written in the log and the photo is removed. The user who added the person may delete them too, for 24 hours | The person and their photo are gone and nothing else changed | Built |
| A4 A collaboration changes | A collaboration starts or ends | Add, change or remove collaborators (kind, name, address, logo) and joint projects (code, name, funding, years, coordinator, other partners, link) | The logo has to be fit for use and the right size; links go stale | The Collaborations page shows the right logo wall and project list | Not yet (`site`) |
| A5 The footer numbers change | The phone or fax number changes | Change the two numbers; either may be left empty | A wrong number is dialled by visitors | The footer shows the right numbers and the link dials | Not yet (`site`) |
| A6 An introduction changes | The wording should change | Change the paragraph under the title of the People or Collaborations page | No HTML; a long text breaks the layout | The page shows the new text | Not yet (`site`) |

**B. Theme content owner**

| Scenario | Trigger | What is done | What follows, what can go wrong | Done when | In the admin |
|---|---|---|---|---|---|
| B1 A research direction changes | A new direction, or topics are regrouped | Add or change research areas and the topics under them, choosing the people involved from the People list | A person who is needed may not be in the list yet (B5) | The theme's research topics and involved people are right | Not yet (`theme`) |
| B2 A new representative paper or project | There is something new to show | Replace a Highlight card; everything is typed by hand: title, authors (full names and short forms), venue, keywords, summary, link, picture | Picture rights and size; the picture needs a text alternative; nothing is read from IRIS | The card is replaced and the authors' short forms are right on a phone | Not yet (`theme`) |
| B3 A theme is reworded | The name or the introduction changes | Change the name, the short name, the home-page text and the introduction of the theme page | The navigation, the page titles, the home page and the section dots follow; a long name can break the navigation. The colours and the background drawing are in the code, not here | The name is the same everywhere | Not yet (`theme`) |
| B4 The contacts change | A contact person changes | Choose the "Refer to" contacts from the People list and put them in order | Not a former member (a leaver is taken out by the admin, A2); the section disappears when no contact is left | The contact cards are right | Not yet (`theme`) |
| B5 A person a theme needs is not in the list | B1 or B4 needs someone who has not been added | Add the person (name, title, photo with the agreement, links); they show at once, with no review | A mistake can be corrected or deleted for 24 hours; after that only the administrative staff can. A name in the list already is warned about | The person can be chosen straight away, without asking anyone | Built |

**C. Funded-projects owner**

| Scenario | Trigger | What is done | What follows, what can go wrong | Done when | In the admin |
|---|---|---|---|---|---|
| C1 A new project starts | A new funding is won | Choose the theme, mark it ongoing, enter the code (may be empty), the full name and the address (may be empty) | The wrong theme; the counts at the top of the page recount themselves; the admin then asks whether the theme page's funded-projects sentence needs changing (it is written by hand, by this owner) | The count and the list are right | Not yet (`projects`) |
| C2 A project ends | The project is over | Move it from ongoing to ended; it is never deleted | The projects shown and the numbers change; the same question about the sentence | The project is in the ended list and the numbers are right | Not yet (`projects`) |
| C3 A project is corrected | A link is dead or a name is wrong | Change the description; change or clear the address | Many old project sites are gone, which is normal | No dead link is left | Not yet (`projects`) |

**Across the roles, and the system**

| Scenario | What it is | In the admin |
|---|---|---|
| X1 A needed person is not in the list | Settled by B5: the theme owner may add people, so there is no hand-off to the administrative staff | Built (B5) |
| X2 Tidying up after a member leaves | Done by A2: the leaver is taken out of the contacts at once, after the confirmation that names the themes | Built (A2) |
| X3 A link has gone dead | Checked on a schedule; each user is shown the broken links of their own area on login: project links to the funded-projects owner, collaborator and people links to the administrative staff, Highlight links to the theme owner | Not yet |
| Y1 Accounts | The administrative staff make an account for a person and choose what it may do; the temporary password is shown once and has to be changed at the first login; they can change, switch off and reset an account | Built |
| Y2 A new research theme | Not done in the admin: a developer adds it to the site, and then the theme owner writes its text | Out of the admin |
| Z "I can't find what I need" | A way to ask for something the scenarios do not cover | Not yet |

Every scenario shares these rules: a link must be `http` or `https`, text has no HTML, and every change is written to the audit log with who made it. Still to come with the theme screens: a text
alternative for each picture and the language of text that is not English.

## Accessibility

The target is WCAG 2.2 level AA. What the code does about it:

- every control has a visible label, "required" is said in words, and an error is in words, tied to its field (`aria-describedby`, `aria-invalid`) and listed in a summary at the top of the form
  that takes the focus when a submit fails;
- every page has one `h1`, a title for the tab, landmarks (banner, main, a labelled navigation) and a skip link; after a page change the focus goes to the new heading;
- messages are announced (`role="alert"` for errors, `role="status"` for the rest); a message that has to be read first takes the focus;
- a question about something hard to undo is the browser's own modal dialog: focus goes in and stays in, Escape cancels, focus returns to what opened it, and it starts on the safe answer;
- colour is never the only signal (badges and errors have words and a sign), text is at least 4.5:1 and the borders of controls and the focus ring at least 3:1 (the values are in
  `src/index.css`), targets are at least 44 px high, links are underlined, nothing moves, and `prefers-reduced-motion` is respected;
- a table has a caption, header cells with a scope, and links that say whose row they belong to ("Change the account of Tom Rossi");
- the layout reflows down to 320 px wide without scrolling the page sideways (only a table may scroll, inside a labelled region).

How it was checked: axe runs on every screen in the tests (which cannot judge colour contrast), and was run again in a real browser, with the real stylesheet and contrast included, on the
login, home, people, add a person, a person, accounts and one account screens, with no violations; reflow was measured at 320 px.

Not checked yet, and needed before the admin is relied on: a manual pass with a screen reader (NVDA, VoiceOver), with the keyboard alone on every flow, with Windows high-contrast mode and
with 200% text size; and the warning before a login ends (the API's idle limit is 2 hours), which does not exist yet.

## Where things are

```
src/
  api/client.js       fetch with the cookie; every refusal becomes one ApiError (code, message, field)
  auth/               who is logged in (AuthProvider, useAuth); the grants decide what is offered
  components/         the small parts: labelled fields, messages, the error summary, the dialog; the layout and the route guards
  pages/              one file per screen
  labels.js           the words for the API's codes (presets, titles, groups, link kinds)
  index.css           the look: the website's typefaces and colours, as tokens, and the parts built from them
test/                 Vitest tests with a stand-in for the API (helpers.jsx)
```
