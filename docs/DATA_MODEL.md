# Data Model

## People

People are stored as an object map keyed by initials or short IDs.

```js
{
  MM: {
    initials: "MM",
    name: "Michael Mannino",
    kind: "internal"
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
  updated: "2026-04-16",
  note: "Revise section 3...",
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
- `updated`: ISO date string, `YYYY-MM-DD`.
- `note`: current next action or latest meaningful update.
- `waitingOn`: person ID when blocked on a collaborator, otherwise `null`.
- `coauthors`: array of person IDs.
- `links`: array of link objects.
- `history`: reverse-chronological array of project updates.

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
