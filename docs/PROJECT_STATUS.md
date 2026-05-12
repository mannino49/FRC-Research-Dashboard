# Project Status

Last updated: 2026-05-12

## Current State

The FRC Research Dashboard has been migrated from a static Claude Design prototype into a Vite/React app.

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

Complete in code, not connected to a live Supabase project yet.

Implemented:

- Supabase client.
- Auth gate.
- Dashboard repository.
- Seed-data fallback when Supabase env vars are missing.
- Load/save path for people/projects.
- Persist project creation, project updates, and history entries.
- Supabase schema and setup docs.

Needs live credentials before verification against Supabase:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- Supabase user account
- optionally `SUPABASE_SERVICE_ROLE_KEY`

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

## Current Git State

Last pushed commit before Phase 2-4 work:

```text
f697ce0 Set up Vite app foundation
```

Phase 2, Phase 3, and Phase 4 changes are currently local unless committed/pushed after this status file was written.

## Recommended Next Steps

1. Commit and push Phase 2-4 plus this status file.
2. Connect a real Supabase project.
3. Run `supabase/schema.sql` in Supabase.
4. Create a dashboard user in Supabase Auth.
5. Add `.env.local`.
6. Seed Supabase from `src/data/seedData.js`.
7. Verify login, loading, creation, updates, history, notes, links, and seed fallback.
8. Continue to Phase 5: dashboard features.

## Phase 5 Preview

Likely next build items:

- Dedicated create/edit collaborator flow.
- Better project filtering/search beyond command palette.
- Import/export for plug-and-play use.
- Configurable people, categories, statuses, and project types.
- More polished notes and link editing.
