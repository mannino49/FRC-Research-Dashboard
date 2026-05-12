import crypto from 'node:crypto';
import mammoth from 'mammoth';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.readonly';

export function json(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
      ...(init.headers || {}),
    },
  });
}

export async function requireSupabaseUser(req, env = process.env) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return { error: 'Missing Supabase session.', status: 401 };

  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return { error: 'Supabase env vars are not configured.', status: 500 };

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: supabaseAnonKey,
      authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) return { error: 'Invalid Supabase session.', status: 401 };
  return { user: await response.json(), token, supabaseUrl, supabaseAnonKey };
}

function b64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function servicePrivateKey(env) {
  return (env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
}

export async function googleAccessToken(env = process.env) {
  const email = env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = servicePrivateKey(env);
  if (!email || !privateKey) {
    throw new Error('Google Drive service account env vars are not configured.');
  }

  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({
    iss: email,
    scope: DRIVE_SCOPE,
    aud: TOKEN_URL,
    exp: now + 3600,
    iat: now,
  }));
  const unsigned = `${header}.${claim}`;
  const signature = crypto.createSign('RSA-SHA256').update(unsigned).sign(privateKey, 'base64url');
  const assertion = `${unsigned}.${signature}`;

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error_description || data.error || 'Google auth failed.');
  return data.access_token;
}

async function driveFetch(path, accessToken, params = {}) {
  const url = new URL(`${DRIVE_API}${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Google Drive request failed: ${response.status} ${text.slice(0, 200)}`);
  }
  return response;
}

export async function listFolder(folderId, accessToken, folderPath = '') {
  const files = [];
  let pageToken = '';

  do {
    const response = await driveFetch('/files', accessToken, {
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'nextPageToken,files(id,name,mimeType,modifiedTime,webViewLink)',
      pageSize: '1000',
      supportsAllDrives: 'true',
      includeItemsFromAllDrives: 'true',
      ...(pageToken ? { pageToken } : {}),
    });
    const data = await response.json();
    for (const file of data.files || []) {
      const path = folderPath ? `${folderPath}/${file.name}` : file.name;
      if (file.mimeType === 'application/vnd.google-apps.folder') {
        files.push(...await listFolder(file.id, accessToken, path));
      } else {
        files.push({ ...file, folderPath });
      }
    }
    pageToken = data.nextPageToken || '';
  } while (pageToken);

  return files;
}

export async function extractText(file, accessToken) {
  if (file.mimeType === 'application/vnd.google-apps.document') {
    const response = await driveFetch(`/files/${file.id}/export`, accessToken, { mimeType: 'text/plain' });
    return response.text();
  }

  if (file.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const response = await driveFetch(`/files/${file.id}`, accessToken, { alt: 'media', supportsAllDrives: 'true' });
    const buffer = Buffer.from(await response.arrayBuffer());
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  }

  if (file.mimeType === 'text/plain') {
    const response = await driveFetch(`/files/${file.id}`, accessToken, { alt: 'media', supportsAllDrives: 'true' });
    return response.text();
  }

  return '';
}

export function inferVersion(name, modifiedTime) {
  const lower = name.toLowerCase();
  const explicit = lower.match(/\b(v|version)[_\s-]?(\d+(?:[._-]\d+)*)\b/);
  if (explicit) return explicit[0].replace(/_/g, ' ');
  if (lower.includes('latest')) return 'latest';
  if (lower.includes('final')) return 'final';
  if (lower.includes('proof')) return 'proof';
  if (lower.includes('submitted')) return 'submitted';
  if (modifiedTime) return `modified ${modifiedTime.slice(0, 10)}`;
  return '';
}

export function inferProject(name, folderPath = '') {
  const text = `${folderPath} ${name}`.toLowerCase();
  const guesses = [
    ['moral cognition', ['moralcognition', 'moral cognition', 'alignment']],
    ['ketamine', ['ketamine']],
    ['metastability', ['metastability', 'metastable']],
    ['simultaneous hallucination', ['simultaneoushallucination', 'simultaenoushallucination', 'hallucination']],
    ['ptsd / flow recovery', ['ptsd', 'trauma', 'restoring metastability']],
    ['aicf paper', ['aicf']],
  ];
  const match = guesses.find(([, terms]) => terms.some((term) => text.includes(term)));
  return match?.[0] || folderPath.split('/')[0] || '';
}

export function toDriveDocument(file, text) {
  const normalized = (text || '').replace(/\s+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  return {
    file_id: file.id,
    name: file.name,
    mime_type: file.mimeType,
    web_url: file.webViewLink || `https://drive.google.com/open?id=${file.id}`,
    folder_path: file.folderPath || '',
    modified_at: file.modifiedTime || null,
    project_guess: inferProject(file.name, file.folderPath),
    version_guess: inferVersion(file.name, file.modifiedTime),
    text_content: normalized,
    text_excerpt: normalized.slice(0, 1800),
  };
}
