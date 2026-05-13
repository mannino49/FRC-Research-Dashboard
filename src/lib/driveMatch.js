const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'paper',
  'study',
  'project',
  'draft',
  'version',
]);

function tokens(value) {
  return String(value || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function versionWeight(versionGuess = '') {
  const lower = versionGuess.toLowerCase();
  if (lower.includes('latest')) return 8;
  if (lower.includes('final')) return 7;
  if (lower.includes('submitted')) return 6;
  if (lower.includes('proof')) return 5;
  const version = lower.match(/v(?:ersion)?\s*(\d+(?:[._-]\d+)*)/);
  if (!version) return 0;
  return version[1]
    .split(/[._-]/)
    .map((part, index) => Number(part || 0) / Math.pow(10, index))
    .reduce((sum, value) => sum + value, 0);
}

function scoreDriveDocument(project, doc) {
  const projectTokens = new Set(tokens([
    project.title,
    project.domain,
    project.venue,
    ...(project.tags || []),
  ].filter(Boolean).join(' ')));
  if (!projectTokens.size) return 0;

  const docText = [
    doc.name,
    doc.projectGuess,
    doc.versionGuess,
    doc.folderPath,
  ].filter(Boolean).join(' ').toLowerCase();

  let score = 0;
  for (const token of projectTokens) {
    if (docText.includes(token)) score += 3;
  }

  const title = project.title.toLowerCase();
  const projectGuess = String(doc.projectGuess || '').toLowerCase();
  if (projectGuess && title.includes(projectGuess)) score += 6;
  if (projectGuess && projectGuess.split(/\s+/).some((part) => title.includes(part))) score += 2;

  score += versionWeight(doc.versionGuess);
  return score;
}

export function relevantDriveDocuments(project, documents, limit = 5) {
  return (documents || [])
    .map((doc) => ({ ...doc, matchScore: scoreDriveDocument(project, doc) }))
    .filter((doc) => doc.matchScore > 0)
    .sort((a, b) => (
      b.matchScore - a.matchScore ||
      String(b.modifiedAt || '').localeCompare(String(a.modifiedAt || '')) ||
      a.name.localeCompare(b.name)
    ))
    .slice(0, limit);
}
