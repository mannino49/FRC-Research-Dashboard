import { fmtDate, personById, typeWord } from '../utils.js';

export function buildProjectContext(project, people) {
  const turn = personById(people, project.turn);
  const waitingOn = project.waitingOn ? personById(people, project.waitingOn) : null;
  const collaborators = (project.coauthors || [])
    .map((id) => personById(people, id))
    .filter(Boolean);
  const links = (project.links || []).map((link) => `${link.kind}: ${link.url}`);
  const history = (project.history || [])
    .slice(0, 8)
    .map((entry) => {
      const who = personById(people, entry.who);
      return `${fmtDate(entry.d)} · ${who?.initials || entry.who}: ${entry.t}`;
    });

  return {
    id: project.id,
    title: project.title,
    type: typeWord(project.type),
    status: project.status,
    venue: project.venue,
    venueUrl: project.venueUrl || '',
    domain: project.domain || '',
    tags: project.tags || [],
    turn: turn ? `${turn.name} (${turn.initials})` : project.turn,
    waitingOn: waitingOn ? `${waitingOn.name} (${waitingOn.initials})` : '',
    collaborators: collaborators.map((person) => ({
      name: person.name,
      initials: person.initials,
      kind: person.kind,
      affiliation: person.affil || '',
    })),
    nextAction: project.note || '',
    notes: project.notes || '',
    links,
    history,
  };
}

export function projectContextToPrompt(context) {
  return [
    `Project: ${context.title}`,
    `Type: ${context.type}`,
    `Status: ${context.status}`,
    `Venue/destination: ${context.venue}${context.venueUrl ? ` (${context.venueUrl})` : ''}`,
    context.domain ? `Domain: ${context.domain}` : '',
    context.tags.length ? `Tags: ${context.tags.join(', ')}` : '',
    `Current turn: ${context.turn}`,
    context.waitingOn ? `Waiting on: ${context.waitingOn}` : '',
    context.collaborators.length
      ? `Collaborators: ${context.collaborators.map((person) => `${person.name}${person.affiliation ? `, ${person.affiliation}` : ''}`).join('; ')}`
      : 'Collaborators: none listed',
    context.nextAction ? `Next action: ${context.nextAction}` : 'Next action: none listed',
    context.notes ? `Project notes:\n${context.notes}` : '',
    context.links.length ? `Links:\n${context.links.join('\n')}` : '',
    context.history.length ? `Recent history:\n${context.history.join('\n')}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
}
