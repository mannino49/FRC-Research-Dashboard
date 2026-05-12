import React from 'react';
import { draftProjectOutline } from '../lib/aiClient.js';
import { createAiOutputRecord } from '../lib/dashboardRepository.js';
import { STATUSES, classNames, fmtDate, isMine, personById, typeMark, typeWord } from '../utils.js';

export default function Detail({ people, project, onClose, onPatch, onHistory, onDelete }) {
  const [editingStatus, setEditingStatus] = React.useState(false);
  const [editingTurn, setEditingTurn] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [noteDraft, setNoteDraft] = React.useState('');
  const [noteAuthor, setNoteAuthor] = React.useState('MM');
  const [notesDraft, setNotesDraft] = React.useState(project?.notes || '');
  const [linkKind, setLinkKind] = React.useState('');
  const [linkUrl, setLinkUrl] = React.useState('');
  const [aiState, setAiState] = React.useState('idle');
  const [aiMessage, setAiMessage] = React.useState('');
  const [aiDraft, setAiDraft] = React.useState(null);

  React.useEffect(() => {
    setNotesDraft(project?.notes || '');
    setLinkKind('');
    setLinkUrl('');
    setConfirmDelete(false);
    setAiState('idle');
    setAiMessage('');
    setAiDraft(null);
  }, [project?.id, project?.notes]);

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

  function saveNotes() {
    onPatch(p.id, {
      notes: notesDraft,
      updated: new Date().toISOString().slice(0, 10),
    });
  }

  function addLink() {
    if (!linkKind.trim() || !linkUrl.trim()) return;
    const nextLinks = [
      ...p.links,
      {
        id: crypto.randomUUID(),
        kind: linkKind.trim(),
        url: linkUrl.trim(),
      },
    ];
    onPatch(p.id, { links: nextLinks });
    setLinkKind('');
    setLinkUrl('');
  }

  function removeLink(idOrKind) {
    onPatch(p.id, {
      links: p.links.filter((link) => (link.id || link.kind) !== idOrKind),
    });
  }

  function deleteProject() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDelete(p.id);
  }

  async function draftOutline() {
    setAiState('working');
    setAiMessage('');
    try {
      const result = await draftProjectOutline(p, people);
      setAiDraft(result);
      await createAiOutputRecord(p.id, {
        outputType: result.outputType,
        prompt: result.prompt,
        response: result.response,
        model: result.model,
      });
      setAiState('ready');
      setAiMessage('Draft artifact saved.');
    } catch (error) {
      console.error(error);
      setAiState('error');
      setAiMessage(error.message || 'AI request failed.');
    }
  }

  async function copyAiDraft() {
    if (!aiDraft?.response) return;
    await navigator.clipboard.writeText(aiDraft.response);
    setAiMessage('Copied.');
  }

  function promoteAiDraftToNotes() {
    if (!aiDraft?.response) return;
    const nextNotes = [notesDraft.trim(), `AI draft outline\n\n${aiDraft.response}`].filter(Boolean).join('\n\n---\n\n');
    setNotesDraft(nextNotes);
    onPatch(p.id, {
      notes: nextNotes,
      updated: new Date().toISOString().slice(0, 10),
    });
    setAiMessage('Added to project notes.');
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
            for{' '}
            {p.venueUrl ? (
              <a href={p.venueUrl} target="_blank" rel="noreferrer"><em>{p.venue}</em></a>
            ) : (
              <em>{p.venue}</em>
            )}
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
            <dd>
              {p.venueUrl ? <a className="text-link" href={p.venueUrl} target="_blank" rel="noreferrer"><em>{p.venue}</em></a> : <em>{p.venue}</em>}
            </dd>

            <dt>Domain</dt>
            <dd>{p.domain || <span style={{ color: 'var(--ink-3)', fontStyle: 'italic' }}>uncategorized</span>}</dd>

            <dt>Tags</dt>
            <dd>
              {p.tags?.length ? (
                <div className="tag-list">{p.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
              ) : (
                <span style={{ color: 'var(--ink-3)', fontStyle: 'italic' }}>none</span>
              )}
            </dd>

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
              {p.links.length === 0 ? (
                <span style={{ color: 'var(--ink-3)', fontStyle: 'italic' }}>none</span>
              ) : (
                <div className="links editable-links">
                  {p.links.map((l) => (
                    <span key={l.id || l.kind} className="link-chip">
                      <a href={l.url} target="_blank" rel="noreferrer">{l.kind}</a>
                      <button onClick={() => removeLink(l.id || l.kind)} aria-label={`Remove ${l.kind}`}>×</button>
                    </span>
                  ))}
                </div>
              )}
              <div className="link-editor">
                <input value={linkKind} onChange={(e) => setLinkKind(e.target.value)} placeholder="Label" />
                <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://…" />
                <button onClick={addLink}>Add</button>
              </div>
            </dd>
          </dl>

          <div className="note">
            <div className="lbl">Next action</div>
            <p>{p.note || <span style={{ color: 'var(--ink-3)' }}>—</span>}</p>
          </div>

          <div className="note long-notes">
            <div className="lbl">Project notes</div>
            <textarea value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)} placeholder="Working notes, context, open questions, literature leads, or longer project memory." />
            <div className="actions">
              <span>{notesDraft.trim().length} chars</span>
              <button className="post" onClick={saveNotes}>Save notes</button>
            </div>
          </div>

          <div className="ai-panel">
            <div className="ai-panel-head">
              <div>
                <div className="lbl">AI draft artifact</div>
                <p>Generate a working outline from this project&apos;s dashboard context.</p>
              </div>
              <button onClick={draftOutline} disabled={aiState === 'working'}>
                {aiState === 'working' ? 'Drafting…' : 'Draft outline'}
              </button>
            </div>
            {aiMessage && <div className={classNames('ai-message', aiState === 'error' && 'error')}>{aiMessage}</div>}
            {aiDraft?.response && (
              <div className="ai-output">
                <pre>{aiDraft.response}</pre>
                <div className="ai-actions">
                  <span>{aiDraft.model}</span>
                  <button onClick={copyAiDraft}>Copy</button>
                  <button onClick={promoteAiDraftToNotes}>Add to notes</button>
                </div>
              </div>
            )}
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

          <div className="danger-zone">
            <div>
              <div className="lbl">Project controls</div>
              <p>Delete this project and its links/history from Supabase.</p>
            </div>
            <button className={confirmDelete ? 'confirm' : ''} onClick={deleteProject}>
              {confirmDelete ? 'Confirm delete' : 'Delete project'}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
