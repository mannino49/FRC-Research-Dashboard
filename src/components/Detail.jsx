import React from 'react';
import { STATUSES, classNames, fmtDate, isMine, personById, typeMark, typeWord } from '../utils.js';

export default function Detail({ people, project, onClose, onPatch, onHistory }) {
  const [editingStatus, setEditingStatus] = React.useState(false);
  const [editingTurn, setEditingTurn] = React.useState(false);
  const [noteDraft, setNoteDraft] = React.useState('');
  const [noteAuthor, setNoteAuthor] = React.useState('MM');

  React.useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!project) return null;
  const p = project;
  const allTurns = ['MM', 'SK', ...p.coauthors];

  function postNote() {
    if (!noteDraft.trim()) return;
    const today = new Date().toISOString().slice(0, 10);
    onHistory(p.id, { d: today, who: noteAuthor, t: noteDraft.trim() });
    onPatch(p.id, { updated: today, note: noteDraft.trim() });
    setNoteDraft('');
  }

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="slide" role="dialog" aria-label={p.title}>
        <div className="inner">
          <div className="topbar">
            <span className="label">{typeMark(p.type)} · {typeWord(p.type)} · {p.id.toUpperCase()}</span>
            <span className="close mono" onClick={onClose}>esc ✕</span>
          </div>

          <h2>{p.title}</h2>
          <div className="byline">
            {p.coauthors.length > 0 ? <>with {p.coauthors.map((id) => personById(people, id)?.name).filter(Boolean).join(', ')} · </> : null}
            for <em>{p.venue}</em>
          </div>

          <dl className="facts">
            <dt>Whose turn</dt>
            <dd style={{ position: 'relative' }}>
              <span
                className={classNames('clickable', isMine(p.turn, 'MM') && 'mine')}
                onClick={() => { setEditingTurn((v) => !v); setEditingStatus(false); }}
                style={isMine(p.turn, 'MM') ? { color: 'var(--accent)' } : {}}
              >
                → {personById(people, p.turn)?.name || p.turn}
                {personById(people, p.turn)?.kind === 'external' ? <span style={{ color: 'var(--ink-3)', fontStyle: 'italic' }}> (external)</span> : null}
              </span>
              {editingTurn && (
                <div className="menu" style={{ top: 28, left: 0 }}>
                  {allTurns.map((id) => (
                    <button
                      key={id}
                      className={p.turn === id ? 'on' : ''}
                      onClick={() => {
                        const today = new Date().toISOString().slice(0, 10);
                        onPatch(p.id, { turn: id, updated: today });
                        onHistory(p.id, { d: today, who: 'MM', t: `Passed turn to ${personById(people, id)?.name || id}.` });
                        setEditingTurn(false);
                      }}
                    >
                      {personById(people, id)?.name || id}
                    </button>
                  ))}
                </div>
              )}
            </dd>

            <dt>Status</dt>
            <dd style={{ position: 'relative' }}>
              <span className="clickable" onClick={() => { setEditingStatus((v) => !v); setEditingTurn(false); }}>{p.status}</span>
              {editingStatus && (
                <div className="menu" style={{ top: 28, left: 0 }}>
                  {STATUSES.map((s) => (
                    <button key={s} className={p.status === s ? 'on' : ''} onClick={() => { onPatch(p.id, { status: s }); setEditingStatus(false); }}>{s}</button>
                  ))}
                </div>
              )}
            </dd>

            <dt>Venue</dt>
            <dd><em>{p.venue}</em></dd>

            <dt>Co-authors</dt>
            <dd>
              {p.coauthors.length === 0 ? (
                <span style={{ color: 'var(--ink-3)', fontStyle: 'italic' }}>none</span>
              ) : (
                p.coauthors.map((id, i) => {
                  const pr = personById(people, id);
                  if (!pr) return null;
                  return (
                    <React.Fragment key={id}>
                      {i > 0 ? ', ' : ''}
                      {pr.name}
                      {pr.kind === 'external' ? <span style={{ color: 'var(--ink-3)' }}> ({pr.affil})</span> : null}
                    </React.Fragment>
                  );
                })
              )}
            </dd>

            <dt>Waiting on</dt>
            <dd>
              {p.waitingOn ? (
                <>
                  {personById(people, p.waitingOn)?.name}{' '}
                  <span style={{ color: 'var(--ink-3)' }} className="mono">
                    <button style={{ textDecoration: 'underline', color: 'inherit' }} onClick={() => onPatch(p.id, { waitingOn: null })}>clear</button>
                  </span>
                </>
              ) : (
                <>
                  <span style={{ color: 'var(--ink-3)', fontStyle: 'italic' }}>no blocker · </span>
                  <span
                    className="clickable"
                    onClick={() => {
                      const candidate = p.coauthors.find((id) => personById(people, id)?.kind === 'external');
                      if (candidate) onPatch(p.id, { waitingOn: candidate });
                    }}
                  >
                    mark waiting on collaborator
                  </span>
                </>
              )}
            </dd>

            <dt>Links</dt>
            <dd>
              {p.links.length === 0 ? <span style={{ color: 'var(--ink-3)', fontStyle: 'italic' }}>none</span> : <div className="links">{p.links.map((l) => <a key={l.kind} href={l.url}>{l.kind}</a>)}</div>}
            </dd>
          </dl>

          <div className="note">
            <div className="lbl">Next action</div>
            <p>{p.note || <span style={{ color: 'var(--ink-3)' }}>—</span>}</p>
          </div>

          <div className="addnote">
            <div className="lbl sc" style={{ marginBottom: 8 }}>Add a note / update</div>
            <textarea value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} placeholder="A short line. The next thing to do, or what just happened." />
            <div className="actions">
              <div className="hand">
                <span style={{ color: 'var(--ink-4)' }}>as</span>
                <span className={classNames('pick', noteAuthor === 'MM' && 'on')} onClick={() => setNoteAuthor('MM')}>MM</span>
                <span className={classNames('pick', noteAuthor === 'SK' && 'on')} onClick={() => setNoteAuthor('SK')}>SK</span>
              </div>
              <button className="post" onClick={postNote}>Post · ↵</button>
            </div>
          </div>

          <div className="history">
            <div className="lbl">History</div>
            {p.history.map((h, i) => (
              <div className="entry" key={`${h.d}-${h.who}-${i}`}>
                <span className="d">{fmtDate(h.d)}</span>
                <span className="who mono">{personById(people, h.who)?.initials || h.who}</span>
                <span className="t">{h.t}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}
