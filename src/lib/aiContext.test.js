import { describe, expect, it } from 'vitest';
import { PEOPLE, PROJECTS } from '../data/seedData.js';
import { AI_ACTIONS, getAiAction } from './aiActions.js';
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

  it('includes linked research memory in the AI prompt', () => {
    const project = {
      ...PROJECTS.find((item) => item.id === 'p583'),
      papers: [
        {
          title: 'Flow and Attention Review',
          authors: 'Example Author',
          year: 2024,
          abstract: 'A short summary of flow and attentional control.',
          keyFindings: 'Flow is associated with altered attention and perceived effort.',
          relevance: 'Useful background for the computational model.',
        },
      ],
    };
    const context = buildProjectContext(project, PEOPLE);
    const prompt = projectContextToPrompt(context);

    expect(prompt).toContain('Research memory:');
    expect(prompt).toContain('Paper: Flow and Attention Review');
    expect(prompt).toContain('Key findings: Flow is associated');
  });

  it('includes linked manuscript draft memory in the AI prompt', () => {
    const project = {
      ...PROJECTS.find((item) => item.id === 'p583'),
      drafts: [
        {
          title: 'Computational Model Draft',
          version: 'v2',
          status: 'revising',
          section: 'Introduction',
          driveUrl: 'https://docs.google.com/document/d/demo',
          summary: 'The introduction frames flow as a dynamical control problem.',
          openTasks: 'Write the next paragraph connecting active inference to attentional control.',
        },
      ],
    };
    const context = buildProjectContext(project, PEOPLE);
    const prompt = projectContextToPrompt(context);

    expect(prompt).toContain('Manuscript versions:');
    expect(prompt).toContain('Draft: Computational Model Draft');
    expect(prompt).toContain('Open writing tasks: Write the next paragraph');
  });

  it('includes relevant synced Drive documents in the AI prompt', () => {
    const project = {
      ...PROJECTS.find((item) => item.id === 'p8708'),
      driveDocuments: [
        {
          name: 'MoralCognition_Intro_sk_v6_2.docx',
          url: 'https://docs.google.com/document/d/demo',
          projectGuess: 'moral cognition',
          versionGuess: 'v6_2',
          modifiedAt: '2026-04-15T13:37:50.000Z',
          excerpt: 'AI alignment is among the most consequential open problems.',
        },
      ],
    };
    const context = buildProjectContext(project, PEOPLE);
    const prompt = projectContextToPrompt(context);

    expect(prompt).toContain('Synced Research Drive documents relevant to this project:');
    expect(prompt).toContain('Drive document: MoralCognition_Intro_sk_v6_2.docx');
    expect(prompt).toContain('AI alignment is among the most consequential');
  });

  it('defines operational prompt actions for current dashboard data', () => {
    expect(AI_ACTIONS.map((action) => action.id)).toEqual([
      'summarize_status',
      'recommend_next_action',
      'identify_stalled_waiting',
      'draft_followup_email',
      'history_progress_note',
      'flag_missing_metadata',
      'summarize_manuscript_status',
      'write_next_paragraph',
      'ask_manuscript_question',
      'suggest_reference_papers',
    ]);
    expect(getAiAction('draft_followup_email')?.instruction).toContain('subject line');
  });
});
