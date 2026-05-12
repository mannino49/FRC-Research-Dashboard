import React from 'react';
import { AI_ACTIONS, getAiAction } from '../lib/aiActions.js';
import { runProjectAiAction } from '../lib/aiClient.js';
import { createAiOutputRecord } from '../lib/dashboardRepository.js';
import { STATUSES, classNames, fmtDate, isMine, personById, typeMark, typeWord } from '../utils.js';

function emptyPaperDraft() {
  return {
    title: '',
    authors: '',
    year: '',
    doi: '',
    sourceUrl: '',
    driveUrl: '',
    status: 'reference',
    version: '',
    abstract: '',
    keyFindings: '',
    methods: '',
    quotesNotes: '',
    relevance: '',
    relevanceNote: '',
  };
}

export default function Detail({ people, project, onClose, onPatch, onHistory, onAddPaper, onRemovePaper, onDelete }) {
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
  const [activeAiAction, setActiveAiAction] = React.useState(AI_ACTIONS[0].id);
  const [paperDraft, setPaperDraft] = React.useState(() => emptyPaperDraft());

  React.useEffect(() => {
    setNotesDraft(project?.notes || '');
    setLinkKind('');
    setLinkUrl('');
    setConfirmDelete(false);
    setAiState('idle');
    setAiMessage('');
    setAiDraft(null);
    setActiveAiAction(AI_ACTIONS[0].id);
    setPaperDraft(emptyPaperDraft());
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

  function updatePaperDraft(field, value) {
    setPaperDraft((draft) => ({ ...draft, [field]: value }));
  }

  function addPaper() {
    if (!paperDraft.title.trim()) return;
    onAddPaper(p.id, {
      ...paperDraft,
      title: paperDraft.title.trim(),
      authors: paperDraft.authors.trim(),
    });
    setPaperDraft(emptyPaperDraft());
  }

  function deleteProject() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDelete(p.id);
  }

  async function runAiAction(actionId) {
    const action = getAiAction(actionId);
    setActiveAiAction(actionId);
    setAiState('working');
    setAiMessage('');
    try {
      const result = await runProjectAiAction(p, people, actionId);
      setAiDraft(result);
      await createAiOutputRecord(p.id, {
        outputType: result.outputType,
        prompt: result.prompt,
        response: result.response,
        model: result.model,
      });
      setAiState('ready');
      setAiMessage(`${action?.title || 'AI output'} saved.`);
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
    const heading = aiDraft.title || getAiAction(activeAiAction)?.title || 'AI output';
    const nextNotes = [notesDraft.trim(), `${heading}\n\n${aiDraft.response}`].filter(Boolean).join('\n\n---\n\n');
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

          <div className="research-memory">
            <div className="memory-head">
              <div>
                <div className="lbl">Research memory</div>
                <p>Paper metadata and notes linked to this project. These summaries are included in AI context.</p>
              </div>
              <span>{p.papers?.length || 0} linked</span>
            </div>

            {p.papers?.length ? (
              <div className="paper-list">
                {p.papers.map((paper) => (
                  <article className="paper-card" key={paper.id}>
                    <div>
                      <h3>{paper.title}</h3>
                      <p>
                        {[paper.authors, paper.year, paper.status, paper.version].filter(Boolean).join(' · ') || 'No metadata yet'}
                      </p>
                    </div>
                    <div className="paper-links">
                      {paper.driveUrl && <a href={paper.driveUrl} target="_blank" rel="noreferrer">Drive</a>}
                      {paper.sourceUrl && <a href={paper.sourceUrl} target="_blank" rel="noreferrer">Source</a>}
                      {paper.doi && <a href={`https://doi.org/${paper.doi.replace(/^https?:\/\/doi.org\//, '')}`} target="_blank" rel="noreferrer">DOI</a>}
                      <button onClick={() => onRemovePaper(p.id, paper.id)}>Unlink</button>
                    </div>
                    {(paper.abstract || paper.keyFindings || paper.relevance || paper.relevanceNote) && (
                      <dl>
                        {paper.abstract && <><dt>Abstract</dt><dd>{paper.abstract}</dd></>}
                        {paper.keyFindings && <><dt>Key findings</dt><dd>{paper.keyFindings}</dd></>}
                        {paper.relevance && <><dt>Relevance</dt><dd>{paper.relevance}</dd></>}
                        {paper.relevanceNote && <><dt>Project note</dt><dd>{paper.relevanceNote}</dd></>}
                      </dl>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-memory">No papers linked yet.</div>
            )}

            <div className="paper-form">
              <label>
                <span>Title</span>
                <input value={paperDraft.title} onChange={(e) => updatePaperDraft('title', e.target.value)} placeholder="Paper or draft title" />
              </label>
              <label>
                <span>Authors</span>
                <input value={paperDraft.authors} onChange={(e) => updatePaperDraft('authors', e.target.value)} placeholder="Author list" />
              </label>
              <label>
                <span>Year</span>
                <input value={paperDraft.year} onChange={(e) => updatePaperDraft('year', e.target.value)} placeholder="2026" />
              </label>
              <label>
                <span>Status</span>
                <select value={paperDraft.status} onChange={(e) => updatePaperDraft('status', e.target.value)}>
                  <option value="reference">Reference</option>
                  <option value="to-read">To read</option>
                  <option value="summarized">Summarized</option>
                  <option value="draft">Draft</option>
                  <option value="submitted">Submitted</option>
                </select>
              </label>
              <label>
                <span>DOI</span>
                <input value={paperDraft.doi} onChange={(e) => updatePaperDraft('doi', e.target.value)} placeholder="10.xxxx/xxxxx" />
              </label>
              <label>
                <span>Version</span>
                <input value={paperDraft.version} onChange={(e) => updatePaperDraft('version', e.target.value)} placeholder="v1, submitted, proof" />
              </label>
              <label className="wide">
                <span>Google Drive URL</span>
                <input value={paperDraft.driveUrl} onChange={(e) => updatePaperDraft('driveUrl', e.target.value)} placeholder="https://drive.google.com/..." />
              </label>
              <label className="wide">
                <span>Source URL</span>
                <input value={paperDraft.sourceUrl} onChange={(e) => updatePaperDraft('sourceUrl', e.target.value)} placeholder="Journal, preprint, PubMed, etc." />
              </label>
              <label className="wide">
                <span>Abstract / summary</span>
                <textarea value={paperDraft.abstract} onChange={(e) => updatePaperDraft('abstract', e.target.value)} placeholder="Paste the abstract or your own short summary." />
              </label>
              <label className="wide">
                <span>Key findings</span>
                <textarea value={paperDraft.keyFindings} onChange={(e) => updatePaperDraft('keyFindings', e.target.value)} placeholder="Main claims, results, or useful ideas." />
              </label>
              <label className="wide">
                <span>Methods / evidence</span>
                <textarea value={paperDraft.methods} onChange={(e) => updatePaperDraft('methods', e.target.value)} placeholder="Study design, sample, model, methods, evidence type." />
              </label>
              <label className="wide">
                <span>Quotes / notes</span>
                <textarea value={paperDraft.quotesNotes} onChange={(e) => updatePaperDraft('quotesNotes', e.target.value)} placeholder="Important quotes, caveats, or reading notes." />
              </label>
              <label className="wide">
                <span>Relevance to this project</span>
                <textarea value={paperDraft.relevance} onChange={(e) => updatePaperDraft('relevance', e.target.value)} placeholder="Why this paper matters for this project." />
              </label>
              <div className="paper-form-actions">
                <span>Files stay in Drive; this stores the index and summaries.</span>
                <button onClick={addPaper} disabled={!paperDraft.title.trim()}>Add paper memory</button>
              </div>
            </div>
          </div>

          <div className="ai-panel">
            <div className="ai-panel-head">
              <div>
                <div className="lbl">AI project assistant</div>
                <p>Choose an operational prompt grounded only in this project&apos;s dashboard context.</p>
              </div>
            </div>
            <div className="ai-prompts" aria-label="Suggested AI prompts">
              {AI_ACTIONS.map((action) => (
                <button
                  key={action.id}
                  className={activeAiAction === action.id ? 'active' : ''}
                  onClick={() => runAiAction(action.id)}
                  disabled={aiState === 'working'}
                  title={action.description}
                >
                  {aiState === 'working' && activeAiAction === action.id ? action.verb : action.title}
                </button>
              ))}
            </div>
            {aiMessage && <div className={classNames('ai-message', aiState === 'error' && 'error')}>{aiMessage}</div>}
            {aiDraft?.response && (
              <div className="ai-output">
                <div className="ai-output-title">{aiDraft.title || getAiAction(activeAiAction)?.title}</div>
                {aiDraft.structured ? (
                  <div className="ai-structured">
                    {aiDraft.structured.headline && <h3>{aiDraft.structured.headline}</h3>}
                    {aiDraft.structured.summary && <p>{aiDraft.structured.summary}</p>}
                    {(aiDraft.structured.sections || []).map((section) => (
                      <section key={section.heading}>
                        <h4>{section.heading}</h4>
                        {section.body && <p>{section.body}</p>}
                        {section.items?.length ? (
                          <ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul>
                        ) : null}
                      </section>
                    ))}
                    {aiDraft.structured.nextSteps?.length ? (
                      <section>
                        <h4>Next steps</h4>
                        <ul>{aiDraft.structured.nextSteps.map((step) => <li key={step}>{step}</li>)}</ul>
                      </section>
                    ) : null}
                    {aiDraft.structured.missingContext?.length ? (
                      <section>
                        <h4>Missing context</h4>
                        <ul>{aiDraft.structured.missingContext.map((item) => <li key={item}>{item}</li>)}</ul>
                      </section>
                    ) : null}
                  </div>
                ) : (
                  <pre>{aiDraft.response}</pre>
                )}
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
