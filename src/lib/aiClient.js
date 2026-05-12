import { buildProjectContext, projectContextToPrompt } from './aiContext.js';
import { getSupabaseAccessToken } from './supabaseClient.js';

export async function runProjectAiAction(project, people, actionId) {
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
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'AI request failed.');

  return {
    ...data,
    prompt,
  };
}
