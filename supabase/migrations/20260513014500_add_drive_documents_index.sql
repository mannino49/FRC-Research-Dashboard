create table if not exists public.drive_documents (
  file_id text primary key,
  name text not null,
  mime_type text not null,
  web_url text not null,
  folder_path text not null default '',
  modified_at timestamptz,
  project_guess text,
  version_guess text,
  text_content text not null default '',
  text_excerpt text not null default '',
  indexed_at timestamptz not null default now()
);

create or replace function public.set_indexed_at()
returns trigger as $$
begin
  new.indexed_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_drive_documents_indexed_at on public.drive_documents;
create trigger set_drive_documents_indexed_at
  before update on public.drive_documents
  for each row execute function public.set_indexed_at();

alter table public.drive_documents enable row level security;

drop policy if exists "Authenticated users can read drive documents" on public.drive_documents;
drop policy if exists "Authenticated users can write drive documents" on public.drive_documents;

create policy "Authenticated users can read drive documents"
  on public.drive_documents for select
  to authenticated
  using (true);

create policy "Authenticated users can write drive documents"
  on public.drive_documents for all
  to authenticated
  using (true)
  with check (true);
