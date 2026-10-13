# Handoff checklist

For the person who takes the site over (and for the person handing it over). Tick as you go.

## First day

- [ ] `npm install`, `npm run dev`, click through all pages on desktop and on a phone-sized window.
- [ ] `npm run check` passes on your machine.
- [ ] Open <http://localhost:5173/dev/effects> and play with the preview page.
- [ ] Read [ARCHITECTURE.md](ARCHITECTURE.md) (15 minutes) and skim the three HOW-TO documents.
- [ ] Make one small content change (a professor's title), run `npm run check:content`, see it on the page, revert it.
- [ ] Change one number of one header artwork (`SPACING`), see it on the preview page, revert it.

## Accounts and places

- [ ] The GitHub repository (`Ning818/EDA-Website`) - who owns it, who has access. Add the new maintainer as a collaborator, or
      move the repository to the group's organisation.
- [ ] Where the site is built and published, and who can publish. (Not recorded in this repository; write it here once known.)
- [ ] The domain and who manages it.
- [ ] The original 3D / DXF source files of the clouds (`public/models/` holds the exported ones; the editable originals are not
      in the repository - ask the previous maintainer where they are, and write it here).
- [ ] The original logos and photos, and the permission to use them.

## Content still to be filled (the content check lists these as warnings)

- [ ] Bioinformatics, Smart City, Industry 4.0: research texts and funded projects (they show the VLSI-CAD ones).
- [ ] Teaching: PhD students, alumni, administrative clerks (they show the professors).
- [ ] Funded projects: the ended list is placeholder rows; `ONGOING_COUNT` / `ENDED_COUNT` are written by hand and must be
      updated with the lists.
- [ ] The "Highlight thesis" and "Highlight project" cards: real texts and images per theme.

## Known loose ends in the code

Nothing here is broken for visitors, but a new maintainer should know:

- [ ] **Unused components**: `CurveParticles.jsx`, `HighlightBand.jsx`, `YoutubeSpotlight.jsx`, `LinkedInSection.jsx` (the
      last two were replaced by `SocialCopy.jsx`); the thin-line `HelixDecor`, `SkylineDecor`, `FactoryDecor` (kept as the
      reference for the particle versions; the preview page can show them). Delete when you are sure.
- [ ] **Unused dependency**: `@react-three/drei` is listed in `package.json` but not imported anywhere in `src/`.
- [ ] **Unused model files** in `public/models/`: `smart-city9.dxf`, `smart-city10.dxf`, `smart-city11.dxf`, `smart-city12.dxf`,
      `social-media4.dxf`, `social-media-youtube.dxf` (earlier versions; the code loads `smart-city13.dxf`,
      `social-media-youtube2.dxf` and `social-media-linkedin.dxf`). They are downloaded by nobody, but they are in the repository.
- [ ] **Preview switch left in a page**: `Research.jsx` reads `?hl=light` to compare two looks of the thesis card.
- [ ] **Fonts**: the Google Fonts `@import` in `src/index.css` comes after `@import "tailwindcss"` and is dropped from the
      production CSS (the build prints "@import rules must precede all rules"). Check what the published site really renders
      in, and move the import to the first line of the file or load the fonts from `index.html`.
- [ ] **Two lists of themes**: `src/themes.js` and the `THEMES` array in `src/pages/Home.jsx` (scroll lengths, sides). Keep
      them in step.
- [ ] **Home canvas wiring by hand**: see [HOW-TO-ADD-AN-EFFECT.md](HOW-TO-ADD-AN-EFFECT.md) section 2.
- [ ] **No automatic test of the home page**: WebGL needs a browser; test by scrolling.
- [ ] Lint warnings that existed before (`npm run lint`): unused variables and a few React Fast Refresh notes, mostly in
      `src/three/ParticleCanvas.jsx`, `parseDXF.js` and `SocialMediaParticles.jsx`.

## Before you hand it on yourself

- [ ] `npm run check` passes, no failures.
- [ ] The placeholders list above is up to date.
- [ ] The accounts and places section is filled in.
- [ ] Anything you changed in an effect is described in a comment at its top (the existing files do this; keep the habit).
