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

  const action = getAiAction(body.action);
  if (!action) return json({ error: 'unsupported action' }, { status: 400 });
  if (!body.prompt || !body.context?.title) return json({ error: 'missing project context' }, { status: 400 });

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
      input: [
        { role: 'system', content: workflowInstructions(action) },
        { role: 'user', content: [body.prompt, body.question ? `User question:\n${body.question}` : ''].filter(Boolean).join('\n\n') },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'project_ai_output',
          strict: true,
          schema: AI_RESPONSE_SCHEMA,
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
