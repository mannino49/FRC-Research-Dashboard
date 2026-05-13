import { json, requireSupabaseUser } from '../shared/drive-utils.mjs';

const MODEL = process.env.OPENAI_SCOUT_MODEL || process.env.OPENAI_MODEL || 'gpt-5.4-mini';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const COLLABORATOR_SCOUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    headline: { type: 'string' },
    summary: { type: 'string' },
    candidates: {
      type: 'array',
      maxItems: 8,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          affiliation: { type: 'string' },
          fit: { type: 'string' },
          suggestedAsk: { type: 'string' },
          confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
          sourceUrls: { type: 'array', maxItems: 4, items: { type: 'string' } },
        },
        required: ['name', 'affiliation', 'fit', 'suggestedAsk', 'confidence', 'sourceUrls'],
      },
    },
    searchQueries: { type: 'array', maxItems: 6, items: { type: 'string' } },
    missingContext: { type: 'array', maxItems: 6, items: { type: 'string' } },
  },
  required: ['headline', 'summary', 'candidates', 'searchQueries', 'missingContext'],
};

function outputText(data) {
  if (typeof data.output_text === 'string') return data.output_text;
  return (data.output || [])
    .flatMap((item) => item.content || [])
    .map((content) => content.text || '')
    .filter(Boolean)
    .join('\n')
    .trim();
}

function formatScout(output) {
  const lines = [];
  if (output.headline) lines.push(`# ${output.headline}`);
  if (output.summary) lines.push(output.summary);
  for (const candidate of output.candidates || []) {
    lines.push(`## ${candidate.name}`);
    lines.push([candidate.affiliation, candidate.confidence].filter(Boolean).join(' · '));
    if (candidate.fit) lines.push(candidate.fit);
    if (candidate.suggestedAsk) lines.push(`Suggested ask: ${candidate.suggestedAsk}`);
    for (const url of candidate.sourceUrls || []) lines.push(`Source: ${url}`);
  }
  if (output.missingContext?.length) {
    lines.push('## Missing context');
    for (const item of output.missingContext) lines.push(`- ${item}`);
  }
  return lines.join('\n\n');
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

  if (!body.prompt || !body.context?.title) return json({ error: 'missing project context' }, { status: 400 });
  if (!OPENAI_API_KEY) return json({ error: 'OPENAI_API_KEY is not configured.' }, { status: 500 });

  const openaiResponse = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${OPENAI_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      tools: [{ type: 'web_search' }],
      tool_choice: 'auto',
      include: ['web_search_call.action.sources'],
      input: [
        {
          role: 'system',
          content: [
            'You are an expert academic collaborator scout for research writing teams.',
            'Use web search to find plausible collaborators for the supplied project.',
            'Prefer active researchers, labs, institutes, authors, or practitioners with public evidence of relevant work.',
            'Do not fabricate credentials, publications, affiliations, or contact details.',
            'Every candidate should include source URLs that support the fit.',
            'Focus on high-signal recommendations, not famous names by default.',
          ].join(' '),
        },
        {
          role: 'user',
          content: `Project context:\n${body.prompt}\n\nScout for collaborators who could help move this paper or research project forward. Return candidates with fit, suggested ask, confidence, and source URLs.`,
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'collaborator_scout',
          strict: true,
          schema: COLLABORATOR_SCOUT_SCHEMA,
        },
      },
      max_output_tokens: 2600,
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
    outputType: 'collaborator_suggestions',
    title: 'Collaborator scout',
    response: structured ? formatScout(structured) : outputText(data),
    structured,
    model: data.model || MODEL,
  });
};

export const config = {
  path: '/api/collaborator-scout',
};
