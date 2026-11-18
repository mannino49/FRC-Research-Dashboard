import { describe, expect, it } from 'vitest';
import { checkedMeetingItems, formatMeetingBrief, meetingPapers } from './meetingBrief.js';

const project = { id: 'paper', type: 'paper', title: 'Sample paper', status: 'In review', note: 'Choose a journal together.',
  turn: 'MM', coauthors: ['SK'], drafts: [], history: [] };
const people = { MM: { name: 'Michael Mannino' }, SK: { name: 'Steven Kotler' } };
const papers = meetingPapers([project], people);
const item = { projectId: project.id, kind: 'decision_needed', question: 'Which journal should we choose?',
  preparation: 'Consider the journal audience.', sourceIndex: 0, quote: 'Choose a journal together.' };

describe('meeting brief review', () => {
  it('uses active papers with substantive sources and preserves the recorded owner', () => {
    expect(meetingPapers([project, { ...project, status: 'Published' }, { ...project, type: 'applied' },
      { ...project, note: '', history: [{ t: 'Project created.' }] }], people)).toEqual(papers);
    expect(papers).toHaveLength(1);
    expect(papers[0]).toMatchObject({ owner: 'Michael Mannino', coauthors: ['Steven Kotler'] });
  });

  it('requires an exact quote from the selected paper and unique paper references', () => {
    expect(checkedMeetingItems({ items: [item] }, papers)).toEqual([item]);
    expect(checkedMeetingItems({ items: [] }, papers)).toEqual([]);
    for (const invalid of [[{ ...item, projectId: 'unknown' }], [{ ...item, quote: 'A made-up decision.' }],
      [{ ...item, sourceIndex: 2 }], [item, item]]) {
      expect(checkedMeetingItems({ items: invalid }, papers)).toBeNull();
    }
  });

  it('labels suggested questions and builds the review references from the project record', () => {
    const draft = formatMeetingBrief([{ ...item, kind: 'suggested_question' }], papers);
    expect(draft.text).toContain('Suggested question');
    expect(draft.text).toContain('Current turn — Michael Mannino');
    expect(draft.references[0].source).toEqual(papers[0].sources[0]);
  });
});
