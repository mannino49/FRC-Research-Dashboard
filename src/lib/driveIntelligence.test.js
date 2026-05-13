import { describe, expect, it } from 'vitest';
import {
  aiProjectSuggestionToProject,
  aiUpdateSuggestionToPatch,
  driveProjectSuggestion,
  latestDriveDocument,
  projectSuggestionsFromDrive,
  projectUpdateSuggestions,
} from './driveIntelligence.js';

const docs = [
  {
    fileId: 'old',
    name: 'Flow paper v1.docx',
    url: 'https://drive.test/old',
    projectGuess: 'Flow Paper',
    versionGuess: 'v1',
    modifiedAt: '2026-04-01T10:00:00.000Z',
    indexedAt: '2026-04-02T10:00:00.000Z',
    excerpt: 'Older draft.',
  },
  {
    fileId: 'latest',
    name: 'Flow paper submitted.docx',
    url: 'https://drive.test/latest',
    projectGuess: 'Flow Paper',
    versionGuess: 'submitted',
    modifiedAt: '2026-04-10T10:00:00.000Z',
    indexedAt: '2026-04-11T10:00:00.000Z',
    excerpt: 'Submitted draft.',
  },
];

describe('drive intelligence', () => {
  it('chooses the newest modified Drive document as the latest draft', () => {
    expect(latestDriveDocument(docs).fileId).toBe('latest');
  });

  it('filters project suggestions that already match existing project titles', () => {
    const suggestions = projectSuggestionsFromDrive(docs, [{ title: 'Flow Paper' }]);
    expect(suggestions).toEqual([]);
  });

  it('creates a draft project record only after approval code asks for one', () => {
    const project = driveProjectSuggestion(docs[1]);
    expect(project.title).toBe('Flow Paper');
    expect(project.status).toBe('Submitted');
    expect(project.links[0].url).toBe('https://drive.test/latest');
    expect(project.notes).toContain('Created from an approved Research Drive suggestion.');
  });

  it('suggests explicit updates for an existing project without mutating it', () => {
    const project = {
      title: 'Flow Paper',
      status: 'Idea',
      note: '',
      links: [],
    };

    const suggestions = projectUpdateSuggestions(project, docs);
    expect(suggestions.map((suggestion) => suggestion.label)).toEqual([
      'Add latest Drive link',
      'Set review next action',
      'Mark submitted',
    ]);
    expect(project.links).toEqual([]);
  });

  it('turns approved AI project suggestions into project records', () => {
    const project = aiProjectSuggestionToProject({
      title: 'Metastability Paper',
      type: 'paper',
      status: 'Drafting',
      venue: 'unplaced',
      domain: 'flow',
      tags: ['metastability'],
      nextAction: 'Draft the transition paragraph.',
      notes: 'The indexed file appears to be a working manuscript.',
      sourceFileIds: ['latest'],
      confidence: 'medium',
      rationale: 'The Drive file is a recent draft.',
      missingContext: ['Confirm coauthors.'],
    }, docs);

    expect(project.title).toBe('Metastability Paper');
    expect(project.note).toBe('Draft the transition paragraph.');
    expect(project.links[0].url).toBe('https://drive.test/latest');
    expect(project.notes).toContain('Confirm coauthors.');
  });

  it('turns approved AI update suggestions into narrow patches', () => {
    const patch = aiUpdateSuggestionToPatch({ notes: 'Existing note.' }, {
      patch: {
        status: 'Drafting',
        note: 'Write the next paragraph.',
        notesAppend: 'AI found a newer draft in Drive.',
        domain: 'consciousness',
        tags: ['draft'],
      },
    });

    expect(patch.status).toBe('Drafting');
    expect(patch.note).toBe('Write the next paragraph.');
    expect(patch.notes).toContain('Existing note.');
    expect(patch.notes).toContain('AI found a newer draft in Drive.');
  });
});
