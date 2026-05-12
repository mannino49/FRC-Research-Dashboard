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

drop trigger if exists set_manuscript_drafts_updated_at on public.manuscript_drafts;
create trigger set_manuscript_drafts_updated_at
  before update on public.manuscript_drafts
  for each row execute function public.set_updated_at();

alter table public.manuscript_drafts enable row level security;

drop policy if exists "Authenticated users can read manuscript drafts" on public.manuscript_drafts;
drop policy if exists "Authenticated users can write manuscript drafts" on public.manuscript_drafts;

create policy "Authenticated users can read manuscript drafts"
  on public.manuscript_drafts for select
  to authenticated
  using (true);

create policy "Authenticated users can write manuscript drafts"
  on public.manuscript_drafts for all
  to authenticated
  using (true)
  with check (true);

alter table public.ai_outputs drop constraint if exists ai_outputs_output_type_check;

alter table public.ai_outputs add constraint ai_outputs_output_type_check
  check (
    output_type in (
      'abstract',
      'outline',
      'collaborator_suggestions',
      'project_direction',
      'status_summary',
      'next_action',
      'stalled_waiting_check',
      'followup_email',
      'progress_note',
      'metadata_audit',
      'manuscript_status',
      'next_paragraph',
      'reference_suggestions'
    )
  );
