import React from 'react';
import MeetingPrep from './MeetingPrep.jsx';
import { STATUSES, fmtDate, personById, typeWord } from '../utils.js';

export default function Home({ people, projects, connected, query, onSearch, onOpen, onPatch }) {
  const [expanded, setExpanded] = React.useState(null);
  const focusAfterMove = React.useRef(null);
  React.useLayoutEffect(() => {
    if (focusAfterMove.current) {
      (document.getElementById(`ledger-row-${focusAfterMove.current}`) || document.getElementById('ledger-search'))?.focus();
      focusAfterMove.current = null;
    }
  }, [projects]);
  const needle = query.trim().toLowerCase();
  const visible = projects.filter((p) => {
    if (!needle) return true;
    const names = [p.turn, p.waitingOn, ...p.coauthors].filter(Boolean)
      .map((id) => [id, personById(people, id)?.name].join(' '));
    return [p.title, p.status, p.type, p.note, p.notes, p.venue, p.domain, ...(p.tags || []), ...names]
      .filter(Boolean).join(' ').toLowerCase().includes(needle);
  }).sort((a, b) => b.updated.localeCompare(a.updated));

  return (
    <main className="project-ledger">
      <div className="ledger-tools">
        <input id="ledger-search" type="search" aria-label="Search projects" placeholder="Search projects" value={query}
          onChange={(event) => onSearch(event.target.value)} />
        <span role="status">{needle ? `${visible.length} of ` : ''}{projects.length} {projects.length === 1 ? 'project' : 'projects'}</span>
      </div>
      <MeetingPrep projects={projects} people={people} connected={connected} onOpen={onOpen} />
      {visible.length > 0 && <div className="ledger-owner-heading">Whose turn</div>}
      {STATUSES.map((status) => {
        const items = visible.filter((p) => p.status === status);
        if (!items.length && (needle || !projects.length)) return null;
        return (
          <section key={status} className="ledger-group" aria-label={status}>
            <h2>{status} <span>{items.length}</span></h2>
            <div>
              {items.map((p) => (
                <div className="ledger-item" key={p.id}>
                  <button id={`ledger-row-${p.id}`} className="ledger-project" aria-expanded={expanded === p.id}
                    onClick={() => setExpanded(expanded === p.id ? null : p.id)}>
                    <span className="ledger-title">{p.title}</span>
                    <span className="ledger-owner">{personById(people, p.turn)?.name || p.turn}</span>
                    {p.note && <span className="ledger-next">{p.note}</span>}
                  </button>
                  {expanded === p.id && (
                    <div className="ledger-details">
                      <dl>
                        <dt>Status</dt>
                        <dd>
                          <select aria-label={`Status for ${p.title}`} value={p.status} onChange={(e) => {
                            focusAfterMove.current = p.id;
                            onPatch(p.id, { status: e.target.value, updated: new Date().toISOString().slice(0, 10) });
                          }}>
                            {STATUSES.map((value) => <option key={value}>{value}</option>)}
                          </select>
                        </dd>
                        <dt>Type</dt><dd>{typeWord(p.type)}</dd>
                        {p.coauthors.length > 0 && <><dt>Co-authors</dt><dd>{p.coauthors.map((id) => people[id]?.name || id).join(', ')}</dd></>}
                        {p.venue && p.venue !== 'unplaced' && <><dt>Venue</dt><dd>{p.venueUrl ? <a href={p.venueUrl} target="_blank" rel="noreferrer">{p.venue}</a> : p.venue}</dd></>}
                        <dt>Updated</dt><dd>{fmtDate(p.updated)}, {p.updated.slice(0, 4)}</dd>
                      </dl>
                      <button className="ledger-open" onClick={() => onOpen(p.id)}>Open project</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        );
      })}
      {!visible.length && <p className="empty-state">{needle ? 'No projects match your search.' : 'No projects yet.'}</p>}
    </main>
  );
}
