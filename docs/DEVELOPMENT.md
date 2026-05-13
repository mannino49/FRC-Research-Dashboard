# Development Notes

## Repository Layout

```text
.
├── index.html
├── netlify.toml
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

When Supabase env vars are present, the app requires sign-in and reads/writes Supabase. Without those env vars, it falls back to `src/data/seedData.js`.

Local connected development uses `.env.local`:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1
OPENAI_SCOUT_MODEL=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
GOOGLE_DRIVE_ROOT_FOLDER_ID=
```

Restart `npm run dev` after changing env vars.

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
- `@supabase/supabase-js`

Fonts are still loaded in `index.html` from Google Fonts:

- Newsreader
- JetBrains Mono

## Source Of Truth

`src/` is now the canonical frontend source.

The old `project/` directory is retained as historical prototype reference. New frontend behavior should be added in `src/`, not duplicated into `project/`.

## Current State Management

`App` initializes:

- `projects` and `people` from Supabase when configured
- fallback `projects` and `people` from `src/data/seedData.js`
- page from `localStorage["frc.page"]`
- visual tweaks from inline defaults

Project and collaborator mutations optimistically update local React state and persist to Supabase:

- `patchProject(id, patch)`
- `appendHistory(id, entry)`
- `createProject(project)`
- `savePerson(id, person, mode)`

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
```

Production uses Supabase environment variables in Netlify. The old Netlify Blob functions have been retired.

Required production variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `OPENAI_API_KEY`

Required for Drive sync:

- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `GOOGLE_DRIVE_ROOT_FOLDER_ID`

Optional or workflow-specific:

- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_MODEL`
- `OPENAI_SCOUT_MODEL`

Run Supabase migrations before deploying features that add tables or allowed AI output types.
