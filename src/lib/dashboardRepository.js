import { PEOPLE, PROJECTS } from '../data/seedData.js';
import { isSupabaseConfigured, supabase } from './supabaseClient.js';

function cloneSeedData() {
  return {
    people: normalizeSeedPeople(structuredClone(PEOPLE)),
    projects: normalizeSeedProjects(structuredClone(PROJECTS)),
    source: 'seed',
  };
}

function normalizeSeedPeople(people) {
  return Object.fromEntries(
    Object.entries(people).map(([id, person]) => [
      id,
      {
        scholarUrl: '',
        ...person,
      },
    ]),
  );
}

function normalizeSeedProjects(projects) {
  return projects.map((project) => ({
    venueUrl: '',
    domain: '',
    tags: [],
    notes: '',
    createdAt: `${project.updated}T00:00:00.000Z`,
    updatedAt: `${project.updated}T00:00:00.000Z`,
    ...project,
  }));
}

function peopleMap(rows) {
  return Object.fromEntries(
    rows.map((person) => [
      person.id,
      {
        initials: person.initials,
        name: person.name,
        kind: person.kind,
        affil: person.affiliation || undefined,
        scholarUrl: person.scholar_url || undefined,
        createdAt: person.created_at,
        updatedAt: person.updated_at,
      },
    ]),
  );
}

function personPayload(id, person) {
  return {
    id,
    initials: person.initials,
    name: person.name,
    kind: person.kind,
    affiliation: person.affil || null,
    scholar_url: person.scholarUrl || null,
  };
}

function projectsFromRows(projectRows, historyRows, linkRows) {
  const historyByProject = groupBy(historyRows, (entry) => entry.project_id);
  const linksByProject = groupBy(linkRows, (link) => link.project_id);

  return projectRows.map((project) => ({
    id: project.id,
    title: project.title,
    type: project.type,
    status: project.status,
    turn: project.turn_person_id,
    venue: project.venue,
    venueUrl: project.venue_url || undefined,
    domain: project.domain || '',
    tags: project.tags || [],
    updated: project.updated_on,
    note: project.next_action || '',
    notes: project.notes || '',
    waitingOn: project.waiting_on_person_id,
    coauthors: project.coauthor_ids || [],
    links: (linksByProject.get(project.id) || []).map((link) => ({
      id: link.id,
      kind: link.kind,
      url: link.url,
    })),
    history: (historyByProject.get(project.id) || []).map((entry) => ({
      id: entry.id,
      d: entry.entry_on,
      who: entry.person_id,
      t: entry.body,
    })),
    createdAt: project.created_at,
    updatedAt: project.updated_at,
  }));
}

function groupBy(rows, getKey) {
  return rows.reduce((groups, row) => {
    const key = getKey(row);
    const existing = groups.get(key) || [];
    existing.push(row);
    groups.set(key, existing);
    return groups;
  }, new Map());
}

function projectPayload(project) {
  return {
    id: project.id,
    title: project.title,
    type: project.type,
    status: project.status,
    turn_person_id: project.turn,
    venue: project.venue,
    venue_url: project.venueUrl || null,
    domain: project.domain || null,
    tags: project.tags || [],
    updated_on: project.updated,
    next_action: project.note || '',
    notes: project.notes || '',
    waiting_on_person_id: project.waitingOn || null,
    coauthor_ids: project.coauthors || [],
    created_at: project.createdAt,
    updated_at: project.updatedAt,
  };
}

function patchPayload(patch) {
  const payload = {};
  if ('title' in patch) payload.title = patch.title;
  if ('type' in patch) payload.type = patch.type;
  if ('status' in patch) payload.status = patch.status;
  if ('turn' in patch) payload.turn_person_id = patch.turn;
  if ('venue' in patch) payload.venue = patch.venue;
  if ('venueUrl' in patch) payload.venue_url = patch.venueUrl || null;
  if ('domain' in patch) payload.domain = patch.domain || null;
  if ('tags' in patch) payload.tags = patch.tags || [];
  if ('updated' in patch) payload.updated_on = patch.updated;
  if ('note' in patch) payload.next_action = patch.note || '';
  if ('notes' in patch) payload.notes = patch.notes || '';
  if ('waitingOn' in patch) payload.waiting_on_person_id = patch.waitingOn || null;
  if ('coauthors' in patch) payload.coauthor_ids = patch.coauthors || [];
  return payload;
}

export async function loadDashboardData() {
  if (!isSupabaseConfigured) return cloneSeedData();

  const [peopleResult, projectsResult, historyResult, linksResult] = await Promise.all([
    supabase.from('people').select('*').order('name'),
    supabase.from('projects').select('*').order('updated_on', { ascending: false }),
    supabase.from('project_history').select('*').order('entry_on', { ascending: false }).order('created_at', { ascending: false }),
    supabase.from('project_links').select('*').order('sort_order').order('kind'),
  ]);

  const error = peopleResult.error || projectsResult.error || historyResult.error || linksResult.error;
  if (error) throw error;

  const people = peopleMap(peopleResult.data || []);
  const projects = projectsFromRows(projectsResult.data || [], historyResult.data || [], linksResult.data || []);

  return {
    people,
    projects,
    source: 'supabase',
  };
}

export async function createProjectRecord(project) {
  if (!isSupabaseConfigured) return;

  const { error } = await supabase.from('projects').insert(projectPayload(project));
  if (error) throw error;

  if (project.history?.length) {
    const historyRows = project.history.map((entry) => historyPayload(project.id, entry));
    const historyResult = await supabase.from('project_history').insert(historyRows);
    if (historyResult.error) throw historyResult.error;
  }

  if (project.links?.length) {
    const linkRows = project.links.map((link, index) => linkPayload(project.id, link, index));
    const linkResult = await supabase.from('project_links').insert(linkRows);
    if (linkResult.error) throw linkResult.error;
  }
}

export async function createPersonRecord(id, person) {
  if (!isSupabaseConfigured) return;

  const { error } = await supabase.from('people').insert(personPayload(id, person));
  if (error) throw error;
}

export async function updatePersonRecord(id, person) {
  if (!isSupabaseConfigured) return;

  const { error } = await supabase.from('people').update(personPayload(id, person)).eq('id', id);
  if (error) throw error;
}

export async function updateProjectRecord(id, patch) {
  if (!isSupabaseConfigured) return;

  const payload = patchPayload(patch);
  if (Object.keys(payload).length === 0) return;

  const { error } = await supabase.from('projects').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteProjectRecord(id) {
  if (!isSupabaseConfigured) return;

  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw error;
}

export async function replaceProjectLinksRecord(projectId, links) {
  if (!isSupabaseConfigured) return;

  const deleteResult = await supabase.from('project_links').delete().eq('project_id', projectId);
  if (deleteResult.error) throw deleteResult.error;

  if (!links.length) return;

  const linkRows = links.map((link, index) => linkPayload(projectId, link, index));
  const insertResult = await supabase.from('project_links').insert(linkRows);
  if (insertResult.error) throw insertResult.error;
}

export async function appendHistoryRecord(projectId, entry) {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase
    .from('project_history')
    .insert(historyPayload(projectId, entry))
    .select('*')
    .single();

  if (error) throw error;

  return {
    id: data.id,
    d: data.entry_on,
    who: data.person_id,
    t: data.body,
  };
}

export async function createAiOutputRecord(projectId, output) {
  if (!isSupabaseConfigured) return;

  const { error } = await supabase.from('ai_outputs').insert({
    project_id: projectId,
    person_id: output.personId || null,
    output_type: output.outputType,
    prompt: output.prompt,
    response: output.response,
    model: output.model || null,
  });
  if (error) throw error;
}

function historyPayload(projectId, entry) {
  return {
    project_id: projectId,
    entry_on: entry.d,
    person_id: entry.who,
    body: entry.t,
  };
}

function linkPayload(projectId, link, index) {
  return {
    project_id: projectId,
    kind: link.kind,
    url: link.url,
    sort_order: index,
  };
}
