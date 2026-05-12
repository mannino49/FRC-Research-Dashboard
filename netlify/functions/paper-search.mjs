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

function abstractFromIndex(index) {
  if (!index || typeof index !== 'object') return '';
  const words = [];
  for (const [word, positions] of Object.entries(index)) {
    for (const position of positions || []) words[position] = word;
  }
  return words.filter(Boolean).join(' ');
}

function formatAuthors(authorships = []) {
  return authorships
    .slice(0, 8)
    .map((entry) => entry.author?.display_name)
    .filter(Boolean)
    .join(', ');
}

function sourceUrl(work) {
  return work.primary_location?.landing_page_url || work.doi || work.id || '';
}

function mapWork(work) {
  const abstract = abstractFromIndex(work.abstract_inverted_index);
  return {
    id: work.id,
    title: work.display_name || 'Untitled work',
    authors: formatAuthors(work.authorships),
    year: work.publication_year || '',
    doi: work.doi || '',
    sourceUrl: sourceUrl(work),
    citedByCount: work.cited_by_count || 0,
    abstract,
    relevance: abstract
      ? 'Candidate reference from external scholarly search. Review before relying on it.'
      : 'Candidate reference from external scholarly search. Abstract unavailable; review source before relying on it.',
  };
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

  const query = String(body.query || '').trim();
  if (query.length < 3) return json({ error: 'Search query is too short.' }, { status: 400 });

  const params = new URLSearchParams({
    search: query,
    per_page: '8',
    select: 'id,display_name,publication_year,doi,primary_location,authorships,cited_by_count,abstract_inverted_index',
  });
  const response = await fetch(`https://api.openalex.org/works?${params.toString()}`, {
    headers: {
      accept: 'application/json',
    },
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return json({ error: data.error || 'Paper search failed.' }, { status: 502 });
  }

  return json({
    query,
    source: 'OpenAlex',
    results: (data.results || []).map(mapWork),
  });
};

export const config = {
  path: '/api/paper-search',
};
