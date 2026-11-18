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

export async function previewProjectUpdate(sentence, current, people, author) {
  const token = await getSupabaseAccessToken();
  if (!token) throw new Error('AI suggestions require a signed-in session.');
  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ action: 'preview_project_update', sentence, current, people, author }),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.changes) throw new Error('AI suggestions are unavailable.');
  return result.changes;
}

export async function draftMeetingBrief(papers, since) {
  const token = await getSupabaseAccessToken();
  if (!token) throw new Error('Sign in to generate a meeting brief.');
  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ action: 'draft_meeting_brief', papers, since }),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !Array.isArray(result?.items)) throw new Error(result?.error || 'Could not generate a meeting brief. Try again.');
  return result.items;
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
