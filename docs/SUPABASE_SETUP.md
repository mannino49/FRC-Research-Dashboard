# Supabase Setup

Phase 2 adds Supabase as the canonical persistence layer. The app still falls back to seed data when Supabase environment variables are missing, so local development can continue before credentials are added.

## 1. Create The Database Schema

In the Supabase SQL editor, run:

```sql
-- contents of supabase/schema.sql
```

The schema creates:

- `people`
- `projects`
- `project_links`
- `project_history`
- `project_notes`
- `ai_outputs`

Row-level security is enabled. The initial policies allow authenticated users to read and write records.

The project table includes Phase 3 fields for venue URLs, domains, tags, longer notes, and timestamps. The schema is safe to re-run while iterating because it uses `if not exists` for tables/columns and recreates policies/triggers.

## 2. Add Environment Variables

Create `.env.local`:

```text
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=your-openai-key
OPENAI_MODEL=gpt-5.4-mini
```

Only the two `VITE_` values are exposed to the browser. The service-role and OpenAI keys must stay server-side.

## 3. Create A User

In Supabase Auth, create a user for dashboard access.

The app uses email/password sign-in when Supabase is configured. Without Supabase env vars, it skips auth and runs against local seed data.

## 4. Seed Data

The current app has seed data in:

```text
src/data/seedData.js
```

Phase 2 currently preserves this as a fallback. The next practical step is either:

- insert those seed records into Supabase manually, or
- add a one-time seed script after the Supabase project credentials are available.

## 5. Current Persistence Coverage

Implemented app persistence:

- load people and projects
- create projects
- update project fields
- append project history entries
- replace project links

Prepared database tables for later phases:

- project notes
- AI outputs

Project-level notes currently persist as the `projects.notes` field. The separate `project_notes` table is reserved for multi-note/threaded note behavior later.
