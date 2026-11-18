-- Commit the reviewed fields and original sentence in the same transaction.
create or replace function public.save_reviewed_project_update(
  p_project_id text, p_entry_id uuid, p_author text, p_sentence text,
  p_expected jsonb, p_changes jsonb
) returns jsonb
language plpgsql security invoker set search_path = ''
as $$
declare
  project public.projects%rowtype;
  entry public.project_history%rowtype;
  fields jsonb;
  conflict boolean := false;
  already_saved boolean;
begin
  if p_sentence is null or length(trim(p_sentence)) = 0 or length(p_sentence) > 2000 then
    raise exception 'Enter a project update of up to 2000 characters.';
  end if;
  if jsonb_typeof(p_changes) is distinct from 'object' or jsonb_typeof(p_expected) is distinct from 'object'
     or (p_changes - array['status','turn','note']) <> '{}'::jsonb
     or (select array_agg(k order by k) from jsonb_object_keys(p_changes) k)
        is distinct from (select array_agg(k order by k) from jsonb_object_keys(p_expected) k) then
    raise exception 'Invalid reviewed project fields.';
  end if;

  select * into strict project from public.projects where id = p_project_id for update;
  select * into entry from public.project_history where id = p_entry_id;
  already_saved := found;
  if already_saved then
    if entry.project_id <> p_project_id or entry.person_id <> p_author or entry.body <> p_sentence then
      raise exception 'This update was already saved. Refresh the project to see its history.';
    end if;
  else
    fields := jsonb_build_object('status', project.status, 'turn', project.turn_person_id, 'note', project.next_action);
    conflict := not (fields @> p_expected);
    if not conflict then
      fields := fields || p_changes;
      update public.projects
        set status = fields->>'status', turn_person_id = fields->>'turn',
            next_action = fields->>'note', updated_on = current_date
        where id = project.id returning * into strict project;
      insert into public.project_history (id, project_id, person_id, body)
        values (p_entry_id, project.id, p_author, p_sentence) returning * into entry;
    end if;
  end if;
  return jsonb_build_object(
    'conflict', conflict, 'alreadySaved', already_saved,
    'fields', jsonb_build_object('status', project.status, 'turn', project.turn_person_id,
      'note', project.next_action, 'updated', project.updated_on, 'updatedAt', project.updated_at),
    'entry', case when entry.id is not null then jsonb_build_object(
      'id', entry.id, 'who', entry.person_id, 'd', entry.entry_on, 't', entry.body) end
  );
end;
$$;

revoke all on function public.save_reviewed_project_update(text, uuid, text, text, jsonb, jsonb) from public, anon;
grant execute on function public.save_reviewed_project_update(text, uuid, text, text, jsonb, jsonb) to authenticated;
