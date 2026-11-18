import { afterEach, describe, expect, it, vi } from 'vitest';
import ai from '../../netlify/functions/ai.mjs';

describe('AI endpoint', () => {
  it('rejects non-POST requests', async () => {
    const response = await ai(new Request('https://example.test/api/ai', { method: 'GET' }));
    const body = await response.json();

    expect(response.status).toBe(405);
    expect(body.error).toBe('method not allowed');
  });

  it('rejects unsupported actions before calling OpenAI', async () => {
    const response = await ai(new Request('https://example.test/api/ai', {
      method: 'POST',
      headers: {
        authorization: 'Bearer demo',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        action: 'draft_outline',
        context: { title: 'Demo' },
        prompt: 'Project: Demo',
      }),
    }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('unsupported action');
  });
});

describe('project update preview', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  async function preview(fetchMock, token = 'session') {
    vi.stubEnv('OPENAI_API_KEY', 'test-key');
    vi.stubEnv('VITE_SUPABASE_URL', 'https://db.example.test');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-public');
    vi.stubGlobal('fetch', fetchMock);
    vi.resetModules();
    const { default: handler } = await import('../../netlify/functions/ai.mjs');
    return handler(new Request('https://example.test/api/ai', {
      method: 'POST',
      headers: token ? { authorization: `Bearer ${token}` } : {},
      body: JSON.stringify({
        action: 'preview_project_update', sentence: 'Steven will review Friday.', author: 'MM',
        current: { status: 'Drafting / Idea', turn: 'MM', note: '' },
        people: [{ id: 'MM', name: 'Michael' }, { id: 'SK', name: 'Steven' }],
      }),
    }));
  }

  it('requires a session before requesting suggestions', async () => {
    const fetchMock = vi.fn();
    expect((await preview(fetchMock, '')).status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns proposed edits without writing a project, history entry, or AI draft', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ id: 'user' }))
      .mockResolvedValueOnce(Response.json({ output_text: JSON.stringify({ turn: 'SK', note: 'Review Friday.', status: null }) }));
    const response = await preview(fetchMock);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ changes: { turn: 'SK', note: 'Review Friday.' } });
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'https://db.example.test/auth/v1/user', 'https://api.openai.com/v1/responses',
    ]);
  });
});
