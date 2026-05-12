# Phase 0 Decisions

Phase 0 resolves the architectural choices that everything else depends on. The goal is to avoid building persistence, AI features, and new UI on top of the current split prototype structure.

## Decision 1: Canonical Frontend Source

**Recommendation: convert to a Vite/React app.**

Current state:

- `index.html` is the deployable root file.
- `project/Research Dashboard.html` plus `project/*.jsx`, `project/*.js`, and `project/styles.css` are the modular prototype files.
- The two versions can drift because there is no build step.

Recommended target:

- Move React components into `src/`.
- Move styles into `src/styles.css` or component-specific CSS files.
- Move seed data into `src/data/seedData.js` or JSON fixtures.
- Generate production assets with `npm run build`.
- Keep `project/` as historical prototype reference until the migration is complete.

Rationale:

- Makes feature work safer.
- Gives us environment variables, builds, tests, and module imports.
- Makes Supabase and OpenAI integration much cleaner.
- Removes the need to manually sync `index.html` with modular files.

## Decision 2: Canonical Data Store

**Recommendation: use Supabase as the canonical app database.**

Current state:

- Netlify Functions exist for `/api/projects` and `/api/people`.
- They store whole JSON blobs in Netlify Blobs.
- The frontend does not currently call them.

Recommended target:

- Supabase stores people, projects, project links, history entries, notes, and AI outputs.
- Frontend reads/writes through a typed data access layer.
- Server-side endpoints handle privileged operations and AI calls.
- Existing Netlify Blob functions can be removed or kept temporarily as reference.

Rationale:

- Supabase fits relational project data better than whole-blob replacement.
- Auth can be added without inventing it.
- AI outputs, notes, and project history can be queried independently.
- Future filtering, collaborator pages, and agent memory become easier.

## Decision 3: Secrets And Environment Variables

**Recommendation: keep browser-safe keys in frontend env vars and private keys only on the server.**

Expected local variables:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
OPENAI_MODEL=
```

Rules:

- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` may be exposed to the browser.
- `SUPABASE_SERVICE_ROLE_KEY` must stay server-side only.
- `OPENAI_API_KEY` must stay server-side only.
- The frontend should call our own AI endpoint, never OpenAI directly.

## Decision 4: Authentication Model

**Recommendation for first implementation: private dashboard with authenticated editing.**

Possible target:

- Supabase Auth protects the dashboard.
- Authenticated users can read and edit all records.
- More granular roles can wait until the app has more users.

Open decision:

- Should the whole dashboard require login, or should read access be public/private-link with editing restricted?

## Decision 5: AI Output Storage

**Recommendation: save AI outputs as draft artifacts, with an option to promote them into notes/history.**

Possible data model:

- `ai_outputs` table stores generated abstracts, outlines, collaborator suggestions, and project-direction suggestions.
- Each output belongs to a project or person.
- The user can copy, regenerate, save as project note, or append to project history.

Rationale:

- Keeps generated text available without polluting the project timeline.
- Lets us distinguish human updates from AI drafts.
- Makes future agent memory and review easier.

## Phase 0 Decisions Confirmed

Confirmed direction:

- [x] Convert the app to Vite/React as the canonical frontend.
- [x] Use Supabase as canonical storage.
- [x] Require login for the dashboard, at least for editing.
- [x] Store AI generations as draft artifacts first.
- [x] Use server-side endpoints for OpenAI calls.

## Immediate Next Step After Confirmation

Start Phase 1 by creating the Vite/React app structure, migrating the existing UI into `src/`, and preserving the current visual design before adding new behavior.
