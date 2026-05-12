create extension if not exists pgcrypto;

create table if not exists public.people (
  id text primary key,
  initials text not null,
  name text not null,
  kind text not null check (kind in ('internal', 'external')),
  affiliation text,
  scholar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.people add column if not exists scholar_url text;
alter table public.people add column if not exists created_at timestamptz not null default now();
alter table public.people add column if not exists updated_at timestamptz not null default now();

create table if not exists public.projects (
  id text primary key,
  title text not null,
  type text not null check (type in ('paper', 'collaboration', 'applied')),
  status text not null check (status in ('Idea', 'Drafting', 'In review', 'Waiting', 'Submitted')),
  turn_person_id text not null references public.people(id),
  venue text not null default 'unplaced',
  venue_url text,
  domain text,
  tags text[] not null default '{}',
  updated_on date not null default current_date,
  next_action text not null default '',
  notes text not null default '',
  waiting_on_person_id text references public.people(id),
  coauthor_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects add column if not exists venue_url text;
alter table public.projects add column if not exists domain text;
alter table public.projects add column if not exists tags text[] not null default '{}';
alter table public.projects add column if not exists notes text not null default '';
alter table public.projects add column if not exists created_at timestamptz not null default now();
alter table public.projects add column if not exists updated_at timestamptz not null default now();

create table if not exists public.project_links (
  id uuid primary key default gen_random_uuid(),
  project_id text not null references public.projects(id) on delete cascade,
  kind text not null,
  url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.project_history (
  id uuid primary key default gen_random_uuid(),
  project_id text not null references public.projects(id) on delete cascade,
  entry_on date not null default current_date,
  person_id text not null references public.people(id),
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.project_notes (
  id uuid primary key default gen_random_uuid(),
  project_id text not null references public.projects(id) on delete cascade,
  person_id text references public.people(id),
  title text,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.research_papers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  authors text not null default '',
  publication_year integer,
  doi text,
  source_url text,
  drive_url text,
  status text not null default 'reference',
  version_label text,
  abstract text not null default '',
  key_findings text not null default '',
  methods text not null default '',
  quotes_notes text not null default '',
  relevance text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_papers (
  project_id text not null references public.projects(id) on delete cascade,
  paper_id uuid not null references public.research_papers(id) on delete cascade,
  relevance_note text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (project_id, paper_id)
);

create table if not exists public.manuscript_drafts (
  id uuid primary key default gen_random_uuid(),
  project_id text not null references public.projects(id) on delete cascade,
  title text not null,
  drive_url text not null,
  version_label text,
  status text not null default 'draft',
  section_label text,
  summary text not null default '',
  open_tasks text not null default '',
  last_edited_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_outputs (
  id uuid primary key default gen_random_uuid(),
  project_id text references public.projects(id) on delete cascade,
  person_id text references public.people(id),
  output_type text not null check (output_type in ('abstract', 'outline', 'collaborator_suggestions', 'project_direction', 'status_summary', 'next_action', 'stalled_waiting_check', 'followup_email', 'progress_note', 'metadata_audit', 'manuscript_status', 'next_paragraph', 'reference_suggestions')),
  prompt text not null,
  response text not null,
  model text,
  created_at timestamptz not null default now()
);

alter table public.ai_outputs drop constraint if exists ai_outputs_output_type_check;
alter table public.ai_outputs add constraint ai_outputs_output_type_check
  check (output_type in ('abstract', 'outline', 'collaborator_suggestions', 'project_direction', 'status_summary', 'next_action', 'stalled_waiting_check', 'followup_email', 'progress_note', 'metadata_audit', 'manuscript_status', 'next_paragraph', 'reference_suggestions'));

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_people_updated_at on public.people;
create trigger set_people_updated_at
  before update on public.people
  for each row execute function public.set_updated_at();

drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

drop trigger if exists set_project_notes_updated_at on public.project_notes;
create trigger set_project_notes_updated_at
  before update on public.project_notes
  for each row execute function public.set_updated_at();

drop trigger if exists set_research_papers_updated_at on public.research_papers;
create trigger set_research_papers_updated_at
  before update on public.research_papers
  for each row execute function public.set_updated_at();

drop trigger if exists set_manuscript_drafts_updated_at on public.manuscript_drafts;
create trigger set_manuscript_drafts_updated_at
  before update on public.manuscript_drafts
  for each row execute function public.set_updated_at();

alter table public.people enable row level security;
alter table public.projects enable row level security;
alter table public.project_links enable row level security;
alter table public.project_history enable row level security;
alter table public.project_notes enable row level security;
alter table public.research_papers enable row level security;
alter table public.project_papers enable row level security;
alter table public.manuscript_drafts enable row level security;
alter table public.ai_outputs enable row level security;

drop policy if exists "Authenticated users can read people" on public.people;
drop policy if exists "Authenticated users can write people" on public.people;
drop policy if exists "Authenticated users can read projects" on public.projects;
drop policy if exists "Authenticated users can write projects" on public.projects;
drop policy if exists "Authenticated users can read project links" on public.project_links;
drop policy if exists "Authenticated users can write project links" on public.project_links;
drop policy if exists "Authenticated users can read project history" on public.project_history;
drop policy if exists "Authenticated users can write project history" on public.project_history;
drop policy if exists "Authenticated users can read project notes" on public.project_notes;
drop policy if exists "Authenticated users can write project notes" on public.project_notes;
drop policy if exists "Authenticated users can read research papers" on public.research_papers;
drop policy if exists "Authenticated users can write research papers" on public.research_papers;
drop policy if exists "Authenticated users can read project papers" on public.project_papers;
drop policy if exists "Authenticated users can write project papers" on public.project_papers;
drop policy if exists "Authenticated users can read manuscript drafts" on public.manuscript_drafts;
drop policy if exists "Authenticated users can write manuscript drafts" on public.manuscript_drafts;
drop policy if exists "Authenticated users can read ai outputs" on public.ai_outputs;
drop policy if exists "Authenticated users can write ai outputs" on public.ai_outputs;

create policy "Authenticated users can read people"
  on public.people for select
  to authenticated
  using (true);

create policy "Authenticated users can write people"
  on public.people for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can read projects"
  on public.projects for select
  to authenticated
  using (true);

create policy "Authenticated users can write projects"
  on public.projects for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can read project links"
  on public.project_links for select
  to authenticated
  using (true);

create policy "Authenticated users can write project links"
  on public.project_links for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can read project history"
  on public.project_history for select
  to authenticated
  using (true);

create policy "Authenticated users can write project history"
  on public.project_history for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can read project notes"
  on public.project_notes for select
  to authenticated
  using (true);

create policy "Authenticated users can write project notes"
  on public.project_notes for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can read research papers"
  on public.research_papers for select
  to authenticated
  using (true);

create policy "Authenticated users can write research papers"
  on public.research_papers for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can read project papers"
  on public.project_papers for select
  to authenticated
  using (true);

create policy "Authenticated users can write project papers"
  on public.project_papers for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can read manuscript drafts"
  on public.manuscript_drafts for select
  to authenticated
  using (true);

create policy "Authenticated users can write manuscript drafts"
  on public.manuscript_drafts for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can read ai outputs"
  on public.ai_outputs for select
  to authenticated
  using (true);

create policy "Authenticated users can write ai outputs"
  on public.ai_outputs for all
  to authenticated
  using (true)
  with check (true);
