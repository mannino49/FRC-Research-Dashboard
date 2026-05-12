# FRC Research Dashboard

A lightweight research and project dashboard for tracking FRC papers, collaborations, applied projects, collaborators, next actions, and handoffs.

The current app is a Vite/React dashboard backed by Supabase. Browser-side seed data remains as a fallback for unconfigured local development.

## Current Shape

- `src/` is the canonical Vite/React frontend source.
- `src/data/seedData.js` mirrors the live dashboard data as a local fallback.
- `project/` contains the historical Claude Design prototype.
- Supabase is the canonical persistence layer for people, projects, links, and history.
- `netlify.toml` builds the Vite app and publishes `dist`.

## Documentation

- [Project overview](docs/PROJECT_OVERVIEW.md)
- [Development notes](docs/DEVELOPMENT.md)
- [Data model](docs/DATA_MODEL.md)
- [Roadmap notes](docs/ROADMAP.md)
- [Implementation checklist](docs/IMPLEMENTATION_CHECKLIST.md)
- [Phase 0 decisions](docs/PHASE_0_DECISIONS.md)
- [Supabase setup](docs/SUPABASE_SETUP.md)
- [Project status](docs/PROJECT_STATUS.md)

## Local Preview

Install dependencies:

```sh
npm install
```

Run the app:

```sh
npm run dev
```

Then open the local Vite URL, usually `http://localhost:5173`.

## Handoff Context

This repo began as a handoff bundle from Claude Design. The original prototype is still preserved in `project/`, but active development now happens in `src/` and `index.html` is the Vite entry point.
