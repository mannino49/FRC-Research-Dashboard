// GET  /api/people  → returns the stored people map (or null if never saved)
// PUT  /api/people  → replaces the stored people map with the request body
//
// Storage: single blob in the "frc-dashboard" store, key "people".

import { getStore } from '@netlify/blobs';

const STORE_NAME = 'frc-dashboard';
const KEY = 'people';

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
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return json({ error: 'expected an object map of people' }, { status: 400 });
    }
    await store.setJSON(KEY, body);
    return json({ ok: true, count: Object.keys(body).length });
  }

  return json({ error: 'method not allowed' }, { status: 405, headers: { allow: 'GET, PUT' } });
};

export const config = {
  path: '/api/people',
};
