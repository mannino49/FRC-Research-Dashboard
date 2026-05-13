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
    papers: [],
    drafts: [],
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

function papersFromRows(paperRows, linkRows) {
  const papersById = new Map(
    paperRows.map((paper) => [
      paper.id,
      {
        id: paper.id,
        title: paper.title,
        authors: paper.authors || '',
        year: paper.publication_year || '',
        doi: paper.doi || '',
        sourceUrl: paper.source_url || '',
        driveUrl: paper.drive_url || '',
        status: paper.status || 'reference',
        version: paper.version_label || '',
        abstract: paper.abstract || '',
        keyFindings: paper.key_findings || '',
        methods: paper.methods || '',
        quotesNotes: paper.quotes_notes || '',
        relevance: paper.relevance || '',
        createdAt: paper.created_at,
        updatedAt: paper.updated_at,
      },
    ]),
  );

  const papersByProject = groupBy(linkRows, (link) => link.project_id, (link) => ({
    ...papersById.get(link.paper_id),
    relevanceNote: link.relevance_note || '',
    sortOrder: link.sort_order || 0,
  }));

  papersByProject.forEach((papers) => {
    papers.sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
  });

  return papersByProject;
}

function draftFromRow(draft) {
  return {
    id: draft.id,
    title: draft.title,
    driveUrl: draft.drive_url,
    version: draft.version_label || '',
    status: draft.status || 'draft',
    section: draft.section_label || '',
    summary: draft.summary || '',
    openTasks: draft.open_tasks || '',
    lastEdited: draft.last_edited_on || '',
    createdAt: draft.created_at,
    updatedAt: draft.updated_at,
  };
}

function projectsFromRows(projectRows, historyRows, linkRows, paperRows = [], projectPaperRows = [], draftRows = []) {
  const historyByProject = groupBy(historyRows, (entry) => entry.project_id);
  const linksByProject = groupBy(linkRows, (link) => link.project_id);
  const papersByProject = papersFromRows(paperRows, projectPaperRows);
  const draftsByProject = groupBy(draftRows, (draft) => draft.project_id, draftFromRow);
  draftsByProject.forEach((drafts) => {
    drafts.sort((a, b) => (b.lastEdited || '').localeCompare(a.lastEdited || '') || a.title.localeCompare(b.title));
  });

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
    papers: papersByProject.get(project.id) || [],
    drafts: draftsByProject.get(project.id) || [],
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

function groupBy(rows, getKey, mapRow = (row) => row) {
  return rows.reduce((groups, row) => {
    const key = getKey(row);
    const existing = groups.get(key) || [];
    const value = mapRow(row);
    if (value.id) existing.push(value);
    groups.set(key, existing);
    return groups;
  }, new Map());
}

function isMissingRelation(error) {
  return error?.code === '42P01' || /does not exist/i.test(error?.message || '');
}

function suggestionReviewFromRow(row) {
  return {
    key: row.suggestion_key,
    type: row.suggestion_type,
    status: row.status,
    projectId: row.project_id || '',
    fileId: row.file_id || '',
    title: row.title || '',
    reviewedBy: row.reviewed_by || '',
    reviewedAt: row.reviewed_at,
  };
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

  const [peopleResult, projectsResult, historyResult, linksResult, papersResult, projectPapersResult, draftsResult] = await Promise.all([
    supabase.from('people').select('*').order('name'),
    supabase.from('projects').select('*').order('updated_on', { ascending: false }),
    supabase.from('project_history').select('*').order('entry_on', { ascending: false }).order('created_at', { ascending: false }),
    supabase.from('project_links').select('*').order('sort_order').order('kind'),
    supabase.from('research_papers').select('*').order('updated_at', { ascending: false }),
    supabase.from('project_papers').select('*').order('sort_order'),
    supabase.from('manuscript_drafts').select('*').order('last_edited_on', { ascending: false }),
  ]);

  const papersUnavailable = isMissingRelation(papersResult.error) || isMissingRelation(projectPapersResult.error);
  const draftsUnavailable = isMissingRelation(draftsResult.error);
  const error = peopleResult.error || projectsResult.error || historyResult.error || linksResult.error || (papersUnavailable ? null : papersResult.error || projectPapersResult.error) || (draftsUnavailable ? null : draftsResult.error);
  if (error) throw error;

  const people = peopleMap(peopleResult.data || []);
  const projects = projectsFromRows(
    projectsResult.data || [],
    historyResult.data || [],
    linksResult.data || [],
    papersUnavailable ? [] : papersResult.data || [],
    papersUnavailable ? [] : projectPapersResult.data || [],
    draftsUnavailable ? [] : draftsResult.data || [],
  );

  return {
    people,
    projects,
    source: 'supabase',
  };
}

export async function loadDriveDocuments() {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('drive_documents')
    .select('file_id,name,mime_type,web_url,folder_path,modified_at,project_guess,version_guess,text_excerpt,indexed_at')
    .order('modified_at', { ascending: false, nullsFirst: false })
    .limit(100);

  if (isMissingRelation(error)) return [];
  if (error) throw error;

  return (data || []).map((doc) => ({
    fileId: doc.file_id,
    name: doc.name,
    mimeType: doc.mime_type,
    url: doc.web_url,
    folderPath: doc.folder_path,
    modifiedAt: doc.modified_at,
    projectGuess: doc.project_guess,
    versionGuess: doc.version_guess,
    excerpt: doc.text_excerpt,
    indexedAt: doc.indexed_at,
  }));
}

export async function loadSuggestionReviews() {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('drive_suggestion_reviews')
    .select('*')
    .order('reviewed_at', { ascending: false })
    .limit(300);

  if (isMissingRelation(error)) return [];
  if (error) throw error;

  return (data || []).map(suggestionReviewFromRow);
}

export async function saveSuggestionReview(review) {
  if (!isSupabaseConfigured) return review;

  const payload = {
    suggestion_key: review.key,
    suggestion_type: review.type,
    status: review.status,
    project_id: review.projectId || null,
    file_id: review.fileId || null,
    title: review.title || null,
    reviewed_by: review.reviewedBy || null,
    reviewed_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('drive_suggestion_reviews')
    .upsert(payload, { onConflict: 'suggestion_key' })
    .select('*')
    .single();
  if (error) throw error;
  return suggestionReviewFromRow(data);
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

export async function createResearchPaperForProject(projectId, paper) {
  if (!isSupabaseConfigured) return paper;

  const paperPayload = researchPaperPayload(paper);
  const { data, error } = await supabase
    .from('research_papers')
    .insert(paperPayload)
    .select('*')
    .single();
  if (error) throw error;

  const linkResult = await supabase.from('project_papers').insert({
    project_id: projectId,
    paper_id: data.id,
    relevance_note: paper.relevanceNote || '',
    sort_order: paper.sortOrder || 0,
  });
  if (linkResult.error) throw linkResult.error;

  return {
    id: data.id,
    title: data.title,
    authors: data.authors || '',
    year: data.publication_year || '',
    doi: data.doi || '',
    sourceUrl: data.source_url || '',
    driveUrl: data.drive_url || '',
    status: data.status || 'reference',
    version: data.version_label || '',
    abstract: data.abstract || '',
    keyFindings: data.key_findings || '',
    methods: data.methods || '',
    quotesNotes: data.quotes_notes || '',
    relevance: data.relevance || '',
    relevanceNote: paper.relevanceNote || '',
    sortOrder: paper.sortOrder || 0,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function unlinkResearchPaperFromProject(projectId, paperId) {
  if (!isSupabaseConfigured) return;

  const { error } = await supabase
    .from('project_papers')
    .delete()
    .eq('project_id', projectId)
    .eq('paper_id', paperId);
  if (error) throw error;
}

export async function createManuscriptDraftRecord(projectId, draft) {
  if (!isSupabaseConfigured) return draft;

  const { data, error } = await supabase
    .from('manuscript_drafts')
    .insert(manuscriptDraftPayload(projectId, draft))
    .select('*')
    .single();
  if (error) throw error;

  return draftFromRow(data);
}

export async function deleteManuscriptDraftRecord(id) {
  if (!isSupabaseConfigured) return;

  const { error } = await supabase.from('manuscript_drafts').delete().eq('id', id);
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

function researchPaperPayload(paper) {
  const year = Number.parseInt(paper.year, 10);
  return {
    title: paper.title,
    authors: paper.authors || '',
    publication_year: Number.isFinite(year) ? year : null,
    doi: paper.doi || null,
    source_url: paper.sourceUrl || null,
    drive_url: paper.driveUrl || null,
    status: paper.status || 'reference',
    version_label: paper.version || null,
    abstract: paper.abstract || '',
    key_findings: paper.keyFindings || '',
    methods: paper.methods || '',
    quotes_notes: paper.quotesNotes || '',
    relevance: paper.relevance || '',
  };
}

function manuscriptDraftPayload(projectId, draft) {
  return {
    project_id: projectId,
    title: draft.title,
    drive_url: draft.driveUrl,
    version_label: draft.version || null,
    status: draft.status || 'draft',
    section_label: draft.section || null,
    summary: draft.summary || '',
    open_tasks: draft.openTasks || '',
    last_edited_on: draft.lastEdited || null,
  };
}
