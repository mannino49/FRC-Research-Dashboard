import { buildProjectContext, projectContextToPrompt } from './aiContext.js';
import { getSupabaseAccessToken } from './supabaseClient.js';

export async function runProjectAiAction(project, people, actionId, options = {}) {
  const context = buildProjectContext(project, people);
  const prompt = projectContextToPrompt(context);
  const accessToken = await getSupabaseAccessToken();
  if (!accessToken) throw new Error('Sign in before using AI.');

  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      action: actionId,
      context,
      prompt,
      question: options.question || '',
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'AI request failed.');

  return {
    ...data,
    prompt,
  };
}

export async function scoutProjectCollaborators(project, people) {
  const context = buildProjectContext(project, people);
  const prompt = projectContextToPrompt(context);
  const accessToken = await getSupabaseAccessToken();
  if (!accessToken) throw new Error('Sign in before scouting collaborators.');

  const response = await fetch('/api/collaborator-scout', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ context, prompt }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Collaborator scout failed.');

  return {
    ...data,
    prompt,
  };
}
