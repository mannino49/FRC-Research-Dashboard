// GET  /api/projects  → returns the stored projects array (or null if never saved)
// PUT  /api/projects  → replaces the stored projects array with the request body
//
// Storage: single blob in the "frc-dashboard" store, key "projects".
// Consistency: "strong" so a PUT is immediately readable by the next GET.

import { getStore } from '@netlify/blobs';

const STORE_NAME = 'frc-dashboard';
const KEY = 'projects';

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

export default async (req) => {
  const store = getStore({ name: STORE_NAME, consistency: 'strong' });

  if (req.method === 'GET') {
    const data = await store.get(KEY, { type: 'json' });
    return json(data ?? null);
  }

  if (req.method === 'PUT') {
    let body;
    try {
      body = await req.json();
    } catch {
      return json({ error: 'invalid json' }, { status: 400 });
    }
    if (!Array.isArray(body)) {
      return json({ error: 'expected an array of projects' }, { status: 400 });
    }
    await store.setJSON(KEY, body);
    return json({ ok: true, count: body.length });
  }

  return json({ error: 'method not allowed' }, { status: 405, headers: { allow: 'GET, PUT' } });
};

export const config = {
  path: '/api/projects',
};
