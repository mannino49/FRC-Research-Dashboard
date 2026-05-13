function normalize(value) {
  return String(value || '').trim();
}

function cleanTitleFromName(name) {
  return normalize(name)
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/\b(v(?:ersion)?\s*\d+(?:[._-]\d+)*|latest|final|submitted|proof|draft)\b/gi, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function statusFromVersion(versionGuess = '') {
  const lower = versionGuess.toLowerCase();
  if (lower.includes('submitted') || lower.includes('proof')) return 'Submitted';
  if (lower.includes('draft') || lower.includes('version') || /\bv\d+/i.test(lower)) return 'Drafting';
  return 'Idea';
}

function linkExists(project, url) {
  return Boolean(url && (project.links || []).some((link) => link.url === url));
}

function dateOnly(value) {
  return value ? String(value).slice(0, 10) : '';
}

export function latestDriveDocument(documents = []) {
  return [...documents].sort((a, b) => (
    String(b.modifiedAt || '').localeCompare(String(a.modifiedAt || '')) ||
    Number(b.matchScore || 0) - Number(a.matchScore || 0) ||
    String(a.name || '').localeCompare(String(b.name || ''))
  ))[0] || null;
}

export function driveProjectSuggestion(doc) {
  const title = normalize(doc.projectGuess) || cleanTitleFromName(doc.name) || 'Untitled Drive project';
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();
  const metadata = [doc.name, doc.versionGuess, dateOnly(doc.modifiedAt)].filter(Boolean).join(' · ');
  const notes = [
    'Created from an approved Research Drive suggestion.',
    metadata ? `Source file: ${metadata}` : '',
    doc.url ? `Drive URL: ${doc.url}` : '',
    doc.excerpt ? `Indexed excerpt:\n${doc.excerpt}` : '',
  ].filter(Boolean).join('\n\n');

  return {
    id: crypto.randomUUID(),
    title,
    type: 'paper',
    turn: 'MM',
    venue: 'unplaced',
    venueUrl: '',
    domain: '',
    tags: [],
    updated: today,
    status: statusFromVersion(doc.versionGuess),
    note: 'Review synced Drive file and confirm project metadata.',
    notes,
    waitingOn: null,
    coauthors: [],
    links: doc.url ? [{ id: crypto.randomUUID(), kind: 'Drive file', url: doc.url }] : [],
    history: [{ d: today, who: 'MM', t: `Project created from approved Drive suggestion: ${doc.name}.` }],
    createdAt: now,
    updatedAt: now,
  };
}

export function aiProjectSuggestionToProject(suggestion, documents = []) {
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();
  const docById = new Map(documents.map((doc) => [doc.fileId, doc]));
  const sourceDocs = (suggestion.sourceFileIds || []).map((id) => docById.get(id)).filter(Boolean);
  const links = sourceDocs.map((doc) => ({
    id: crypto.randomUUID(),
    kind: doc.versionGuess ? `Drive ${doc.versionGuess}` : 'Drive file',
    url: doc.url,
  }));
  const sourceLines = sourceDocs.map((doc) => [
    doc.name,
    doc.versionGuess,
    doc.modifiedAt?.slice(0, 10),
    doc.url,
  ].filter(Boolean).join(' · '));

  return {
    id: crypto.randomUUID(),
    title: normalize(suggestion.title) || 'Untitled Drive project',
    type: suggestion.type || 'paper',
    turn: 'MM',
    venue: normalize(suggestion.venue) || 'unplaced',
    venueUrl: '',
    domain: normalize(suggestion.domain),
    tags: suggestion.tags || [],
    updated: today,
    status: suggestion.status || 'Idea',
    note: normalize(suggestion.nextAction) || 'Review AI-generated Drive project suggestion.',
    notes: [
      'Created from an approved AI Drive suggestion.',
      suggestion.rationale ? `Rationale: ${suggestion.rationale}` : '',
      suggestion.notes,
      sourceLines.length ? `Source files:\n${sourceLines.join('\n')}` : '',
      suggestion.missingContext?.length ? `Missing context:\n${suggestion.missingContext.join('\n')}` : '',
    ].filter(Boolean).join('\n\n'),
    waitingOn: null,
    coauthors: [],
    links,
    history: [{ d: today, who: 'MM', t: 'Project created from approved AI Drive suggestion.' }],
    createdAt: now,
    updatedAt: now,
  };
}

export function aiUpdateSuggestionToPatch(project, suggestion) {
  const patch = {};
  const suggested = suggestion.patch || {};
  if (suggested.status) patch.status = suggested.status;
  if (suggested.note) patch.note = suggested.note;
  if (suggested.domain) patch.domain = suggested.domain;
  if (suggested.tags?.length) patch.tags = suggested.tags;
  if (suggested.notesAppend) {
    patch.notes = [project.notes, suggested.notesAppend].filter(Boolean).join('\n\n---\n\n');
  }
  if (Object.keys(patch).length) patch.updated = new Date().toISOString().slice(0, 10);
  return patch;
}

export function projectSuggestionsFromDrive(documents = [], projects = []) {
  const knownTitles = new Set(projects.map((project) => normalize(project.title).toLowerCase()).filter(Boolean));
  const seen = new Set();

  return documents
    .map((doc) => ({
      doc,
      title: normalize(doc.projectGuess) || cleanTitleFromName(doc.name),
    }))
    .filter(({ title }) => title.length > 2)
    .filter(({ title }) => {
      const key = title.toLowerCase();
      if (knownTitles.has(key) || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);
}

export function projectUpdateSuggestions(project, documents = []) {
  const latest = latestDriveDocument(documents);
  if (!project || !latest) return [];

  const suggestions = [];
  if (latest.url && !linkExists(project, latest.url)) {
    suggestions.push({
      id: `drive-link-${latest.fileId}`,
      label: 'Add latest Drive link',
      patch: {
        links: [
          ...(project.links || []),
          { id: crypto.randomUUID(), kind: 'Latest Drive draft', url: latest.url },
        ],
      },
    });
  }

  if (!normalize(project.note)) {
    suggestions.push({
      id: `next-action-${latest.fileId}`,
      label: 'Set review next action',
      patch: {
        note: `Review latest synced Drive draft: ${latest.name}.`,
        updated: new Date().toISOString().slice(0, 10),
      },
    });
  }

  const inferredStatus = statusFromVersion(latest.versionGuess);
  if (inferredStatus !== 'Idea' && project.status !== inferredStatus) {
    suggestions.push({
      id: `status-${latest.fileId}`,
      label: `Mark ${inferredStatus.toLowerCase()}`,
      patch: {
        status: inferredStatus,
        updated: new Date().toISOString().slice(0, 10),
      },
    });
  }

  return suggestions;
}
