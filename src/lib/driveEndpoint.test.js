import { describe, expect, it } from 'vitest';
import driveAsk from '../../netlify/functions/drive-ask.mjs';
import driveSync from '../../netlify/functions/drive-sync.mjs';

describe('Drive endpoints', () => {
  it('rejects non-POST sync requests', async () => {
    const response = await driveSync(new Request('https://example.test/api/drive-sync', { method: 'GET' }));
    const body = await response.json();

    expect(response.status).toBe(405);
    expect(body.error).toBe('method not allowed');
  });

  it('rejects non-POST ask requests', async () => {
    const response = await driveAsk(new Request('https://example.test/api/drive-ask', { method: 'GET' }));
    const body = await response.json();

    expect(response.status).toBe(405);
    expect(body.error).toBe('method not allowed');
  });
});
