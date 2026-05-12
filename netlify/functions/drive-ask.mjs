import { AI_RESPONSE_SCHEMA, formatAiStructuredOutput } from '../../src/lib/aiActions.js';
import { json, requireSupabaseUser } from '../shared/drive-utils.mjs';

const MODEL = process.env.OPENAI_MODEL || 'gpt-5.4-mini';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function loadDocuments(auth) {
  const response = await fetch(`${auth.supabaseUrl}/rest/v1/drive_documents?select=file_id,name,web_url,folder_path,modified_at,project_guess,version_guess,text_content,text_excerpt,indexed_at&order=modified_at.desc.nullslast&limit=100`, {
    headers: {
      apikey: auth.supabaseAnonKey,
      authorization: `Bearer ${auth.token}`,
    },
  });
  const data = await response.json().catch(() => []);
  if (!response.ok) throw new Error(data.message || 'Failed to load Drive index.');
  return data;
}

function tokens(question) {
  return question.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 2);
}

function scoreDocument(doc, queryTokens) {
  const haystack = `${doc.name} ${doc.project_guess} ${doc.version_guess} ${doc.text_content}`.toLowerCase();
  return queryTokens.reduce((score, token) => score + (haystack.includes(token) ? 1 : 0), 0);
}

function snippet(doc, queryTokens) {
  const text = doc.text_content || doc.text_excerpt || '';
  const lower = text.toLowerCase();
  const hit = queryTokens.map((token) => lower.indexOf(token)).find((index) => index >= 0) ?? 0;
  const start = Math.max(0, hit - 700);
  return text.slice(start, start + 2600);
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

  const question = String(body.question || '').trim();
  if (question.length < 3) return json({ error: 'Ask a longer question.' }, { status: 400 });
  if (!OPENAI_API_KEY) return json({ error: 'OPENAI_API_KEY is not configured.' }, { status: 500 });

  try {
    const docs = await loadDocuments(auth);
    const queryTokens = tokens(question);
    const ranked = docs
      .map((doc) => ({ ...doc, score: scoreDocument(doc, queryTokens) }))
      .filter((doc) => doc.score > 0)
      .sort((a, b) => b.score - a.score || String(b.modified_at || '').localeCompare(String(a.modified_at || '')))
      .slice(0, 5);

    const contextDocs = (ranked.length ? ranked : docs.slice(0, 5)).map((doc) => [
      `File: ${doc.name}`,
      `Project guess: ${doc.project_guess || 'unknown'}`,
      `Version guess: ${doc.version_guess || 'unknown'}`,
      `Modified: ${doc.modified_at || 'unknown'}`,
      `URL: ${doc.web_url}`,
      `Excerpt:\n${snippet(doc, queryTokens)}`,
    ].join('\n')).join('\n\n---\n\n');

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
              'You are an expert manuscript and research-drive assistant for the Flow Research Collective.',
              'Answer only from the indexed Google Drive document context provided.',
              'When identifying the latest draft, weigh modified date, filename version clues, and words like latest/final/submitted/proof.',
              'Name the file or files you used. If context is missing, say exactly what must be synced.',
            ].join(' '),
          },
          {
            role: 'user',
            content: `Question:\n${question}\n\nIndexed Research Drive context:\n${contextDocs || 'No indexed documents available.'}`,
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'drive_answer',
            strict: true,
            schema: AI_RESPONSE_SCHEMA,
          },
        },
        max_output_tokens: 1800,
      }),
    });

    const data = await openaiResponse.json().catch(() => ({}));
    if (!openaiResponse.ok) {
      return json({ error: data.error?.message || 'OpenAI request failed.' }, { status: 502 });
    }

    let structured = null;
    try {
      structured = JSON.parse(outputText(data));
    } catch {
      structured = null;
    }

    return json({
      question,
      documentsUsed: ranked.map((doc) => ({
        fileId: doc.file_id,
        name: doc.name,
        url: doc.web_url,
        modifiedAt: doc.modified_at,
        projectGuess: doc.project_guess,
        versionGuess: doc.version_guess,
      })),
      response: structured ? formatAiStructuredOutput(structured) : outputText(data),
      structured,
      model: data.model || MODEL,
    });
  } catch (error) {
    console.error(error);
    return json({ error: error.message || 'Drive question failed.' }, { status: 500 });
  }
};

export const config = {
  path: '/api/drive-ask',
};
