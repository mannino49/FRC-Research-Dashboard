import React from 'react';
import { TYPES, classNames, personById, typeMark, typeWord } from '../utils.js';

export function People({ people, projects, onOpenProject }) {
  const all = Object.entries(people).filter(([, p]) => p.kind === 'external');
  function projectsOf(id) {
    return projects.filter((p) => p.coauthors.includes(id));
  }
  function activeOf(id) {
    return projects.filter((p) => p.coauthors.includes(id) && p.turn === id);
  }

  return (
    <section className="people">
      <div className="section-head" style={{ paddingTop: 28 }}>
        <span className="numeral">I.</span>
        <span className="title">External co-authors</span>
        <span className="count">{all.length} people</span>
      </div>
      {all.map(([id, pr]) => {
        const ps = projectsOf(id);
        const acts = activeOf(id);
        return (
          <div className="person" key={id} onClick={() => ps[0] && onOpenProject(ps[0].id)}>
            <span className="init">{pr.initials}</span>
            <span className="nm">
              <div className="n">{pr.name}</div>
              <div className="aff">{pr.affil}</div>
            </span>
            <span className="projs">
              {ps.length} {ps.length === 1 ? 'project' : 'projects'}
              {ps.length > 0 && (
                <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--ink-2)', textTransform: 'none', letterSpacing: 0, fontSize: 'var(--fs-sm)', marginTop: 4 }}>
                  {ps.map((p) => p.title).slice(0, 2).join(' · ')}
                  {ps.length > 2 ? ` · +${ps.length - 2}` : ''}
                </div>
              )}
            </span>
            <span className="active">
              {acts.length > 0 ? <span className="now">→ their turn on {acts.length}</span> : <span style={{ color: 'var(--ink-4)' }}>—</span>}
            </span>
          </div>
        );
      })}
    </section>
  );
}

export function NewProject({ people, onCreate, onCancel }) {
  const [title, setTitle] = React.useState('');
  const [type, setType] = React.useState('paper');
  const [turn, setTurn] = React.useState('MM');
  const [venue, setVenue] = React.useState('');
  const [note, setNote] = React.useState('');
  const [coauthors, setCoauthors] = React.useState([]);
  const externals = Object.entries(people).filter(([, p]) => p.kind === 'external');

  function toggle(id) {
    setCoauthors((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  }

  function submit() {
    if (!title.trim()) return;
    const today = new Date().toISOString().slice(0, 10);
    onCreate({
      id: `p${Math.floor(Math.random() * 10000)}`,
      title: title.trim(),
      type,
      turn,
      venue: venue.trim() || 'unplaced',
      updated: today,
      status: 'Idea',
      note: note.trim(),
      waitingOn: null,
      coauthors,
      links: [],
      history: [{ d: today, who: 'MM', t: 'Project created.' }],
    });
  }

  return (
    <div className="form-wrap">
      <h2>A new project</h2>
      <div className="sub">Seed it lightly. The rest can wait.</div>

      <div className="field">
        <label>Title</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Working title — the one-line description you'd use in a hallway." autoFocus />
      </div>

      <div className="field">
        <label>Type</label>
        <div className="pillrow">
          {TYPES.map((t) => <button key={t} className={type === t ? 'on' : ''} onClick={() => setType(t)}>{typeMark(t)} {typeWord(t)}</button>)}
        </div>
      </div>

      <div className="field">
        <label>Whose turn</label>
        <div className="pillrow">
          <button className={turn === 'MM' ? 'on' : ''} onClick={() => setTurn('MM')}>MM · Michael</button>
          <button className={turn === 'SK' ? 'on' : ''} onClick={() => setTurn('SK')}>SK · Steven</button>
          {coauthors.map((id) => (
            <button key={id} className={classNames(turn === id && 'on')} onClick={() => setTurn(id)}>
              {personById(people, id)?.initials} · {personById(people, id)?.name}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label>Venue</label>
        <input type="text" value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Neuroscience of Consciousness · n+1 · Asterisk · unplaced" />
      </div>

      <div className="field">
        <label>External co-authors</label>
        <div className="pillrow">
          {externals.map(([id, p]) => (
            <button key={id} className={coauthors.includes(id) ? 'on' : ''} onClick={() => toggle(id)}>{p.name}</button>
          ))}
        </div>
      </div>

      <div className="field">
        <label>Next action</label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="The first concrete move. A sentence is enough." />
      </div>

      <div className="submitrow">
        <button className="primary" onClick={submit}>Create project</button>
        <span className="ghost" style={{ cursor: 'pointer' }} onClick={onCancel}>or cancel (esc)</span>
      </div>
    </div>
  );
}
