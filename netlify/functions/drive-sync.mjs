import { extractText, googleAccessToken, isSupportedDriveFile, json, listFolder, requireSupabaseUser, toDriveDocument } from '../shared/drive-utils.mjs';

const DEFAULT_FOLDER_ID = '1KfCxeMtT_2aTUPGTPNAdyGhOxYlSmSwi';
const EXTRACTION_CONCURRENCY = 3;

async function loadExistingDocuments(auth) {
  const response = await fetch(`${auth.supabaseUrl}/rest/v1/drive_documents?select=file_id,modified_at,indexed_at`, {
    headers: {
      apikey: auth.supabaseAnonKey,
      authorization: `Bearer ${auth.token}`,
    },
  });
  const data = await response.json().catch(() => []);
  if (!response.ok) {
    throw new Error(data.message || data.error || 'Failed to load existing Drive index.');
  }
  return new Map((data || []).map((doc) => [doc.file_id, doc]));
}

function sameModifiedTime(a, b) {
  if (!a || !b) return false;
  return new Date(a).getTime() === new Date(b).getTime();
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

async function extractChangedDocuments(files, existing, accessToken) {
  const documents = [];
  const failed = [];
  const unchanged = [];
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < files.length) {
      const file = files[nextIndex];
      nextIndex += 1;
      const current = existing.get(file.id);
      if (current && sameModifiedTime(current.modified_at, file.modifiedTime)) {
        unchanged.push({ id: file.id, name: file.name, mimeType: file.mimeType });
        continue;
      }
      try {
        const text = await extractText(file, accessToken);
        documents.push(toDriveDocument(file, text));
      } catch (error) {
        failed.push({
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          error: error.message || 'Extraction failed.',
        });
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(EXTRACTION_CONCURRENCY, files.length) }, worker));
  return { documents, failed, unchanged };
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
    const existing = await loadExistingDocuments(auth);
    const files = await listFolder(folderId, accessToken);
    const skipped = [];
    const supported = [];

    for (const file of files) {
      if (!isSupportedDriveFile(file)) {
        skipped.push({ id: file.id, name: file.name, mimeType: file.mimeType });
        continue;
      }
      supported.push(file);
    }

    const { documents, failed, unchanged } = await extractChangedDocuments(supported, existing, accessToken);
    const saved = await upsertDocuments(auth, documents);
    return json({
      folderId,
      scanned: files.length,
      supported: supported.length,
      indexed: saved.length,
      unchanged: unchanged.length,
      skipped: skipped.length,
      failed: failed.length,
      unsupportedSamples: skipped.slice(0, 12),
      failedSamples: failed.slice(0, 12),
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
