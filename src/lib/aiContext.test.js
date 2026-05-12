import { describe, expect, it } from 'vitest';
import { PEOPLE, PROJECTS } from '../data/seedData.js';
import { buildProjectContext, projectContextToPrompt } from './aiContext.js';

describe('AI project context', () => {
  it('builds a compact prompt from dashboard project data', () => {
    const project = PROJECTS.find((item) => item.id === 'p583');
    const context = buildProjectContext(project, PEOPLE);
    const prompt = projectContextToPrompt(context);

    expect(context.title).toBe('Computational Model of Flow');
    expect(context.turn).toContain('Michael Mannino');
    expect(prompt).toContain('Project: Computational Model of Flow');
    expect(prompt).toContain('Recent history:');
  });
});
