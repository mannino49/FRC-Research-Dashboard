import { describe, expect, it } from 'vitest';
import paperSearch from '../../netlify/functions/paper-search.mjs';

describe('paper search endpoint', () => {
  it('rejects non-POST requests', async () => {
    const response = await paperSearch(new Request('https://example.test/api/paper-search', { method: 'GET' }));
    const body = await response.json();

    expect(response.status).toBe(405);
    expect(body.error).toBe('method not allowed');
  });
});
