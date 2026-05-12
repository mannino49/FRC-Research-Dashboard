# Data Model

## People

People are stored as an object map keyed by initials or short IDs.

```js
{
  MM: {
    initials: "MM",
    name: "Michael Mannino",
    kind: "internal",
    scholarUrl: "https://scholar.google.com/..."
  },
  KF: {
    initials: "KF",
    name: "Karl Friston",
    kind: "external",
    affil: "UCL, Queen Square"
  }
}
```

### Fields

- `initials`: short display label.
- `name`: full display name.
- `kind`: `internal` or `external`.
- `affil`: external collaborator affiliation. Optional for internal people.
- `scholarUrl`: optional Google Scholar profile URL.
  - Temporary search URLs are acceptable as placeholders, but exact profile URLs are preferred.
- `createdAt`: database timestamp.
- `updatedAt`: database timestamp.

## Projects

Projects are stored as an array.

```js
{
  id: "p01",
  title: "Active Inference and the Flow State",
  type: "paper",
  status: "In review",
  turn: "MM",
  venue: "Neuroscience of Consciousness",
  venueUrl: "https://academic.oup.com/nc",
  domain: "consciousness",
  tags: ["active inference", "flow"],
  updated: "2026-04-16",
  note: "Revise section 3...",
  notes: "Longer project memory...",
  waitingOn: null,
  coauthors: ["KF"],
  links: [
    { kind: "Overleaf", url: "#" }
  ],
  papers: [
    {
      title: "Flow and Attention Review",
      authors: "Example Author",
      year: 2024,
      driveUrl: "https://drive.google.com/...",
      abstract: "Short summary...",
      keyFindings: "Useful findings...",
      relevance: "Why it matters here..."
    }
  ],
  history: [
    {
      d: "2026-04-16",
      who: "SK",
      t: "Passed the revision back to MM."
    }
  ]
}
```

### Fields

- `id`: unique project ID.
- `title`: project title.
- `type`: one of `paper`, `collaboration`, or `applied`.
- `status`: one of `Idea`, `Drafting`, `In review`, `Waiting`, or `Submitted`.
- `turn`: person ID for the person currently responsible for movement.
- `venue`: publication venue, event, internal destination, or `unplaced`.
- `venueUrl`: optional URL for the venue, journal, publication, or destination.
- `domain`: optional high-level research domain.
- `tags`: optional array of project tags.
- `updated`: ISO date string, `YYYY-MM-DD`.
- `note`: current next action or latest meaningful update.
- `notes`: longer project-level working notes.
- `waitingOn`: person ID when blocked on a collaborator, otherwise `null`.
- `coauthors`: array of person IDs.
- `links`: array of link objects.
- `papers`: linked research memory records. Files stay in Google Drive; Supabase stores metadata and summaries.
- `history`: reverse-chronological array of project updates.
- `createdAt`: database timestamp.
- `updatedAt`: database timestamp.

## Link Objects

```js
{
  kind: "Google Doc",
  url: "https://example.com"
}
```

- `kind`: display label for the link.
- `url`: destination URL.

## History Entries

```js
{
  d: "2026-04-16",
  who: "SK",
  t: "Passed the revision back to MM."
}
```

- `d`: ISO date string, `YYYY-MM-DD`.
- `who`: person ID for the update author.
- `t`: update text.

## Research Memory

Research memory stores the structured index that makes AI literature-aware without moving the actual files out of Google Drive.

### `research_papers`

- `title`: paper, draft, or reference title.
- `authors`: author list as plain text.
- `publication_year`: optional year.
- `doi`: optional DOI.
- `source_url`: journal, preprint, PubMed, or external source URL.
- `drive_url`: Google Drive file URL for the paper or draft.
- `status`: `reference`, `to-read`, `summarized`, `draft`, or `submitted`.
- `version_label`: optional draft/version label.
- `abstract`: pasted abstract or short summary.
- `key_findings`: main claims, results, or useful ideas.
- `methods`: methods, evidence type, sample, model, or design notes.
- `quotes_notes`: important quotes, caveats, or reading notes.
- `relevance`: why this item matters for research work.

### `project_papers`

Links papers to projects with an optional project-specific relevance note and sort order.

## Manuscript Drafts

Manuscript drafts store Google Drive links and version summaries for papers being written collaboratively.

### `manuscript_drafts`

- `project_id`: owning project.
- `title`: draft or section title.
- `drive_url`: Google Docs or Drive file URL.
- `version_label`: optional version label, such as `v1`, `SK comments`, or `submitted proof`.
- `status`: `draft`, `needs-review`, `revising`, `submitted`, or `archived`.
- `section_label`: optional manuscript section, such as intro, methods, discussion, or full draft.
- `summary`: short summary of what is in this version.
- `open_tasks`: writing tasks, missing citations, next paragraph notes, or review needs.
- `last_edited_on`: optional date for the latest known edit.

AI writing prompts use these draft summaries, not the Drive file contents themselves, unless text has been pasted into the summary/open-task fields.

## External Reference Search

The dashboard can search scholarly metadata through a server-side paper-search function. Search results can be saved into project research memory as `to-read` references. Each saved candidate should still be reviewed before use in a manuscript or bibliography.

## API Payloads

`PUT /api/projects` expects the full projects array.

`PUT /api/people` expects the full people object map.

Both endpoints replace the stored value rather than patching individual records.
