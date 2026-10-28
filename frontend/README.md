# EDA Group website (the public front end)

The pages visitors read: Home, People, Research and Funded Projects, Collaborations. React with Vite and Tailwind; the three-dimensional particle models on the home page and in the page
headers are drawn with Three.js.

What the pages say - the people, the themes' words, research areas and projects, the collaborators - comes from the API (`../backend`); what a theme looks like (colour, header artwork, addresses)
is in `src/themes.js`. The site only reads from the API.

```bash
npm install
npm run dev      # http://localhost:5173
npm run lint
npm run build    # the files to serve, in dist/
```

The dev server (`vite.config.js`) forwards `/api` and `/media` to the API on port 8001, so a phone on the same network needs only this computer's address.

This is one of three applications in the repository; see the [`README.md`](../README.md) at its root.
