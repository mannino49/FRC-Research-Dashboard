# Development Notes

## Repository Layout

```text
.
├── index.html
├── netlify.toml
├── netlify/
│   └── functions/
│       ├── people.mjs
│       └── projects.mjs
├── package.json
├── vite.config.js
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   ├── styles.css
│   ├── utils.js
│   ├── utils.test.js
│   ├── components/
│   │   ├── Detail.jsx
│   │   ├── Home.jsx
│   │   ├── Pages.jsx
│   │   └── Palette.jsx
│   └── data/
│       └── seedData.js
└── project/
    └── historical Claude Design prototype files
```

## Running Locally

Install dependencies:

```sh
npm install
```

Start the Vite dev server:

```sh
npm run dev
```

The app will usually be available at:

```text
http://localhost:5173
```

For local API routes, run through Netlify CLI instead of the plain Vite server once the frontend starts calling server functions.

## Scripts

```sh
npm run dev
npm run build
npm run preview
npm run test
```

## Dependencies

The app now uses Vite and React modules instead of CDN-loaded React/Babel scripts.

Runtime/build dependencies:

- React 18
- ReactDOM 18
- Vite
- Vitest
- `@vitejs/plugin-react`
- `@netlify/blobs` for the existing Netlify Functions

Fonts are still loaded in `index.html` from Google Fonts:

- Newsreader
- JetBrains Mono

## Source Of Truth

`src/` is now the canonical frontend source.

The old `project/` directory is retained as historical prototype reference. New frontend behavior should be added in `src/`, not duplicated into `project/`.

## Current State Management

`App` initializes:

- `projects` from `src/data/seedData.js`
- `people` from `src/data/seedData.js`
- page from `localStorage["frc.page"]`
- visual tweaks from inline defaults

Project mutations are still local React state updates:

- `patchProject(id, patch)`
- `appendHistory(id, entry)`
- `createProject(project)`

These functions do not yet call Supabase. That begins in Phase 2.

## Keyboard Shortcuts

- `Cmd/Ctrl+K`: open command palette
- `Escape`: close project detail panel or command palette
- `g h`: go to Projects
- `g n`: go to New project
- `g c`: go to Collaborators

## Deployment

`netlify.toml` builds the Vite app and publishes `dist`:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"
```

The existing Netlify Functions remain available, but Phase 2 will move canonical persistence to Supabase.
