# Roadmap Notes

This document organizes the first batch of raw feature notes into clearer product areas. Some items are ready to implement; others need one decision before building.

## Content And Data Updates

### Add Collaborators

Add these people to the collaborator directory:

- Glenn Fox
- Fernando Rosas

Open question: confirm affiliations and preferred display names.

### Add Projects

Add these project records:

- Government project
- Psychedelics research

Open questions:

- Are these papers, collaborations, or applied projects?
- Who owns the next turn?
- What venue or destination should each use?
- What is the first next action?

### Add Google Scholar Links

Add Google Scholar links for:

- Michael Mannino
- Steven Kotler

Open question: confirm the exact profile URLs.

## Project Detail Enhancements

### Click Into Journal/Venue

The note “Be able to click in journal” likely means the venue/journal field should become actionable.

Possible implementation:

- Add a `venueUrl` or `links` entry for journal/venue.
- Make the venue name clickable in the project row and detail panel when a URL exists.

### Add Notes Section

Add a richer notes area beyond the current single “Next action” and history list.

Possible implementation:

- Add project-level freeform notes.
- Keep history as timeline/activity.
- Keep `note` as the next action.
- Add a dedicated `notes` field for longer working notes.

## AI-Assisted Workflows

### Draft Outline Or Abstract

Add an AI action that drafts an outline or abstract for a selected project.

Possible implementation:

- Button in project detail panel: “Draft outline” or “Draft abstract”.
- Use project title, venue, type, collaborators, current note, and history as context.
- Store generated text as a note, draft artifact, or copyable output.

### Suggest Collaborators And Papers

The notes “Ask AI who to collab and what paper” and “Ask agent who” likely point to a recommendation workflow.

Possible implementation:

- For a project idea, ask AI to suggest collaborators.
- For a collaborator, ask AI to suggest possible paper/project directions.
- Output should include rationale and next action.

### Create An Agent

This likely means adding an agent-style assistant inside the dashboard for research/project operations.

Possible roles:

- Research planning agent
- Literature/project scout
- Outline/abstract drafting agent
- Dashboard maintenance agent

Open question: should this be an in-app feature, an external automation, or both?

## Product Polish

### Create Favicon

Create and wire a favicon for the dashboard.

Possible directions:

- Minimal FRC monogram.
- Newspaper/ledger-inspired mark.
- Academic serif `FRC` lockup.

### Plug And Play

This likely means making the dashboard easier to reuse or configure.

Possible implementation:

- Move seed data into editable JSON.
- Add documented setup steps.
- Add import/export.
- Add environment-driven configuration for people, links, and project categories.

## Highest-Leverage Build Order

1. Decide where canonical data should live and wire persistence.
2. Add collaborator and project records.
3. Add venue/journal links and Google Scholar links.
4. Add a notes section.
5. Add favicon.
6. Add AI draft/recommendation workflow.
7. Package the dashboard to be more plug-and-play.

The first item matters because many later features depend on persistent data rather than the current in-memory seed data.
