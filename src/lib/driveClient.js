import { getSupabaseAccessToken } from './supabaseClient.js';

async function authedPost(path, body) {
  const accessToken = await getSupabaseAccessToken();
  if (!accessToken) throw new Error('Sign in before using the Research Drive assistant.');

  const response = await fetch(path, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body || {}),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed.');
  return data;
}

export function syncResearchDrive(folderId) {
  return authedPost('/api/drive-sync', { folderId });
}

export function askResearchDrive(question) {
  return authedPost('/api/drive-ask', { question });
}
