# Project Status

Last updated: 2026-05-12

## Current State

The FRC Research Dashboard has been migrated from a static Claude Design prototype into a Vite/React app backed by Supabase.

Canonical frontend source is now:

```text
src/
```

The original prototype remains in:

```text
project/
```

Use `src/` for all new development.

## Confirmed Architecture Decisions

- Frontend: Vite + React.
- Data store: Supabase.
- Auth: Supabase Auth, private dashboard with authenticated editing.
- Paper files: keep drafts, PDFs, and Drive-native version history in Google Drive; use Supabase as the structured dashboard index and workflow state.
- AI: OpenAI calls must happen server-side only.
- AI outputs: save as draft artifacts first, with controls to promote into notes/history later.

## Completed Phases

### Phase 0: Decisions

Complete.

Decision record:

```text
docs/PHASE_0_DECISIONS.md
```

### Phase 1: App Foundation

Complete.

Implemented:

- Vite/React structure.
- `src/` source of truth.
- npm scripts: `dev`, `build`, `preview`, `test`.
- Seed data moved into `src/data/seedData.js`.
- Starter tests added.
- Netlify build now publishes `dist`.

### Phase 2: Supabase Persistence Foundation

Complete and connected in production.

Implemented:

- Supabase client.
- Auth gate.
- Dashboard repository.
- Seed-data fallback when Supabase env vars are missing.
- Load/save path for people/projects.
- Persist project creation, deletion, updates, and history entries.
- Persist collaborator creation and updates.
- Supabase schema and setup docs.
- Netlify production build uses Supabase environment variables.
- Legacy Netlify Blob functions have been retired.

### Phase 3: Data Model Expansion

Complete.

Implemented:

- `venueUrl` / clickable venues.
- Long-form project `notes`, separate from next action.
- Person `scholarUrl`.
- Project link add/remove UI.
- UUIDs for new projects.
- Project timestamps.
- Domain and tags.
- Supabase schema updates for these fields.

### Phase 4: Content Updates

Complete as starter content.

Added:

- Glenn Fox collaborator.
- Fernando E. Rosas collaborator.
- Michael Mannino Google Scholar search placeholder.
- Steven Kotler Google Scholar search placeholder.
- Government AI Governance and Human Performance Project.
- Psychedelics, Flow, and Information Dynamics project.

Still needs user confirmation:

- Exact Google Scholar profile URLs for Mannino and Kotler.
- Final affiliations/display names for Glenn Fox and Fernando Rosas.
- Final type, owner, venue, links, collaborators, and next action for the two new projects.

## Current Verification

Latest checks passed:

```sh
npm run test
npm run build
```

Current test count:

```text
2 files, 4 tests passing
```

Known npm note:

```text
npm install reports 4 moderate vulnerabilities.
```

Do not run `npm audit fix --force` casually; it may introduce breaking dependency upgrades.

## Important Files

```text
src/App.jsx
src/components/AuthGate.jsx
src/components/Detail.jsx
src/components/Home.jsx
src/components/Pages.jsx
src/components/Palette.jsx
src/data/seedData.js
src/lib/dashboardRepository.js
src/lib/supabaseClient.js
src/styles.css
supabase/schema.sql
docs/IMPLEMENTATION_CHECKLIST.md
docs/SUPABASE_SETUP.md
docs/DATA_MODEL.md
```

## Environment

Example env file:

```text
.env.example
```

Local secrets should go in:

```text
.env.local
```

Do not commit `.env` or `.env.local`.

## Recommended Next Steps

1. Verify production login and edit persistence for both dashboard users.
2. Continue Phase 5 dashboard features.
3. Add import/export for plug-and-play use.
4. Add server-side AI endpoints and draft artifact workflows.

## Phase 5 Preview

Likely next build items:

- Import/export for plug-and-play use.
- Configurable people, categories, statuses, and project types.
- More polished notes and link editing.
