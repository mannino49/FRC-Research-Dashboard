# Project Overview

## Purpose

The FRC Research Dashboard is a compact internal dashboard for managing active research work. It emphasizes handoffs, collaborator status, project state, and the next action for each item.

The product concept is closer to an editorial desk or academic project ledger than a generic task manager. The UI uses a dark, warm, newspaper-like visual system with serif typography, compact metadata, and keyboard-driven navigation.

## Primary Workflows

1. Review all active projects.
2. Group projects by turn, status, type, or flat list.
3. Open a project detail panel.
4. Change project status.
5. Pass the turn to another collaborator.
6. Add a note/update that becomes the latest next action.
7. Review collaborators and the projects associated with them.
8. Create a new project seed.
9. Jump quickly using the command palette.

## Screens

- **Projects**: summary metrics, grouping controls, and project list.
- **Collaborators**: internal/external collaborator directory with add/edit controls and related active projects.
- **New project**: lightweight creation form.
- **Project detail panel**: slide-over with facts, links, next action, note composer, and history.
- **Command palette**: `Cmd/Ctrl+K` navigation across pages and projects.
- **Tweaks panel**: available when edit mode is activated by the embedding parent frame.

## Architecture At A Glance

The current frontend is intentionally simple:

- React 18 runs through Vite.
- Application state lives in React state and persists through Supabase.
- Fallback seed data lives in `src/data/seedData.js`.
- Helper functions and components are module imports.
- Page routing is internal state, persisted only as `localStorage["frc.page"]`.

There are two representations:

- `src/` is the canonical Vite/React app source.
- `project/Research Dashboard.html` plus imported modular files are retained as historical prototype reference.

New frontend behavior should be added in `src/`.

## Backend Status

Supabase is the canonical production data store.

- Supabase Auth gates dashboard access.
- `people`, `projects`, `project_links`, and `project_history` are read and written by the frontend data repository.
- `project_notes` and `ai_outputs` are prepared for later workflows.
- The old Netlify Blob functions have been retired.

## Notable Gaps

- There is only a starter helper test suite so far.
- New projects use UUIDs.
- Links are placeholders in seed data.
- Project notes are still a single project-level field; threaded notes are not built yet.

## Likely Next Additions

- Continue extending the canonical Vite/React source path.
- Add filtering/search beyond the command palette.
- Add a small test suite around data transforms and persistence calls.
