import { describe, expect, it } from 'vitest';
import ai from './ai.mjs';

describe('AI endpoint', () => {
  it('rejects non-POST requests', async () => {
    const response = await ai(new Request('https://example.test/api/ai', { method: 'GET' }));
    const body = await response.json();

    expect(response.status).toBe(405);
    expect(body.error).toBe('method not allowed');
  });
});
