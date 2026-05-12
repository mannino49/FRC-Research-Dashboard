import { getSupabaseAccessToken } from './supabaseClient.js';

export async function searchReferencePapers(query) {
  const accessToken = await getSupabaseAccessToken();
  if (!accessToken) throw new Error('Sign in before searching references.');

  const response = await fetch('/api/paper-search', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ query }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Paper search failed.');
  return data;
}
