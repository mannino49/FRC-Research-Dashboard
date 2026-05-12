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
  const papers = (project.papers || [])
    .slice(0, 8)
    .map((paper) => ({
      title: paper.title,
      authors: paper.authors || '',
      year: paper.year || '',
      status: paper.status || '',
      version: paper.version || '',
      doi: paper.doi || '',
      sourceUrl: paper.sourceUrl || '',
      driveUrl: paper.driveUrl || '',
      abstract: paper.abstract || '',
      keyFindings: paper.keyFindings || '',
      methods: paper.methods || '',
      quotesNotes: paper.quotesNotes || '',
      relevance: paper.relevance || '',
      relevanceNote: paper.relevanceNote || '',
    }));

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
    papers,
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
    context.papers?.length ? `Research memory:\n${context.papers.map(paperToPrompt).join('\n\n')}` : '',
    context.history.length ? `Recent history:\n${context.history.join('\n')}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
}

function paperToPrompt(paper) {
  return [
    `Paper: ${paper.title}`,
    paper.authors ? `Authors: ${paper.authors}` : '',
    paper.year ? `Year: ${paper.year}` : '',
    paper.status ? `Status: ${paper.status}` : '',
    paper.version ? `Version: ${paper.version}` : '',
    paper.doi ? `DOI: ${paper.doi}` : '',
    paper.sourceUrl ? `Source: ${paper.sourceUrl}` : '',
    paper.driveUrl ? `Drive file: ${paper.driveUrl}` : '',
    paper.abstract ? `Abstract/summary: ${paper.abstract}` : '',
    paper.keyFindings ? `Key findings: ${paper.keyFindings}` : '',
    paper.methods ? `Methods/evidence: ${paper.methods}` : '',
    paper.quotesNotes ? `Quotes/notes: ${paper.quotesNotes}` : '',
    paper.relevance ? `Relevance: ${paper.relevance}` : '',
    paper.relevanceNote ? `Project-specific note: ${paper.relevanceNote}` : '',
  ].filter(Boolean).join('\n');
}
