alter table public.projects drop constraint projects_status_check;

update public.projects
set status = 'Drafting / Idea'
where status in ('Idea', 'Drafting');

alter table public.projects add constraint projects_status_check
  check (status in ('Drafting / Idea', 'In review', 'Waiting', 'Submitted', 'Published'));
