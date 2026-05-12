export const AI_ACTIONS = [
  {
    id: 'summarize_status',
    title: 'Summarize project status',
    verb: 'Summarizing...',
    outputType: 'status_summary',
    description: 'Create a concise operational readout from the dashboard record.',
    instruction:
      'Summarize the current project status as an operational readout. Include what the project is, where it stands, who is involved, current blocker or handoff if any, and what information is missing. Keep it concise and do not invent research details.',
  },
  {
    id: 'recommend_next_action',
    title: 'Recommend next action',
    verb: 'Thinking...',
    outputType: 'next_action',
    description: 'Recommend the single most useful next move.',
    instruction:
      'Recommend the single most useful next action for this project. Explain why it is the next move, who should own it when the dashboard context suggests an owner, and what would count as done. If the context is too thin, say what detail is needed.',
  },
  {
    id: 'identify_stalled_waiting',
    title: 'Identify stalled/waiting projects',
    verb: 'Checking...',
    outputType: 'stalled_waiting_check',
    description: 'Check whether this project appears blocked, stale, or waiting.',
    instruction:
      'Evaluate whether this project appears stalled, waiting, or blocked based only on the dashboard context. Name the signal, likely reason, responsible handoff if visible, and a practical unblock step. If it does not appear stalled, say that clearly.',
  },
  {
    id: 'draft_followup_email',
    title: 'Draft collaborator follow-up email',
    verb: 'Drafting...',
    outputType: 'followup_email',
    description: 'Write a short collaborator follow-up grounded in the record.',
    instruction:
      'Draft a short collaborator follow-up email. Use the project context to make the note specific, polite, and action-oriented. Include a subject line. Do not imply facts, deadlines, attachments, or prior conversations that are not in the dashboard context.',
  },
  {
    id: 'history_progress_note',
    title: 'Turn project history into a clean progress note',
    verb: 'Writing...',
    outputType: 'progress_note',
    description: 'Convert recent history into a tidy progress update.',
    instruction:
      'Turn the recent project history into a clean progress note. Separate completed movement, current state, open questions, and next step. Preserve uncertainty and avoid adding research substance that is not present.',
  },
  {
    id: 'flag_missing_metadata',
    title: 'Flag missing metadata or broken organization',
    verb: 'Auditing...',
    outputType: 'metadata_audit',
    description: 'Find missing fields, weak organization, or cleanup needs.',
    instruction:
      'Audit this dashboard record for missing metadata, weak organization, broken links or labels, unclear ownership, and fields that would make the project easier to manage. Return a prioritized checklist.',
  },
];

export const AI_OUTPUT_TYPES = AI_ACTIONS.map((action) => action.outputType);

export const AI_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    headline: {
      type: 'string',
      description: 'A short title for the output.',
    },
    summary: {
      type: 'string',
      description: 'A concise plain-English summary of the recommendation or readout.',
    },
    sections: {
      type: 'array',
      description: 'Readable sections to show in the dashboard.',
      items: {
        type: 'object',
        properties: {
          heading: { type: 'string' },
          body: { type: 'string' },
          items: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['heading', 'body', 'items'],
        additionalProperties: false,
      },
    },
    nextSteps: {
      type: 'array',
      description: 'Concrete next steps, if any.',
      items: { type: 'string' },
    },
    missingContext: {
      type: 'array',
      description: 'Important missing details that limit confidence.',
      items: { type: 'string' },
    },
  },
  required: ['headline', 'summary', 'sections', 'nextSteps', 'missingContext'],
  additionalProperties: false,
};

export function getAiAction(actionId) {
  return AI_ACTIONS.find((action) => action.id === actionId);
}

export function formatAiStructuredOutput(output) {
  if (!output) return '';

  const lines = [];
  if (output.headline) lines.push(`# ${output.headline}`);
  if (output.summary) lines.push(output.summary);

  for (const section of output.sections || []) {
    if (section.heading) lines.push(`## ${section.heading}`);
    if (section.body) lines.push(section.body);
    for (const item of section.items || []) lines.push(`- ${item}`);
  }

  if (output.nextSteps?.length) {
    lines.push('## Next steps');
    for (const step of output.nextSteps) lines.push(`- ${step}`);
  }

  if (output.missingContext?.length) {
    lines.push('## Missing context');
    for (const item of output.missingContext) lines.push(`- ${item}`);
  }

  return lines.join('\n\n');
}
