import { describe, expect, it } from 'vitest';
import { reviewedChanges, validateSuggestedUpdate } from './projectUpdate.js';

const people = [{ id: 'MM' }, { id: 'SK' }];
const before = { status: 'Drafting', turn: 'MM', note: 'Revise introduction.' };

describe('reviewed project updates', () => {
  it('sends only reviewed differences and their original values', () => {
    const after = { ...before, turn: 'SK', note: 'Review Friday.', title: 'Ignored' };
    expect(reviewedChanges(before, after)).toEqual({
      expected: { turn: 'MM', note: 'Revise introduction.' },
      changes: { turn: 'SK', note: 'Review Friday.' },
    });
    expect(reviewedChanges(before, before)).toEqual({ expected: {}, changes: {} });
  });

  it('allows a history-only suggestion and limits proposals to supported fields', () => {
    expect(validateSuggestedUpdate({ turn: null, status: null, note: null }, people)).toEqual({});
    expect(validateSuggestedUpdate({ turn: 'SK', status: null, note: 'Review Friday.', title: 'Ignore me' }, people))
      .toEqual({ turn: 'SK', note: 'Review Friday.' });
  });

  it('rejects ambiguous or malformed model output instead of applying it', () => {
    for (const proposal of [null, {}, { turn: 'unknown', status: null, note: null },
      { turn: 'MM', status: 'complete', note: null }, { turn: null, status: null, note: 1 }]) {
      expect(validateSuggestedUpdate(proposal, people)).toBeNull();
    }
  });
});
