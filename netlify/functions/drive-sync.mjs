import { extractText, googleAccessToken, json, listFolder, requireSupabaseUser, toDriveDocument } from '../shared/drive-utils.mjs';

const DEFAULT_FOLDER_ID = '1KfCxeMtT_2aTUPGTPNAdyGhOxYlSmSwi';

function supported(file) {
  return [
    'application/vnd.google-apps.document',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ].includes(file.mimeType);
}

async function upsertDocuments(auth, documents) {
  if (!documents.length) return [];
  const response = await fetch(`${auth.supabaseUrl}/rest/v1/drive_documents?on_conflict=file_id`, {
    method: 'POST',
    headers: {
      apikey: auth.supabaseAnonKey,
      authorization: `Bearer ${auth.token}`,
      'content-type': 'application/json',
      prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(documents),
  });
  const data = await response.json().catch(() => []);
  if (!response.ok) {
    throw new Error(data.message || data.error || 'Failed to save Drive index.');
  }
  return data;
}

export default async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'method not allowed' }, { status: 405, headers: { allow: 'POST' } });
  }

  const auth = await requireSupabaseUser(req);
  if (auth.error) return json({ error: auth.error }, { status: auth.status });

  let body = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  try {
    const accessToken = await googleAccessToken();
    const folderId = body.folderId || process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || DEFAULT_FOLDER_ID;
    const files = await listFolder(folderId, accessToken);
    const documents = [];
    const skipped = [];

    for (const file of files) {
      if (!supported(file)) {
        skipped.push({ id: file.id, name: file.name, mimeType: file.mimeType });
        continue;
      }
      const text = await extractText(file, accessToken);
      documents.push(toDriveDocument(file, text));
    }

    const saved = await upsertDocuments(auth, documents);
    return json({
      folderId,
      scanned: files.length,
      indexed: saved.length,
      skipped: skipped.length,
      documents: saved.map((doc) => ({
        fileId: doc.file_id,
        name: doc.name,
        projectGuess: doc.project_guess,
        versionGuess: doc.version_guess,
        modifiedAt: doc.modified_at,
      })),
    });
  } catch (error) {
    console.error(error);
    return json({ error: error.message || 'Drive sync failed.' }, { status: 500 });
  }
};

export const config = {
  path: '/api/drive-sync',
};
