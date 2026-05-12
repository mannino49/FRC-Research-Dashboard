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

## API Payloads

`PUT /api/projects` expects the full projects array.

`PUT /api/people` expects the full people object map.

Both endpoints replace the stored value rather than patching individual records.
