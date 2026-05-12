import { describe, expect, it } from 'vitest';
import { PEOPLE } from './data/seedData.js';
import { personById, turnLabel, typeWord } from './utils.js';

describe('dashboard helpers', () => {
  it('finds a person by id', () => {
    expect(personById(PEOPLE, 'MM')?.name).toBe('Michael Mannino');
  });

  it('labels external turns distinctly', () => {
    expect(turnLabel(PEOPLE, 'KF')).toBe('KF·ext');
  });

  it('formats known project types', () => {
    expect(typeWord('collaboration')).toBe('Collab.');
  });
});
