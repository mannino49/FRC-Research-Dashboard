alter table public.ai_outputs drop constraint if exists ai_outputs_output_type_check;

alter table public.ai_outputs add constraint ai_outputs_output_type_check
  check (output_type in ('abstract', 'outline', 'collaborator_suggestions', 'project_direction', 'handoff_brief', 'status_summary', 'next_action', 'stalled_waiting_check', 'followup_email', 'progress_note', 'metadata_audit', 'manuscript_status', 'next_paragraph', 'manuscript_question', 'reference_suggestions'));

create table if not exists public.drive_suggestion_reviews (
  suggestion_key text primary key,
  suggestion_type text not null check (suggestion_type in ('drive_project', 'ai_project', 'ai_update')),
  status text not null check (status in ('approved', 'dismissed')),
  project_id text references public.projects(id) on delete set null,
  file_id text,
  title text,
  reviewed_by text references public.people(id),
  reviewed_at timestamptz not null default now()
);

alter table public.drive_suggestion_reviews enable row level security;

drop policy if exists "Authenticated users can read drive suggestion reviews" on public.drive_suggestion_reviews;
drop policy if exists "Authenticated users can write drive suggestion reviews" on public.drive_suggestion_reviews;

create policy "Authenticated users can read drive suggestion reviews"
  on public.drive_suggestion_reviews for select
  to authenticated
  using (true);

create policy "Authenticated users can write drive suggestion reviews"
  on public.drive_suggestion_reviews for all
  to authenticated
  using (true)
  with check (true);
