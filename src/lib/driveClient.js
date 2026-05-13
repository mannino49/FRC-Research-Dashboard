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

  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }
  if (!response.ok) {
    const detail = data.error || text || response.statusText || 'Request failed.';
    throw new Error(`${detail} (${response.status})`);
  }
  return data;
}

export function syncResearchDrive(folderId) {
  return authedPost('/api/drive-sync', { folderId });
}

export function askResearchDrive(question) {
  return authedPost('/api/drive-ask', { question });
}
