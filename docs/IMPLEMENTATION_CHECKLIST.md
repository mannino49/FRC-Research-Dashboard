# Implementation Checklist

This checklist turns the roadmap into an ordered build plan. It assumes the dashboard will move from a static prototype toward a persistent, AI-assisted research operations app.

## Phase 0: Product And Data Decisions

- [x] Decide the canonical frontend source path:
  - Current options: keep editing `index.html`, use `project/` modular files, or convert to a Vite/React app.
  - Decision: convert to Vite/React before heavy feature work.
- [x] Decide canonical data storage:
  - Current options: Netlify Blobs endpoints already in the repo, or Supabase.
  - Decision: use Supabase for auth, relational data, and future agent history.
- [x] Define environment variables for local and production secrets.
  - Decision: browser-safe Supabase values use `VITE_` variables; service role and OpenAI keys stay server-side.
- [x] Decide authentication needs:
  - Decision: private dashboard with authenticated editing first.
- [x] Decide whether AI outputs are transient, saved to project history, saved as draft artifacts, or all three.
  - Decision: save AI generations as draft artifacts first, with controls to promote to notes/history.

See [Phase 0 decisions](PHASE_0_DECISIONS.md) for the proposed choices and rationale.

## Phase 1: App Foundation

- [x] Convert or consolidate the frontend so there is one source of truth.
- [x] Add npm scripts:
  - `dev`
  - `build`
  - `preview`
  - `test`
- [x] Move seed data into structured source files or JSON fixtures.
- [ ] Add basic linting/formatting if the new app structure supports it cleanly.
  - Deferred: Phase 1 now has tests/builds; linting can be added with the next code-quality pass.
- [x] Add a small test setup for data helpers and API clients.
- [x] Document local setup in `docs/DEVELOPMENT.md`.

## Phase 2: Supabase Persistence

- [x] Create Supabase tables for people, projects, links, history entries, notes, and AI outputs.
- [x] Add migrations or SQL setup docs.
- [x] Add a Supabase client module.
- [x] Load people and projects from Supabase on app start.
- [x] Preserve seed-data fallback for first-run or local demo mode.
- [x] Persist project creation.
- [x] Persist project deletion.
- [x] Persist status changes.
- [x] Persist turn changes.
- [x] Persist waiting-on changes.
- [x] Persist history entries.
- [x] Add loading, saving, saved, and error states.
- [x] Add optimistic updates with rollback or retry for failed saves.
- [x] Decide whether to retire or keep the existing Netlify Blob functions.
  - Decision: retired after production moved to Supabase.

## Phase 3: Data Model Expansion

- [x] Add `venueUrl` or first-class venue link support.
- [x] Add project-level `notes` separate from `note`/next action.
- [x] Add person profile links, including Google Scholar.
- [x] Add link editing for projects.
- [x] Replace random project IDs with database-generated IDs or stable UUIDs.
- [x] Add timestamps for created and updated records.
- [x] Add optional tags or domains for future filtering.

## Phase 4: Content Updates

- [x] Add Glenn Fox as a collaborator.
- [x] Add Fernando Rosas as a collaborator.
- [x] Add Michael Mannino Google Scholar link.
  - Added as a Google Scholar search placeholder until exact profile URL is confirmed.
- [x] Add Steven Kotler Google Scholar link.
  - Added as a Google Scholar search placeholder until exact profile URL is confirmed.
- [x] Add Government project.
- [x] Add Psychedelics research project.
- [ ] Confirm type, turn owner, venue, collaborators, next action, and links for each new project.
  - Starter records are in place; final details still need user confirmation.

## Phase 5: Dashboard Features

- [x] Make journal/venue clickable where a venue URL exists.
- [x] Add a dedicated notes section to the project detail panel.
- [ ] Add create/edit/delete behavior for project notes.
- [x] Add project link editing.
- [x] Add collaborator create/edit flow.
- [x] Add project filtering/search beyond the command palette.
- [ ] Add import/export for plug-and-play use.
- [ ] Add configurable people, categories, statuses, and project types.

## Phase 6: AI Agent Features

- [x] Create a server-side AI endpoint so the OpenAI API key is never exposed in the browser.
- [x] Add project-context builder:
  - title
  - type
  - venue
  - collaborators
  - next action
  - notes
  - history
  - links
  - linked research memory
- [x] Add research-memory tables for paper metadata, Drive links, summaries, findings, methods, quotes/notes, and relevance.
- [x] Add project-paper linking in Supabase.
- [x] Add project detail UI for adding and viewing linked paper memory.
- [x] Add manuscript draft/version memory linked to Google Drive.
- [x] Add writing prompts for manuscript status and next paragraph drafting.
- [x] Add external reference search and save-to-memory flow.
- [x] Add Research Drive index table for Drive-wide document search.
- [x] Add server-side Drive sync endpoint for Google Docs and Word docs.
- [x] Add Drive AI page for syncing and asking questions across the indexed Research Drive.
- [x] Include relevant synced Drive context in project-panel AI prompts.
- [ ] Add “Draft abstract” action.
- [x] Add operational suggested prompts:
  - summarize project status
  - recommend next action
  - identify stalled/waiting projects
  - draft collaborator follow-up email
  - turn project history into a progress note
  - flag missing metadata or broken organization
- [ ] Add “Suggest collaborators” action.
- [ ] Add “Suggest paper/project direction” action.
- [x] Add an in-app agent panel for project operations.
- [x] Save AI outputs to the project as draft artifacts or history entries.
- [x] Add regenerate, copy, and save controls for AI outputs.
- [x] Add clear system prompts for each AI workflow.
- [x] Add basic safety and quality constraints:
  - cite uncertainty
  - avoid fabricated publication facts
  - ask for missing details when needed
- [x] Add tests for prompt context assembly and endpoint validation.

## Phase 6B: Drive-Derived Project Intelligence

- [x] Remove or hide the manual `Manuscript versions` section from project detail.
- [x] Remove or hide the manual `Research memory` section from project detail.
- [x] Add compact `Synced Drive context` section to project detail:
  - matched Drive files
  - latest draft guess
  - modified date
  - version guess
  - open-in-Drive link
  - last indexed time
- [x] Add Drive file/project matching review UI.
- [x] Add AI-generated project suggestions from indexed Drive files.
  - `/api/drive-suggest` generates review-only project and update proposals from indexed Drive text and current project records.
- [x] Add approve/reject flow for creating a project from a Drive file.
  - Approve creates the project; leaving the suggestion alone rejects/defer it for now.
- [x] Add approve/reject flow for updating existing project fields from Drive-derived metadata.
  - Approve buttons apply individual suggested patches; leaving them alone rejects/defer them for now.
- [ ] Extract or infer:
  - title
  - likely project/paper name
  - authors/collaborators
  - manuscript status
  - latest version
  - domain/tags
  - abstract/summary
  - references/citations present in the document
  - suggested next action
  - Current implementation infers title/project name, status, domain/tags, summary notes, and next action. Authors/collaborators and references/citations still need richer extraction.
- [x] Add safeguards so AI-created projects are draft suggestions until the user approves them.
  - Drive-derived project records are not persisted until the user clicks `Approve project`.
- [x] Add tests for Drive-to-project matching and suggestion formatting.
- [x] Add persistent approve/dismiss tracking for Drive suggestions.
  - Reviews are stored in `drive_suggestion_reviews` so dismissed/approved suggestions can stay out of the queue.

## Phase 6C: Collaboration Automation

- [x] Add a handoff brief action for “where did we leave off?”
- [x] Add internet-backed collaborator scouting.
  - `/api/collaborator-scout` uses OpenAI web search and returns cited collaborator candidates for approval/review.
- [ ] Add contact/save flow for collaborator candidates.
- [ ] Add dedicated writing handoff panel combining latest draft, handoff brief, and next paragraph.
- [ ] Add tests for live collaborator-scout response formatting when API credentials are available.

## Phase 7: Product Polish

- [x] Create favicon.
- [x] Wire favicon into `index.html` or the app shell.
- [x] Improve empty/loading/error states.
- [x] Check responsive behavior across desktop and mobile widths.
- [x] Add small accessibility pass:
  - real buttons for clickable controls
  - dialog focus behavior
  - keyboard support
  - labels
- [x] Add final README setup instructions.
- [x] Add deployment notes for required environment variables.

## Information Needed From You

- [ ] Supabase project URL.
- [ ] Supabase anon key.
- [ ] Supabase service-role key, if server-side admin operations are needed.
- [ ] Preferred Supabase auth model, if any.
- [ ] OpenAI API key.
- [ ] Preferred OpenAI model for the agent.
- [ ] Google Scholar profile URL for Michael Mannino.
- [ ] Google Scholar profile URL for Steven Kotler.
- [ ] Glenn Fox affiliation/display details.
- [ ] Fernando Rosas affiliation/display details.
- [ ] Government project details.
- [ ] Psychedelics research project details.

## Suggested First Sprint

1. Convert/consolidate the frontend source of truth.
2. Set up Supabase schema and environment config.
3. Load and save projects/people from Supabase.
4. Add the new collaborators and projects.
5. Add notes and clickable venue links.

This sequence gets the dashboard out of prototype state and gives the later AI agent a real data layer to work with.
