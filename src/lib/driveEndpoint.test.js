import { describe, expect, it } from 'vitest';
import collaboratorScout from '../../netlify/functions/collaborator-scout.mjs';
import driveAsk from '../../netlify/functions/drive-ask.mjs';
import driveSuggest from '../../netlify/functions/drive-suggest.mjs';
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

  it('rejects non-POST suggestion requests', async () => {
    const response = await driveSuggest(new Request('https://example.test/api/drive-suggest', { method: 'GET' }));
    const body = await response.json();

    expect(response.status).toBe(405);
    expect(body.error).toBe('method not allowed');
  });

  it('requires a session before generating suggestions', async () => {
    const response = await driveSuggest(new Request('https://example.test/api/drive-suggest', {
      method: 'POST',
      body: JSON.stringify({ projects: [] }),
    }));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Missing Supabase session.');
  });

  it('rejects non-POST collaborator scout requests', async () => {
    const response = await collaboratorScout(new Request('https://example.test/api/collaborator-scout', { method: 'GET' }));
    const body = await response.json();

    expect(response.status).toBe(405);
    expect(body.error).toBe('method not allowed');
  });
});
