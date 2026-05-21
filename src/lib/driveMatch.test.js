import { describe, expect, it } from 'vitest';
import { relevantDriveDocuments } from './driveMatch.js';

describe('drive matching', () => {
  it('does not let generic version clues match the wrong project', () => {
    const matches = relevantDriveDocuments({
      title: 'Ketamine',
      venue: 'unplaced',
      domain: '',
      tags: [],
    }, [
      {
        fileId: 'metastability-latest',
        name: 'Latest version Metastability paper.docx',
        projectGuess: 'metastability',
        versionGuess: 'latest',
        folderPath: '',
        modifiedAt: '2026-05-14T15:11:27.000Z',
      },
      {
        fileId: 'ketamine',
        name: 'Ketamine, Trauma and Intuition.docx',
        projectGuess: 'ketamine',
        versionGuess: 'modified 2026-04-20',
        folderPath: '',
        modifiedAt: '2026-04-20T14:35:26.000Z',
      },
    ]);

    expect(matches.map((doc) => doc.fileId)).toEqual(['ketamine']);
  });
});
