import { json, requireSupabaseUser } from '../shared/drive-utils.mjs';

const MODEL = process.env.OPENAI_MODEL || 'gpt-5.4-mini';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const DRIVE_SUGGESTION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    projectSuggestions: {
      type: 'array',
      maxItems: 6,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          type: { type: 'string', enum: ['paper', 'collaboration', 'applied'] },
          status: { type: 'string', enum: ['Idea', 'Drafting', 'In review', 'Waiting', 'Submitted'] },
          venue: { type: 'string' },
          domain: { type: 'string' },
          tags: { type: 'array', maxItems: 6, items: { type: 'string' } },
          nextAction: { type: 'string' },
          notes: { type: 'string' },
          sourceFileIds: { type: 'array', maxItems: 4, items: { type: 'string' } },
          confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
          rationale: { type: 'string' },
          missingContext: { type: 'array', maxItems: 6, items: { type: 'string' } },
        },
        required: ['title', 'type', 'status', 'venue', 'domain', 'tags', 'nextAction', 'notes', 'sourceFileIds', 'confidence', 'rationale', 'missingContext'],
      },
    },
    updateSuggestions: {
      type: 'array',
      maxItems: 8,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          projectId: { type: 'string' },
          summary: { type: 'string' },
          patch: {
            type: 'object',
            additionalProperties: false,
            properties: {
              status: { type: 'string', enum: ['Idea', 'Drafting', 'In review', 'Waiting', 'Submitted', ''] },
              note: { type: 'string' },
              notesAppend: { type: 'string' },
              domain: { type: 'string' },
              tags: { type: 'array', maxItems: 6, items: { type: 'string' } },
            },
            required: ['status', 'note', 'notesAppend', 'domain', 'tags'],
          },
          sourceFileIds: { type: 'array', maxItems: 4, items: { type: 'string' } },
          confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
          rationale: { type: 'string' },
          missingContext: { type: 'array', maxItems: 6, items: { type: 'string' } },
        },
        required: ['projectId', 'summary', 'patch', 'sourceFileIds', 'confidence', 'rationale', 'missingContext'],
      },
    },
  },
  required: ['projectSuggestions', 'updateSuggestions'],
};

async function loadDocuments(auth) {
  const response = await fetch(`${auth.supabaseUrl}/rest/v1/drive_documents?select=file_id,name,web_url,folder_path,modified_at,project_guess,version_guess,text_content,text_excerpt,indexed_at&order=modified_at.desc.nullslast&limit=40`, {
    headers: {
      apikey: auth.supabaseAnonKey,
      authorization: `Bearer ${auth.token}`,
    },
  });
  const data = await response.json().catch(() => []);
  if (!response.ok) throw new Error(data.message || 'Failed to load Drive index.');
  return data;
}

function outputText(data) {
  if (typeof data.output_text === 'string') return data.output_text;
  return (data.output || [])
    .flatMap((item) => item.content || [])
    .map((content) => content.text || '')
    .filter(Boolean)
    .join('\n')
    .trim();
}

function projectDigest(projects = []) {
  return projects.slice(0, 80).map((project) => ({
    id: project.id,
    title: project.title,
    type: project.type,
    status: project.status,
    turn: project.turn,
    venue: project.venue,
    domain: project.domain || '',
    tags: project.tags || [],
    nextAction: project.note || '',
    notes: String(project.notes || '').slice(0, 900),
  }));
}

function documentDigest(documents = []) {
  return documents.map((doc) => ({
    fileId: doc.file_id,
    name: doc.name,
    url: doc.web_url,
    folderPath: doc.folder_path || '',
    modifiedAt: doc.modified_at || '',
    projectGuess: doc.project_guess || '',
    versionGuess: doc.version_guess || '',
    indexedAt: doc.indexed_at || '',
    excerpt: String(doc.text_content || doc.text_excerpt || '').slice(0, 3600),
  }));
}

export default async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'method not allowed' }, { status: 405, headers: { allow: 'POST' } });
  }

  const auth = await requireSupabaseUser(req);
  if (auth.error) return json({ error: auth.error }, { status: auth.status });

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid json' }, { status: 400 });
  }

  if (!OPENAI_API_KEY) return json({ error: 'OPENAI_API_KEY is not configured.' }, { status: 500 });

  try {
    const documents = await loadDocuments(auth);
    if (!documents.length) return json({ projectSuggestions: [], updateSuggestions: [], documentsUsed: [] });

    const docs = documentDigest(documents);
    const projects = projectDigest(body.projects || []);

    const openaiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${OPENAI_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        input: [
          {
            role: 'system',
            content: [
              'You are a research collaboration operations assistant for Michael Mannino and Stephen Kotler.',
              'Read indexed Research Drive documents and existing dashboard projects.',
              'Propose dashboard updates that help collaborators see whose turn it is, where the manuscript is, what document matters, and what the next writing step should be.',
              'Do not save anything. Return suggestions only.',
              'Do not invent publication facts, citations, file contents, or collaborators. Use uncertainty labels and missingContext when evidence is weak.',
              'Prefer concrete next writing moves over broad advice.',
            ].join(' '),
          },
          {
            role: 'user',
            content: JSON.stringify({ existingProjects: projects, indexedDriveDocuments: docs }),
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'drive_project_suggestions',
            strict: true,
            schema: DRIVE_SUGGESTION_SCHEMA,
          },
        },
        max_output_tokens: 2600,
      }),
    });

    const data = await openaiResponse.json().catch(() => ({}));
    if (!openaiResponse.ok) {
      return json({ error: data.error?.message || 'OpenAI request failed.' }, { status: 502 });
    }

    let structured = { projectSuggestions: [], updateSuggestions: [] };
    try {
      structured = JSON.parse(outputText(data));
    } catch {
      structured = { projectSuggestions: [], updateSuggestions: [] };
    }

    return json({
      ...structured,
      documentsUsed: docs.map(({ fileId, name, url, modifiedAt, projectGuess, versionGuess }) => ({
        fileId,
        name,
        url,
        modifiedAt,
        projectGuess,
        versionGuess,
      })),
      model: data.model || MODEL,
    });
  } catch (error) {
    console.error(error);
    return json({ error: error.message || 'Drive suggestion failed.' }, { status: 500 });
  }
};

export const config = {
  path: '/api/drive-suggest',
};
