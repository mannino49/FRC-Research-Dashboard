import { describe, expect, it } from 'vitest';
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
