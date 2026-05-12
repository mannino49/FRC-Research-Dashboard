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

drop trigger if exists set_research_papers_updated_at on public.research_papers;
create trigger set_research_papers_updated_at
  before update on public.research_papers
  for each row execute function public.set_updated_at();

alter table public.research_papers enable row level security;
alter table public.project_papers enable row level security;

drop policy if exists "Authenticated users can read research papers" on public.research_papers;
drop policy if exists "Authenticated users can write research papers" on public.research_papers;
drop policy if exists "Authenticated users can read project papers" on public.project_papers;
drop policy if exists "Authenticated users can write project papers" on public.project_papers;

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
