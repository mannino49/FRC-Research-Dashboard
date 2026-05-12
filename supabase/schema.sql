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

create table if not exists public.ai_outputs (
  id uuid primary key default gen_random_uuid(),
  project_id text references public.projects(id) on delete cascade,
  person_id text references public.people(id),
  output_type text not null check (output_type in ('abstract', 'outline', 'collaborator_suggestions', 'project_direction')),
  prompt text not null,
  response text not null,
  model text,
  created_at timestamptz not null default now()
);

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

alter table public.people enable row level security;
alter table public.projects enable row level security;
alter table public.project_links enable row level security;
alter table public.project_history enable row level security;
alter table public.project_notes enable row level security;
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

create policy "Authenticated users can read ai outputs"
  on public.ai_outputs for select
  to authenticated
  using (true);

create policy "Authenticated users can write ai outputs"
  on public.ai_outputs for all
  to authenticated
  using (true)
  with check (true);
