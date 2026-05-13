# Project Status

Last updated: 2026-05-13

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
7 files, 23 tests passing
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
2. Verify the new `Synced Drive context` section against production Drive sync data.
3. Add richer Drive-derived project intelligence:
   - detect likely projects from newly synced Drive files
   - suggest project records from manuscript metadata/content
   - let the user approve creation or update of project fields
4. Add contact/save flow for collaborator scout candidates.
5. Add a dedicated writing handoff panel combining latest draft, handoff brief, and next paragraph.

## Phase 5 Preview

Likely next build items:

- Import/export for plug-and-play use.
- Configurable people, categories, statuses, and project types.
- More polished notes and link editing.

## Phase 6 Current State

AI is now centered on the Research Drive index plus project operations:

- Browser sends project context and Supabase session token to `/api/ai`.
- Netlify function verifies the Supabase user before calling OpenAI.
- OpenAI API key remains server-side.
- Suggested prompts cover project status, next action, stalled/waiting checks, collaborator follow-up emails, progress notes, and metadata cleanup.
- Writing prompts cover manuscript status, next paragraph drafting, and reference-search directions.
- Generated outputs are saved to `ai_outputs` as draft artifacts.
- Research memory now stores paper metadata and summaries in Supabase while keeping files and drafts in Google Drive.
- Manuscript memory stores Google Drive draft/version links and writing summaries.
- Drive AI can sync the configured Research Drive into `drive_documents` and answer questions over indexed Google Docs / Word docs.
- Project-panel AI now receives relevant synced Drive documents when filenames/project guesses match the project.
- The manual `Manuscript versions` and `Research memory` sections are now hidden from project detail in favor of Drive-derived context.

## Phase 6B Current State

Drive-derived project intelligence has started:

- Project detail shows a compact `Synced Drive context` section with matched files, latest draft guess, modified/indexed dates, version guess, excerpts, and Drive links.
- Project detail proposes small Drive-derived updates, such as adding the latest Drive link, setting a review next action, or aligning status from version metadata.
- The Drive AI page surfaces inferred project candidates from indexed Drive files.
- `/api/drive-suggest` generates review-only AI project and update proposals from indexed Drive text and current project records.
- Drive-derived project records are not saved until the user approves a suggestion.
- Drive suggestion approvals/dismissals are stored in `drive_suggestion_reviews`.
- Tests cover latest-document selection, duplicate suggestion suppression, approved project creation formatting, non-mutating update suggestions, and Drive suggestion endpoint guards.

Still open for Phase 6B:

- Expand the server-side AI suggestion endpoint to extract authors/collaborators and references/citations from document content.

## Phase 6C Current State

Collaboration automation has started:

- Added a `Where did we leave off?` project action that creates a handoff brief with owner, latest synced document, project state, and next move.
- Added `/api/collaborator-scout`, which uses OpenAI Responses web search to find public collaborator candidates with source URLs.
- Project detail now includes a `Scout collaborators` action and saves scout results to `ai_outputs`.

Still open for Phase 6C:

- Add a contact/save flow for collaborator candidates.
- Add a dedicated writing handoff panel that puts latest draft, handoff brief, and next paragraph in one place.
- Add live API/e2e coverage for collaborator scout response formatting when credentials are available.

## Phase 7 Current State

Product polish pass is complete:

- Added an FRC favicon and wired it into `index.html`.
- Improved Drive empty state, loading/session announcements, auth error alerts, and toast status announcements.
- Converted primary navigation controls from link-like click targets to real buttons.
- Added keyboard support for opening project rows from the project list.
- Added visible focus styles for keyboard navigation.
- Added responsive rules for mobile/tablet layouts across masthead, nav, filters, project rows, slide-over detail, Drive cards, and collaborator forms.
- Expanded README and development docs with local setup and deployment environment variables.

## Current Product Direction

The desired user experience is:

```text
Upload or edit files in Research Drive.
Click Sync Research Drive.
AI understands the indexed Drive contents.
AI can identify the latest draft, summarize it, answer questions, and help create/update project records.
```

Supabase should remain the structured index and audit layer. Google Drive remains the source of truth for documents and version history. The AI should work from the indexed Drive contents and propose project updates rather than requiring manual metadata entry.
