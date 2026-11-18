import { STATUSES } from '../utils.js';

export function updateFields(project) {
  return { status: project.status, turn: project.turn, note: project.note || '' };
}

export function reviewedChanges(before, after) {
  const expected = {};
  const changes = {};
  for (const field of ['status', 'turn', 'note']) {
    if (after[field] !== before[field]) {
      expected[field] = before[field];
      changes[field] = after[field];
    }
  }
  return { expected, changes };
}

export const updateSchema = {
  type: 'object',
  properties: {
    status: { type: ['string', 'null'], enum: [...STATUSES, null] },
    turn: { type: ['string', 'null'] },
    note: { type: ['string', 'null'] },
  },
  additionalProperties: false,
  required: ['status', 'turn', 'note'],
};

export function validateSuggestedUpdate(proposal, people) {
  if (!proposal || !['status', 'turn', 'note'].every((key) => Object.hasOwn(proposal, key))) return null;
  if (proposal.status !== null && !STATUSES.includes(proposal.status)) return null;
  if (proposal.turn !== null && !people.some((person) => person.id === proposal.turn)) return null;
  if (proposal.note !== null && (typeof proposal.note !== 'string' || !proposal.note.trim())) return null;
  return Object.fromEntries(Object.entries(proposal).filter(([key, value]) => Object.hasOwn(updateSchema.properties, key) && value !== null));
}
