# EDA Group admin

The interface the group's staff use to keep the EDA Group website up to date: add and correct people (a member who leaves is a change of title), keep the theme pages, the funded projects, the collaborations, the footer numbers and the page introductions, and manage the accounts of those who may do so. It is a front-end
application of its own, written in React, and it talks to the API in `../backend` over HTTP. All of its text is English.

## A separate application

The website (`../frontend`), the API (`../backend`) and this admin are three different, isolated applications that share one repository for simplicity. So:

- this folder has its own `package.json`, build, settings and port (5174); it is never built into the website and nothing of it is in `../frontend`;
- it imports nothing from `../frontend`, and the website imports nothing from here; the look of the website (its two typefaces and its colours) is copied into `src/index.css`, not shared;
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
| People, a person, Add a new person | `people_add`, `people_edit` | find a person; add one (a user who keeps theme pages chooses the research area to list them under; with a photo that needs the confirmation that the person agreed, and a warning about a name that is there already); correct one, a change of title to Former member included (a member who leaves), after seeing which themes lose a contact; delete one added by mistake (grant `people_delete`, or the one who added the person, for 24 hours), after seeing what goes with them |
| Accounts, Make a new account, one account | `accounts` | make an account with a temporary password shown once; change the name or what the account may do; switch it off or on; give a new temporary password |
| Themes, a theme, Change the words, Change the contacts, Research areas, a research area, Highlight paper, Highlight project | `theme` | the themes the user keeps; for each, its words (name, short name, home-page paragraph, introduction), its contacts, its research areas in order, and its two highlight cards. Contacts and the involved people of an area are chosen from the People list with a search, each with buttons to move it up or down and to take it out, and every change is also said in words; a Former member is not offered as a contact. An area has its title, its topics (change, move, remove, add) and its involved people, and can be removed after seeing what goes with it. A highlight card is typed by hand with a picture that needs its text alternative. A theme the developer has made but not yet put on the website is marked "Not on the website yet" in the list and on its page: it can be written, and no visitor can read it |
| Funded projects, a project, Add a project | `projects` | the projects of every theme, ongoing and ended, with a search; add one, with the language of its description (English, Italian, French, German or Spanish, so that the website marks a description that is not English and a screen reader reads it right); correct one; mark one as ended (a project is never deleted). After a project is added, ended or changed (its address alone does not count) the admin asks whether the theme's Guided Introduction (the paragraph in the Funded projects card of its Research page) still fits, with the projects next to it; that text is written by hand and can be opened from the list at any time |
| Collaborations, a collaborator, Add a collaborator, a joint project, Add a joint project | `site` | the three logo walls and the joint projects of the Collaborations page; add, correct and remove a collaborator, which needs a logo (required when adding, replaced but never taken away; checked, made smaller and kept as a PNG where it is transparent); add, correct and remove a joint project, with its other partners one to a line; a name or code that is taken is put at its field |
| Broken links | `people_edit`, `site`, `projects` or `theme` | the links that stopped working in the content the user keeps, each with the address, what the check got back (such as 404 Not Found), how many checks in a row it failed, a link to the page where the content is changed, and a button that checks that one link again; the Home page counts them. A link is reported only after several failed checks, so a short outage does not show here |
| I can't find what I need | everyone with a grant | a link at the foot of every page except this one (and not for the developer, who is the one who answers); a box to say what is needed (it records the page the user came from), and the user's own requests with the answers of the developer |
| Requests | `system` (the developer) | the requests that wait for an answer and the ones answered; a dialog to answer one and mark it as answered; the Home page counts the waiting ones |
| Activity log | `system` | who changed what and when, newest first, 50 entries at a time with a button for older ones; narrowed to one kind of action or one user; the values before and after open under each entry; nothing here can be changed |
| System status | `system` | the check of the links (last run, counts, a warning when it has not run for 3 days or never, and a table of the four kinds of link with who keeps each, how many failed and how many are reported, and a mark where no active account keeps them), the database and its version, the uploaded files, the accounts and the size of the content; the Home page warns when the check has stopped, and says how many requests wait (the requests have their own page) |
| Site text, Footer numbers, Page introductions | `site` | the footer's phone and fax numbers, checked for being phone numbers and showing what the phone link dials; the paragraph under the title of the People page and of the Collaborations page, each saved on its own, with its length |

The warning before a login ends and the request for what no screen covers are built (see below).

What a user sees is decided by the grants the API sends with `GET /api/auth/me`; the API checks them again on every request, so hiding a screen is only a convenience.

## The scenarios it serves

The admin is designed from the internal scenarios: who has to keep which part of the site up to date, what sets it off, and what has to be right afterwards. There are four kinds of user,
and what each may do is a set of grants (`../backend/README.md`, "Who may do what"):

| User | Preset | May |
|---|---|---|
| Administrative staff | `administrative` | add, correct and delete people (`people_add`, `people_edit`, `people_delete`); the collaborators, the joint projects, the footer numbers and the page introductions (`site`); make and change accounts (`accounts`) |
| Theme content owner (one person, all themes) | `theme-owner` | add people (`people_add`); edit the theme pages (`theme`) |
| Funded-projects owner (one person) | `projects-owner` | keep the funded projects (`projects`) |
| Developer | `developer` | answer the requests, read the activity log and see how the system is doing (`system`); all of it only reads and answers, nothing of the content can be changed with it |

Every account has one of these four: an account that may do nothing is not made, and an account that is no longer needed is switched off. Everyone who has a grant (the developer apart, who answers) can also ask for what no screen
covers (Z). What the developer does with the command line, and not in this admin, is written in D4.

"Built" below means the screen exists in this admin and is tested; no real user has tried it yet. How often each scenario happens, and what a mistake costs, are not written here: that has to
come from the group.

**A. Administrative staff**

| Scenario | Trigger | What is done | What follows, what can go wrong | Done when | In the admin |
|---|---|---|---|---|---|
| A1 A new member | A professor, researcher or student joins | Enter the name, title, photo and links, and how the name is written on the small cards | The group comes from the title; a theme can only name the person once they are in the list; a wrong or unsafe link; the photo needs the person's agreement; a name that is in the list already | The People page shows the person in the right group, with a working photo and links | Built |
| A2 A member changes (a promotion, a new photo or link, leaving) | The person's situation changes | Change the title, photo or links. A member who leaves gets the title Former member: they are never deleted | A new title can move the person to another group, change their order and the short title on the small cards; the wrong person can be changed. A leaver is taken out of the contacts ("Refer to") of every theme: the admin says which themes lose a contact and asks to confirm, and a theme left with none shows no Refer to section. They stay in the research topics, as a former member | The new title is on every small card. A leaver is in the Former members group, last, and no theme names them as a contact | Built |
| A3 A member added by mistake | Someone was added who should not be there | Delete the person, after seeing which contacts and topics they are in | It also takes them out of those lists, so it is not for a member who left (A2); the deletion is written in the log and the photo is removed. The user who added the person may delete them too, for 24 hours | The person and their photo are gone and nothing else changed | Built |
| A4 A collaboration changes | A collaboration starts or ends | Add, change or remove collaborators (kind, name, address, and a logo, which is required) and joint projects (code, name, funding, years, coordinator, other partners, link) | The logo has to be fit for use and the right size; links go stale, and the check of the links (X3) lists the ones that have stopped working | The Collaborations page shows the right logo wall and project list | Built |
| A5 The footer numbers change | The phone or fax number changes | Change the two numbers; either may be left empty | A wrong number is dialled by visitors | The footer shows the right numbers and the link dials | Built |
| A6 An introduction changes | The wording should change | Change the paragraph under the title of the People or Collaborations page | No HTML; a long text breaks the layout | The page shows the new text | Built |

**B. Theme content owner**

| Scenario | Trigger | What is done | What follows, what can go wrong | Done when | In the admin |
|---|---|---|---|---|---|
| B1 A research direction changes | A new direction, or topics are regrouped | Add or change research areas and the topics under them, choosing the people involved from the People list | A person who is needed may not be in the list yet (B5) | The theme's research topics and involved people are right | Built |
| B2 A new representative paper or project | There is something new to show | Replace a Highlight card; everything is typed by hand: title, authors (full names and short forms), venue, keywords, summary, link, picture | Picture rights and size; the picture needs a text alternative; nothing is read from IRIS | The card is replaced and the authors' short forms are right on a phone | Built |
| B3 A theme is reworded | The name or the introduction changes | Change the name, the short name, the home-page text and the introduction of the theme page | The navigation, the page titles, the home page and the section dots follow; a long name can break the navigation. The colours and the background drawing are in the code, not here. A theme the developer has made but not yet put on the website (D4) is marked "Not on the website yet" here: it can be written, and no visitor can read it until it is put on the site | The name is the same everywhere | Built |
| B4 The contacts change | A contact person changes | Choose the "Refer to" contacts from the People list and put them in order | Not a former member (a leaver is taken out by the admin, A2); the section disappears when no contact is left | The contact cards are right | Built |
| B5 A person a theme needs is not in the list | B1 or B4 needs someone who has not been added | Add the person (name, title, photo with the agreement, links) and choose the research area they are listed under; they show at once on the People page and under that area's "Involved people", with no review | A mistake can be corrected or deleted for 24 hours; after that only the administrative staff can. A name in the list already is warned about | The person can be chosen straight away, without asking anyone | Built |

**C. Funded-projects owner**

| Scenario | Trigger | What is done | What follows, what can go wrong | Done when | In the admin |
|---|---|---|---|---|---|
| C1 A new project starts | A new funding is won | Choose the theme, mark it ongoing, enter the code (may be empty), the full name, the language of the name when it is not English, and the address (may be empty) | The wrong theme; a name that is not in English has to say its language, or a screen reader reads it in English; the counts at the top of the page recount themselves; the admin then asks whether the theme's Guided Introduction needs changing (it is written by hand, by this owner) | The count and the list are right | Built |
| C2 A project ends | The project is over | Move it from ongoing to ended; it is never deleted | The projects shown and the numbers change; the same question about the Guided Introduction | The project is in the ended list and the numbers are right | Built |
| C3 A project is corrected | A link is dead or a name is wrong | Change the description or its language; change or clear the address | Many old project sites are gone, which is normal; the check of the links (X3) lists them | No dead link is left | Built |

**D. Developer**

| Scenario | Trigger | What is done | What follows, what can go wrong | Done when | In the admin |
|---|---|---|---|---|---|
| D1 A request arrives (the other end of Z) | Someone could not find or do what they needed and wrote it down; the Home page says how many wait | Read the request (who asked, the page they came from, what they wrote), do what it asks or say why it cannot be done, write an answer and mark the request as answered | Nothing is sent by email, so the Home page and the navigation are the only notice; a request is answered once and then stays; a user has at most five waiting. What no screen covers is something only the developer can build or change | The person reads the answer on the page where they asked | Built |
| D2 A change has to be traced | A mistake, or the question "who changed this?" | Open the activity log, narrow it to one kind of action or one person, and open an entry to see the values before and after | The log is only read: nothing in it can be changed. It never shows a password or its hash. What was done from the command line is there too, as "(command line)" | The change and who made it are found | Built |
| D3 The system is looked at | From time to time, or because the Home page warns | Open the system status: when the check of the links last ran, how the links stand for each of the four kinds and who keeps them, the database and its version, the uploaded files, the accounts and the size of the content | The check of the links runs from the host's scheduler and nothing else would notice that it stopped, so a check that has not run for three days, or never, is a warning. A kind of link that no active account keeps is marked: a failing link there has no one to mend it | Nothing is flagged, or what is wrong is known | Built |
| D4 A new research theme | The group decides on a new direction | **Command line and code, not this admin:** make the theme in the database (`python -m app.manage create-theme`), let the staff write it in the admin (B1 to B5, C1 to C3) while the public cannot see it, then build its look, cloud and place in the home page animation in the front end, release it and put it on the website (`python -m app.manage set-theme-live`) | The theme starts off the website: the public API does not know it, so nothing half written can be read; the website draws a theme only when its template is in the code. The last theme on the site cannot be taken off. No code or particle file is ever uploaded through the admin. The steps are in the root README | The theme is on the website with its content already written | The command line makes and releases it; the admin marks it "Not on the website yet" and the staff write it |

**Across the roles, and the system**

| Scenario | What it is | In the admin |
|---|---|---|
| X1 A needed person is not in the list | Settled by B5: the theme owner may add people, so there is no hand-off to the administrative staff | Built (B5) |
| X2 Tidying up after a member leaves | Done by A2: the leaver is taken out of the contacts at once, after the confirmation that names the themes | Built (A2) |
| X3 A link has gone dead | Every link of the content is checked on a schedule (`python -m app.manage check-links`, run once a day by the host). A link is reported only after it has failed three checks in a row, so a site that is down for a night raises no alarm; a site that refuses programs is never counted as broken. Each user is shown the broken links of their own area (project links to the funded-projects owner, collaborator, joint-project and people links to the administrative staff, Highlight links to the theme owner), with a count on the Home page, a way to the place where it is changed and a button to check that one again. The developer sees the counts by who keeps them (D3) | Built |
| X4 The login ends | After two hours of doing nothing, or twelve hours after the login whatever is done, the login ends. Five minutes before, a dialog says when: for the idle limit it offers to stay logged in, for the twelve hours, which cannot be extended, it asks to save and log in again. It sits over the page, so a half-filled form is not lost. After a logout, whoever logs in next starts at the home page; after a login that ended by itself, only the same person is taken back to their page | Built |
| Y1 Accounts | The administrative staff make an account for a person and choose one of the four kinds (administrative staff, theme owner, projects owner, developer); the temporary password is shown once and has to be changed at the first login; they can change what an account may do, switch it off and on, and give a new temporary password. An account always has one of the kinds and an account that is not needed is switched off; nobody can change what their own account may do or switch it off, and the last account that can manage accounts is always kept | Built |
| Y2 A new research theme | Not done in the admin: the developer makes and releases it, and the staff write it in between (D4) | Command line, see D4 |
| Z "I can't find what I need" | A way to ask for something the scenarios do not cover. Anyone with a grant writes what they need from a link at the foot of every page (it records the page they came from), reads the answers on the same page, and can have five waiting at most. The developer reads and answers (D1) | Built |

Every scenario shares these rules: a link must be `http` or `https`, text has no HTML, and every change is written to the audit log with who made it (the developer reads it, D2). A picture has a
text alternative (B2), and the language of a project's description is said when it is not English (C1); the other texts are all English. A page that breaks shows a message and a way back to the
home page instead of a blank screen.

## The look

The typefaces (Poppins for headings, names and actions; Roboto for reading text) and the colours are the website's. So is the **type scale**: the same named roles with the same sizes, in rem so
that they follow the user's own text size, and in three steps (phone, below 768px; tablet and small laptop, 768 to 1199px; wide desktop, 1200px and up). It is defined at the top of
`src/index.css`, together with what each role is used for, and nothing else in the stylesheet sets a font size. The admin shares no code with the website, so the two copies are kept in step by hand.

| Role | Size (phone / tablet / desktop) | Used for |
|---|---|---|
| `type-h1` | 36 / 44 / 48 px | the page title |
| `type-h2` | 28 / 32 / 32 px | a theme's name on the list of funded projects |
| `type-h3` | 20 / 24 / 24 px | the title of a panel (every `h2`), the title of a task card, the Ongoing and Ended headings of the projects |
| `type-name` | 18 px | a sub-section (every `h3`), a table caption, the title of a message, a name in a list |
| `type-lead` | 18 / 20 / 20 px | the summary under the page title |
| `type-compact` | 16 px | all running text, and what is typed in the fields |
| `type-action` | 16 px | labels, buttons, the links of the navigation, table headings |
| `type-meta` | 14 px | hints, counts, badges |
| `type-brand` | 20 px | the name by the logo |
| `type-stat-sm` | 28 / 32 / 32 px | the initials that stand for a missing photo |

On a desktop screen (1280px and wider) the content of every page after the login keeps 240px from the sides of the screen, and the navigation 40px; the two are chosen so that the left edge of
the content lines up with the first link of the navigation. Below that the pages use the full width, and the layout reflows down to 320px.

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
login, home, people, add a person, a person, accounts and one account screens, and later on the site text, footer numbers, page introductions, collaborations, a collaborator, adding a collaborator
and adding a joint project screens, with no violations; reflow was measured at 320 px. The funded-projects screens were run through axe in the tests only, not yet in a real browser. The theme screens (a theme, its words, its contacts, its research areas, a research area and a highlight card) were run in a real browser too, with no violations.

Not checked yet, and needed before the admin is relied on: a manual pass with a screen reader (NVDA, VoiceOver), with the keyboard alone on every flow, with Windows high-contrast mode and
with 200% text size.

**What a page remembers in its address.** What the People and the Funded projects pages are searched for (`/people?q=sara`) and what the Activity log is filtered by (`/audit?action=person.&user=ada`) is in the address, so that a reload, the back button and a link bring it back; typing changes the address in place and adds no history entries. Not in the address: how far down the Activity log the reader has gone ("Show older entries"), and what is typed in a form.

**A page that breaks.** If a page cannot be drawn (for example an answer of the API it did not expect), the frame stays and the page area says "Something went wrong on this page" with a way back to the home page, announced at once, instead of a blank screen; going to another page starts again (`ErrorBoundary.jsx`).

**The warning before a login ends.** The API says how long a login lasts (2 hours without a request, 12 hours at most). Five minutes before the earliest of the two, a dialog says when the login ends: when it is the idle limit it offers "Stay logged in" (which asks the server who is logged in, and so starts the time again) or "Not now"; when it is the 12-hour limit, which nothing can extend, it says so and asks the user to save and log in again, with "Keep working" or "Log out now". It sits on top of the page, so a form half filled is not lost, and the time is checked every few seconds and when the tab is shown again (a laptop that slept).

## Where things are

```
src/
  api/client.js       fetch with the cookie; every refusal becomes one ApiError (code, message, field)
  auth/               who is logged in (AuthProvider, useAuth); the grants decide what is offered
  components/         the small parts: labelled fields, messages, the error summary, the dialog; the forms; the layout and the route guards
  useForm.js          what every form has: values, errors tied to fields, the failure, the busy state, and how a refusal of the API is put at its field
  pages/              one file per screen
  labels.js           the words for the API's codes (presets, titles, groups, link kinds)
  index.css           the look: the website's typefaces and colours, as tokens, and the parts built from them
test/                 Vitest tests with a stand-in for the API (helpers.jsx)
```
