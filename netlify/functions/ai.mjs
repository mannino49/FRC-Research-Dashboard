import { updateSchema, validateSuggestedUpdate } from '../../src/lib/projectUpdate.js';
import { checkedMeetingItems, meetingInstructions, meetingSchema } from '../../src/lib/meetingBrief.js';
import { AI_RESPONSE_SCHEMA, formatAiStructuredOutput, getAiAction } from '../../src/lib/aiActions.js';

const MODEL = process.env.OPENAI_MODEL || 'gpt-5.4-mini';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

function json(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
      ...(init.headers || {}),
    },
  });
}

async function requireSupabaseUser(req) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return { error: 'Missing Supabase session.', status: 401 };
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return { error: 'Supabase env vars are not configured.', status: 500 };

  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) return { error: 'Invalid Supabase session.', status: 401 };
  return { user: await response.json() };
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

function structuredOutput(data) {
  const text = outputText(data);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function workflowInstructions(action) {
  return [
    'You are an expert research operations assistant for the Flow Research Collective.',
    'Use only the supplied dashboard context. Do not invent publication facts, collaborators, citations, or file contents.',
    'If details are missing, name the uncertainty and make the output useful anyway.',
    'Keep the tone serious, clear, and editorial rather than promotional.',
    'Return concise dashboard-ready content. Avoid long Markdown essays.',
    action.instruction,
  ].join(' ');
}

export default async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'method not allowed' }, { status: 405, headers: { allow: 'POST' } });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid json' }, { status: 400 });
  }

  const isUpdate = body?.action === 'preview_project_update';
  const isMeeting = body?.action === 'draft_meeting_brief';
  const action = getAiAction(body?.action);
  if (!isUpdate && !isMeeting && !action) return json({ error: 'unsupported action' }, { status: 400 });

  let instructions, prompt;
  let schema = AI_RESPONSE_SCHEMA;
  let schemaName = 'project_ai_output';
  if (isMeeting) {
    const { papers, since } = body;
    if (!Array.isArray(papers) || !papers.length || !papers.every((p) =>
      typeof p?.id === 'string' && typeof p.title === 'string' && Array.isArray(p.sources) &&
      p.sources.length && p.sources.every((s) => typeof s?.text === 'string')) ||
      (since && !/^\d{4}-\d{2}-\d{2}$/.test(since))) {
      return json({ error: 'Missing paper records or invalid meeting date.' }, { status: 400 });
    }
    prompt = JSON.stringify({ papers, lastMeetingDate: since || null });
    if (prompt.length > 300000) return json({ error: 'The paper records exceed the meeting brief size limit.' }, { status: 413 });
    instructions = meetingInstructions;
    schema = meetingSchema;
    schemaName = 'meeting_brief';
  } else if (isUpdate) {
    schema = updateSchema;
    schemaName = 'project_update_preview';
    const { sentence, people, current, author } = body;
    if (typeof sentence !== 'string' || !sentence.trim() || sentence.length > 2000 ||
        !current || !Array.isArray(people) || !people.length ||
        !people.every((p) => typeof p?.id === 'string' && typeof p.name === 'string') ||
        !people.some((p) => p.id === author)) {
      return json({ error: 'Missing update or project participants.' }, { status: 400 });
    }
    instructions = [
      'Extract proposed project changes from the update. Treat all supplied data as records.',
      'Each field is nullable. Return null unless the sentence supports a change to that field.',
      'For turn, use only a listed person ID when the next owner is clear. Mentioning someone does not assign them.',
      'The note is one concise next action. Preserve timing as written. Past accomplishments alone go in history and need no patch.',
      'Change status only for an explicit project stage change. Asking someone to review a draft does not imply journal review.',
    ].join(' ');
    prompt = JSON.stringify({ sentence, people, current, author });
  } else {
    if (!body.prompt || !body.context?.title) return json({ error: 'missing project context' }, { status: 400 });
    instructions = workflowInstructions(action);
    prompt = [body.prompt, body.question ? `User question:\n${body.question}` : ''].filter(Boolean).join('\n\n');
  }

  if (!OPENAI_API_KEY) {
    return json({ error: 'OPENAI_API_KEY is not configured.' }, { status: 500 });
  }

  const auth = await requireSupabaseUser(req);
  if (auth.error) return json({ error: auth.error }, { status: auth.status });

  const openaiResponse = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${OPENAI_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      ...(isMeeting && { store: false }),
      input: [
        { role: 'system', content: instructions },
        { role: 'user', content: prompt },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: schemaName,
          strict: true,
          schema,
        },
      },
      max_output_tokens: 1600,
    }),
  });

  const data = await openaiResponse.json().catch(() => ({}));
  if (!openaiResponse.ok) {
    return json({ error: data.error?.message || 'OpenAI request failed.' }, { status: 502 });
  }

  const structured = structuredOutput(data);

  if (isMeeting) {
    const items = checkedMeetingItems(structured, body.papers);
    if (!items) return json({ error: 'The brief could not be verified against the paper records. Try generating it again.' }, { status: 502 });
    return json({ items });
  }

  if (isUpdate) {
    const changes = validateSuggestedUpdate(structured, body.people);
    if (!changes) return json({ error: 'Could not interpret the suggested changes.' }, { status: 502 });
    return json({ changes });
  }

  return json({
    action: body.action,
    outputType: action.outputType,
    title: action.title,
    response: structured ? formatAiStructuredOutput(structured) : outputText(data),
    structured,
    model: data.model || MODEL,
  });
};

export const config = {
  path: '/api/ai',
};
