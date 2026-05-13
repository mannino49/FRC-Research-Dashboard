import React from 'react';
import { AI_ACTIONS, getAiAction } from '../lib/aiActions.js';
import { runProjectAiAction } from '../lib/aiClient.js';
import { createAiOutputRecord } from '../lib/dashboardRepository.js';
import { searchReferencePapers } from '../lib/paperSearchClient.js';
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

function emptyManuscriptDraft() {
  return {
    title: '',
    driveUrl: '',
    version: '',
    status: 'draft',
    section: '',
    summary: '',
    openTasks: '',
    lastEdited: '',
  };
}

export default function Detail({ people, project, onClose, onPatch, onHistory, onAddPaper, onRemovePaper, onAddDraft, onRemoveDraft, onDelete }) {
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
  const [manuscriptDraft, setManuscriptDraft] = React.useState(() => emptyManuscriptDraft());
  const [referenceQuery, setReferenceQuery] = React.useState('');
  const [referenceResults, setReferenceResults] = React.useState([]);
  const [referenceState, setReferenceState] = React.useState('idle');
  const [referenceMessage, setReferenceMessage] = React.useState('');

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
    setManuscriptDraft(emptyManuscriptDraft());
    setReferenceQuery('');
    setReferenceResults([]);
    setReferenceState('idle');
    setReferenceMessage('');
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

  async function searchReferences() {
    if (referenceQuery.trim().length < 3) return;
    setReferenceState('searching');
    setReferenceMessage('');
    try {
      const data = await searchReferencePapers(referenceQuery.trim());
      setReferenceResults(data.results || []);
      setReferenceState('ready');
      setReferenceMessage(`${data.results?.length || 0} candidates from ${data.source}.`);
    } catch (error) {
      console.error(error);
      setReferenceState('error');
      setReferenceMessage(error.message || 'Reference search failed.');
    }
  }

  function saveReferenceCandidate(result) {
    onAddPaper(p.id, {
      title: result.title,
      authors: result.authors,
      year: result.year,
      doi: result.doi?.replace(/^https?:\/\/doi.org\//, ''),
      sourceUrl: result.sourceUrl,
      driveUrl: '',
      status: 'to-read',
      version: '',
      abstract: result.abstract,
      keyFindings: result.citedByCount ? `External search metadata: ${result.citedByCount} citations in OpenAlex.` : '',
      methods: '',
      quotesNotes: '',
      relevance: result.relevance,
      relevanceNote: `Saved from external search: ${referenceQuery.trim()}`,
    });
    setReferenceMessage('Candidate saved to research memory.');
  }

  function updateManuscriptDraft(field, value) {
    setManuscriptDraft((draft) => ({ ...draft, [field]: value }));
  }

  function addManuscriptDraft() {
    if (!manuscriptDraft.title.trim() || !manuscriptDraft.driveUrl.trim()) return;
    onAddDraft(p.id, {
      ...manuscriptDraft,
      title: manuscriptDraft.title.trim(),
      driveUrl: manuscriptDraft.driveUrl.trim(),
    });
    setManuscriptDraft(emptyManuscriptDraft());
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

          <div className="manuscript-memory">
            <div className="memory-head">
              <div>
                <div className="lbl">Manuscript versions</div>
                <p>Google Drive drafts and version notes for collaborative writing. These summaries are included in AI context.</p>
              </div>
              <span>{p.drafts?.length || 0} linked</span>
            </div>

            {p.drafts?.length ? (
              <div className="paper-list">
                {p.drafts.map((draft) => (
                  <article className="paper-card manuscript-card" key={draft.id}>
                    <div>
                      <h3>{draft.title}</h3>
                      <p>{[draft.version, draft.status, draft.section, draft.lastEdited].filter(Boolean).join(' · ') || 'No version metadata yet'}</p>
                    </div>
                    <div className="paper-links">
                      <a href={draft.driveUrl} target="_blank" rel="noreferrer">Drive draft</a>
                      <button onClick={() => onRemoveDraft(p.id, draft.id)}>Remove</button>
                    </div>
                    {(draft.summary || draft.openTasks) && (
                      <dl>
                        {draft.summary && <><dt>Summary</dt><dd>{draft.summary}</dd></>}
                        {draft.openTasks && <><dt>Open tasks</dt><dd>{draft.openTasks}</dd></>}
                      </dl>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-memory">No manuscript drafts linked yet.</div>
            )}

            <div className="paper-form">
              <label>
                <span>Draft title</span>
                <input value={manuscriptDraft.title} onChange={(e) => updateManuscriptDraft('title', e.target.value)} placeholder="Main manuscript, intro draft, revisions..." />
              </label>
              <label>
                <span>Version</span>
                <input value={manuscriptDraft.version} onChange={(e) => updateManuscriptDraft('version', e.target.value)} placeholder="v1, SK comments, submitted proof" />
              </label>
              <label>
                <span>Status</span>
                <select value={manuscriptDraft.status} onChange={(e) => updateManuscriptDraft('status', e.target.value)}>
                  <option value="draft">Draft</option>
                  <option value="needs-review">Needs review</option>
                  <option value="revising">Revising</option>
                  <option value="submitted">Submitted</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
              <label>
                <span>Section</span>
                <input value={manuscriptDraft.section} onChange={(e) => updateManuscriptDraft('section', e.target.value)} placeholder="Intro, methods, discussion, full draft" />
              </label>
              <label>
                <span>Last edited</span>
                <input type="date" value={manuscriptDraft.lastEdited} onChange={(e) => updateManuscriptDraft('lastEdited', e.target.value)} />
              </label>
              <label className="wide">
                <span>Google Drive draft URL</span>
                <input value={manuscriptDraft.driveUrl} onChange={(e) => updateManuscriptDraft('driveUrl', e.target.value)} placeholder="https://docs.google.com/document/... or Drive file URL" />
              </label>
              <label className="wide">
                <span>Draft summary / current state</span>
                <textarea value={manuscriptDraft.summary} onChange={(e) => updateManuscriptDraft('summary', e.target.value)} placeholder="What this version contains, what changed, what section it covers." />
              </label>
              <label className="wide">
                <span>Open writing tasks</span>
                <textarea value={manuscriptDraft.openTasks} onChange={(e) => updateManuscriptDraft('openTasks', e.target.value)} placeholder="Next paragraph, missing citations, revise intro, respond to comments..." />
              </label>
              <div className="paper-form-actions">
                <span>Drive stores the draft; Supabase stores the writing index.</span>
                <button onClick={addManuscriptDraft} disabled={!manuscriptDraft.title.trim() || !manuscriptDraft.driveUrl.trim()}>Add draft version</button>
              </div>
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

            <div className="reference-search">
              <div className="memory-head">
                <div>
                  <div className="lbl">External reference search</div>
                  <p>Search scholarly metadata, then save candidates into this project&apos;s research memory.</p>
                </div>
              </div>
              <div className="reference-search-row">
                <input
                  value={referenceQuery}
                  onChange={(e) => setReferenceQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') searchReferences();
                  }}
                  placeholder="flow state active inference, ketamine consciousness, moral cognition AI..."
                />
                <button onClick={searchReferences} disabled={referenceState === 'searching' || referenceQuery.trim().length < 3}>
                  {referenceState === 'searching' ? 'Searching...' : 'Search papers'}
                </button>
              </div>
              {referenceMessage && <div className={classNames('ai-message', referenceState === 'error' && 'error')}>{referenceMessage}</div>}
              {referenceResults.length > 0 && (
                <div className="reference-results">
                  {referenceResults.map((result) => (
                    <article key={result.id} className="reference-result">
                      <div>
                        <h3>{result.title}</h3>
                        <p>{[result.authors, result.year, result.citedByCount ? `${result.citedByCount} citations` : ''].filter(Boolean).join(' · ')}</p>
                        {result.abstract && <p className="abstract-preview">{result.abstract.slice(0, 360)}{result.abstract.length > 360 ? '...' : ''}</p>}
                      </div>
                      <div className="paper-links">
                        {result.sourceUrl && <a href={result.sourceUrl} target="_blank" rel="noreferrer">Source</a>}
                        <button onClick={() => saveReferenceCandidate(result)}>Save reference</button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="ai-panel">
            <div className="ai-panel-head">
              <div>
                <div className="lbl">AI project assistant</div>
                <p>Choose an operational prompt grounded only in this project&apos;s dashboard context.</p>
                {p.driveDocuments?.length ? (
                  <div className="drive-context-note">
                    Includes {p.driveDocuments.length} synced Drive {p.driveDocuments.length === 1 ? 'document' : 'documents'}.
                  </div>
                ) : null}
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
