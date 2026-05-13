import React from 'react';
import { askResearchDrive, suggestFromResearchDrive, syncResearchDrive } from '../lib/driveClient.js';
import {
  aiProjectSuggestionToProject,
  aiUpdateSuggestionToPatch,
  driveProjectSuggestion,
  projectSuggestionsFromDrive,
} from '../lib/driveIntelligence.js';
import { TYPES, classNames, personById, typeMark, typeWord } from '../utils.js';

export function People({ people, projects, onOpenProject, onSavePerson }) {
  const [editingId, setEditingId] = React.useState(null);
  const external = Object.entries(people).filter(([, p]) => p.kind === 'external');
  const internal = Object.entries(people).filter(([, p]) => p.kind === 'internal');
  const editingPerson = editingId ? people[editingId] : null;

  function projectsOf(id) {
    return projects.filter((p) => p.turn === id || p.waitingOn === id || p.coauthors.includes(id));
  }
  function activeOf(id) {
    return projects.filter((p) => p.turn === id);
  }

  function save(id, person, mode) {
    onSavePerson(id, person, mode);
    setEditingId(null);
  }

  return (
    <section className="people">
      <div className="section-head" style={{ paddingTop: 28 }}>
        <span className="numeral">I.</span>
        <span className="title">Collaborators</span>
        <span className="count">{external.length + internal.length} people</span>
      </div>
      <PersonForm
        people={people}
        personId={editingId}
        person={editingPerson}
        onCancel={() => setEditingId(null)}
        onSave={save}
      />
      {internal.length > 0 && (
        <div className="people-kicker">Internal</div>
      )}
      {internal.map(([id, pr]) => (
        <PersonRow
          key={id}
          id={id}
          person={pr}
          projects={projectsOf(id)}
          activeProjects={activeOf(id)}
          onOpenProject={onOpenProject}
          onEdit={setEditingId}
        />
      ))}
      {external.length > 0 && (
        <div className="people-kicker">External</div>
      )}
      {external.map(([id, pr]) => (
        <PersonRow
          key={id}
          id={id}
          person={pr}
          projects={projectsOf(id)}
          activeProjects={activeOf(id)}
          onOpenProject={onOpenProject}
          onEdit={setEditingId}
        />
      ))}
    </section>
  );
}

function PersonRow({ id, person: pr, projects, activeProjects, onOpenProject, onEdit }) {
  return (
    <div className="person" onClick={() => projects[0] && onOpenProject(projects[0].id)}>
      <span className="init">{pr.initials}</span>
      <span className="nm">
        <div className="n">{pr.name}</div>
        <div className="aff">{pr.affil || (pr.kind === 'internal' ? 'FRC' : 'External collaborator')}</div>
        {pr.scholarUrl && (
          <a className="person-link" href={pr.scholarUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
            Google Scholar
          </a>
        )}
      </span>
      <span className="projs">
        {projects.length} {projects.length === 1 ? 'project' : 'projects'}
        {projects.length > 0 && (
          <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--ink-2)', textTransform: 'none', letterSpacing: 0, fontSize: 'var(--fs-sm)', marginTop: 4 }}>
            {projects.map((p) => p.title).slice(0, 2).join(' · ')}
            {projects.length > 2 ? ` · +${projects.length - 2}` : ''}
          </div>
        )}
      </span>
      <span className="active">
        {activeProjects.length > 0 ? <span className="now">→ their turn on {activeProjects.length}</span> : <span style={{ color: 'var(--ink-4)' }}>—</span>}
        <button
          className="mini-edit"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(id);
          }}
        >
          Edit
        </button>
      </span>
    </div>
  );
}

function PersonForm({ people, personId, person, onCancel, onSave }) {
  const [id, setId] = React.useState('');
  const [initials, setInitials] = React.useState('');
  const [name, setName] = React.useState('');
  const [kind, setKind] = React.useState('external');
  const [affil, setAffil] = React.useState('');
  const [scholarUrl, setScholarUrl] = React.useState('');
  const [message, setMessage] = React.useState('');

  React.useEffect(() => {
    setId(personId || '');
    setInitials(person?.initials || '');
    setName(person?.name || '');
    setKind(person?.kind || 'external');
    setAffil(person?.affil || '');
    setScholarUrl(person?.scholarUrl || '');
    setMessage('');
  }, [personId, person]);

  function submit(e) {
    e.preventDefault();
    const nextId = (personId || id || initials).trim().toUpperCase();
    const nextInitials = initials.trim().toUpperCase();
    if (!nextId || !nextInitials || !name.trim()) {
      setMessage('Initials and name are required.');
      return;
    }
    if (!personId && people[nextId]) {
      setMessage('Those initials already exist.');
      return;
    }
    onSave(nextId, {
      initials: nextInitials,
      name: name.trim(),
      kind,
      affil: affil.trim(),
      scholarUrl: scholarUrl.trim(),
    }, personId ? 'update' : 'create');
    if (!personId) {
      setId('');
      setInitials('');
      setName('');
      setKind('external');
      setAffil('');
      setScholarUrl('');
    }
  }

  return (
    <form className="person-form" onSubmit={submit}>
      <div className="person-form-head">
        <span>{personId ? `Editing ${personId}` : 'Add collaborator'}</span>
        {personId && <button type="button" onClick={onCancel}>Cancel</button>}
      </div>
      <div className="person-form-grid">
        <label>
          Initials
          <input value={initials} onChange={(e) => setInitials(e.target.value)} placeholder="MB" disabled={Boolean(personId)} />
        </label>
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Marcelo Bigliassi" />
        </label>
        <label>
          Type
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="external">External</option>
            <option value="internal">Internal</option>
          </select>
        </label>
        <label>
          Affiliation
          <input value={affil} onChange={(e) => setAffil(e.target.value)} placeholder="University, lab, or role" />
        </label>
        <label className="wide">
          Profile URL
          <input value={scholarUrl} onChange={(e) => setScholarUrl(e.target.value)} placeholder="https://scholar.google.com/..." />
        </label>
        <div className="person-form-actions">
          {message && <span>{message}</span>}
          <button type="submit">{personId ? 'Save collaborator' : 'Add collaborator'}</button>
        </div>
      </div>
    </form>
  );
}

export function NewProject({ people, onCreate, onCancel }) {
  const [title, setTitle] = React.useState('');
  const [type, setType] = React.useState('paper');
  const [turn, setTurn] = React.useState('MM');
  const [venue, setVenue] = React.useState('');
  const [venueUrl, setVenueUrl] = React.useState('');
  const [domain, setDomain] = React.useState('');
  const [tags, setTags] = React.useState('');
  const [note, setNote] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [coauthors, setCoauthors] = React.useState([]);
  const externals = Object.entries(people).filter(([, p]) => p.kind === 'external');

  function toggle(id) {
    setCoauthors((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  }

  function submit() {
    if (!title.trim()) return;
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date().toISOString();
    onCreate({
      id: crypto.randomUUID(),
      title: title.trim(),
      type,
      turn,
      venue: venue.trim() || 'unplaced',
      venueUrl: venueUrl.trim(),
      domain: domain.trim(),
      tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      updated: today,
      status: 'Idea',
      note: note.trim(),
      notes: notes.trim(),
      waitingOn: null,
      coauthors,
      links: [],
      history: [{ d: today, who: 'MM', t: 'Project created.' }],
      createdAt: now,
      updatedAt: now,
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
        <label>Venue URL</label>
        <input type="text" value={venueUrl} onChange={(e) => setVenueUrl(e.target.value)} placeholder="https://journal-or-publication.example" />
      </div>

      <div className="field">
        <label>Domain</label>
        <input type="text" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="consciousness · flow · policy · psychedelics" />
      </div>

      <div className="field">
        <label>Tags</label>
        <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="comma-separated tags" />
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

      <div className="field">
        <label>Project notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Longer context, open questions, or project memory." />
      </div>

      <div className="submitrow">
        <button className="primary" onClick={submit}>Create project</button>
        <span className="ghost" style={{ cursor: 'pointer' }} onClick={onCancel}>or cancel (esc)</span>
      </div>
    </div>
  );
}

export function DriveIndex({ documents, projects = [], onRefresh, onCreateProject, onPatchProject, suggestionReviews = [], onReviewSuggestion }) {
  const [syncState, setSyncState] = React.useState('idle');
  const [message, setMessage] = React.useState('');
  const [question, setQuestion] = React.useState('');
  const [answerState, setAnswerState] = React.useState('idle');
  const [answer, setAnswer] = React.useState(null);
  const [suggestState, setSuggestState] = React.useState('idle');
  const [aiSuggestions, setAiSuggestions] = React.useState(null);
  const reviewedKeys = React.useMemo(() => new Set(suggestionReviews.map((review) => review.key)), [suggestionReviews]);
  const projectSuggestions = React.useMemo(
    () => projectSuggestionsFromDrive(documents, projects).filter(({ doc }) => !reviewedKeys.has(`drive-project:${doc.fileId}`)),
    [documents, projects, reviewedKeys],
  );

  async function sync() {
    setSyncState('working');
    setMessage('');
    try {
      const result = await syncResearchDrive();
      setMessage(`Indexed ${result.indexed} files. Skipped ${result.skipped}.`);
      setSyncState('ready');
      await onRefresh();
    } catch (error) {
      console.error(error);
      setMessage(error.message || 'Research Drive sync failed.');
      setSyncState('error');
    }
  }

  async function ask() {
    if (question.trim().length < 3) return;
    setAnswerState('working');
    setAnswer(null);
    try {
      const result = await askResearchDrive(question.trim());
      setAnswer(result);
      setAnswerState('ready');
    } catch (error) {
      console.error(error);
      setAnswer({ error: error.message || 'Research Drive question failed.' });
      setAnswerState('error');
    }
  }

  function approveProjectSuggestion(doc) {
    if (!onCreateProject) return;
    onCreateProject(driveProjectSuggestion(doc));
    onReviewSuggestion?.({
      key: `drive-project:${doc.fileId}`,
      type: 'drive_project',
      status: 'approved',
      fileId: doc.fileId,
      title: doc.projectGuess || doc.name,
      reviewedBy: 'MM',
    });
    setMessage(`Created project suggestion for ${doc.projectGuess || doc.name}.`);
    setSyncState('ready');
  }

  function dismissSuggestion(review) {
    onReviewSuggestion?.({
      status: 'dismissed',
      reviewedBy: 'MM',
      ...review,
    });
  }

  async function generateSuggestions() {
    setSuggestState('working');
    try {
      const result = await suggestFromResearchDrive(projects);
      setAiSuggestions(result);
      setSuggestState('ready');
      setMessage(`Generated ${(result.projectSuggestions?.length || 0) + (result.updateSuggestions?.length || 0)} AI suggestions.`);
      setSyncState('ready');
    } catch (error) {
      console.error(error);
      setSuggestState('error');
      setMessage(error.message || 'AI suggestions failed.');
      setSyncState('error');
    }
  }

  function approveAiProjectSuggestion(suggestion, index) {
    if (!onCreateProject) return;
    onCreateProject(aiProjectSuggestionToProject(suggestion, documents));
    onReviewSuggestion?.({
      key: `ai-project:${suggestion.title}:${suggestion.sourceFileIds?.join(',') || index}`,
      type: 'ai_project',
      status: 'approved',
      fileId: suggestion.sourceFileIds?.[0] || '',
      title: suggestion.title,
      reviewedBy: 'MM',
    });
  }

  function approveAiUpdateSuggestion(suggestion, index) {
    const project = projects.find((item) => item.id === suggestion.projectId);
    if (!project || !onPatchProject) return;
    const patch = aiUpdateSuggestionToPatch(project, suggestion);
    if (!Object.keys(patch).length) return;
    onPatchProject(project.id, patch);
    onReviewSuggestion?.({
      key: `ai-update:${suggestion.projectId}:${suggestion.sourceFileIds?.join(',') || index}:${suggestion.summary}`,
      type: 'ai_update',
      status: 'approved',
      projectId: project.id,
      fileId: suggestion.sourceFileIds?.[0] || '',
      title: suggestion.summary || project.title,
      reviewedBy: 'MM',
    });
  }

  return (
    <section className="drive-page">
      <div className="section-head" style={{ paddingTop: 28 }}>
        <span className="numeral">III.</span>
        <span className="title">Research Drive</span>
        <span className="count">{documents.length} indexed files</span>
      </div>

      <div className="drive-hero">
        <div>
          <h2>Ask the agent about the whole Research Drive.</h2>
          <p>Sync scans the Drive folder, extracts Google Docs and Word drafts, stores an index in Supabase, then AI answers from that index.</p>
        </div>
        <button onClick={sync} disabled={syncState === 'working'}>
          {syncState === 'working' ? 'Syncing...' : 'Sync Research Drive'}
        </button>
      </div>

      {message && <div className={classNames('ai-message', syncState === 'error' && 'error')} role="status">{message}</div>}

      <div className="drive-ask">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask: What is the latest AI moral cognition draft? Summarize the Ketamine paper. Which draft should we work on next?"
        />
        <button onClick={ask} disabled={answerState === 'working' || question.trim().length < 3}>
          {answerState === 'working' ? 'Asking...' : 'Ask Drive'}
        </button>
      </div>

      <div className="drive-suggest-callout">
        <div>
          <div className="lbl">Project intelligence</div>
          <p>Generate review-only proposals from indexed Drive text and current project records.</p>
        </div>
        <button onClick={generateSuggestions} disabled={suggestState === 'working' || !documents.length}>
          {suggestState === 'working' ? 'Generating...' : 'Generate AI suggestions'}
        </button>
      </div>

      {answer?.error && <div className="ai-message error" role="alert">{answer.error}</div>}
      {answer?.response && (
        <div className="drive-answer">
          {answer.structured ? (
            <div className="ai-structured">
              {answer.structured.headline && <h3>{answer.structured.headline}</h3>}
              {answer.structured.summary && <p>{answer.structured.summary}</p>}
              {(answer.structured.sections || []).map((section) => (
                <section key={section.heading}>
                  <h4>{section.heading}</h4>
                  {section.body && <p>{section.body}</p>}
                  {section.items?.length ? <ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul> : null}
                </section>
              ))}
              {answer.structured.nextSteps?.length ? (
                <section>
                  <h4>Next steps</h4>
                  <ul>{answer.structured.nextSteps.map((step) => <li key={step}>{step}</li>)}</ul>
                </section>
              ) : null}
              {answer.structured.missingContext?.length ? (
                <section>
                  <h4>Missing context</h4>
                  <ul>{answer.structured.missingContext.map((item) => <li key={item}>{item}</li>)}</ul>
                </section>
              ) : null}
            </div>
          ) : (
            <pre>{answer.response}</pre>
          )}
          {answer.documentsUsed?.length ? (
            <div className="drive-used">
              <span>Files used</span>
              {answer.documentsUsed.map((doc) => (
                <a key={doc.fileId} href={doc.url} target="_blank" rel="noreferrer">{doc.name}</a>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {projectSuggestions.length ? (
        <div className="drive-suggestions">
          <div className="memory-head">
            <div>
              <div className="lbl">Project suggestions</div>
              <p>Drive-derived candidates stay out of the project list until you approve one.</p>
            </div>
            <span>{projectSuggestions.length} candidates</span>
          </div>
          <div className="drive-suggestion-list">
            {projectSuggestions.map(({ doc, title }) => (
              <article key={doc.fileId} className="drive-suggestion-card">
                <div>
                  <h3>{title}</h3>
                  <p>{[doc.name, doc.versionGuess, doc.modifiedAt?.slice(0, 10)].filter(Boolean).join(' · ')}</p>
                  {doc.excerpt && <p className="abstract-preview">{doc.excerpt.slice(0, 240)}{doc.excerpt.length > 240 ? '...' : ''}</p>}
                </div>
                <div className="drive-suggestion-actions">
                  <a href={doc.url} target="_blank" rel="noreferrer">Open</a>
                  <button onClick={() => dismissSuggestion({
                    key: `drive-project:${doc.fileId}`,
                    type: 'drive_project',
                    fileId: doc.fileId,
                    title,
                  })}>Dismiss</button>
                  <button onClick={() => approveProjectSuggestion(doc)}>Approve project</button>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {(aiSuggestions?.projectSuggestions?.length || aiSuggestions?.updateSuggestions?.length) ? (
        <div className="drive-suggestions ai-drive-suggestions">
          <div className="memory-head">
            <div>
              <div className="lbl">AI review queue</div>
              <p>These suggestions are generated from indexed Drive text and are saved only when approved.</p>
            </div>
            <span>{aiSuggestions.model || 'AI'} </span>
          </div>

          {aiSuggestions.projectSuggestions?.length ? (
            <div className="drive-suggestion-list">
              {aiSuggestions.projectSuggestions.map((suggestion, index) => {
                const reviewKey = `ai-project:${suggestion.title}:${suggestion.sourceFileIds?.join(',') || index}`;
                if (reviewedKeys.has(reviewKey)) return null;
                return (
                  <article key={reviewKey} className="drive-suggestion-card">
                    <div>
                      <h3>{suggestion.title}</h3>
                      <p>{[suggestion.type, suggestion.status, suggestion.confidence].filter(Boolean).join(' · ')}</p>
                      <p className="abstract-preview">{suggestion.rationale}</p>
                      {suggestion.nextAction && <p><strong>Next:</strong> {suggestion.nextAction}</p>}
                      {suggestion.missingContext?.length ? <p className="abstract-preview">Missing: {suggestion.missingContext.join(' · ')}</p> : null}
                    </div>
                    <div className="drive-suggestion-actions">
                      <button onClick={() => dismissSuggestion({
                        key: reviewKey,
                        type: 'ai_project',
                        fileId: suggestion.sourceFileIds?.[0] || '',
                        title: suggestion.title,
                      })}>Dismiss</button>
                      <button onClick={() => approveAiProjectSuggestion(suggestion, index)}>Approve project</button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}

          {aiSuggestions.updateSuggestions?.length ? (
            <div className="drive-suggestion-list">
              {aiSuggestions.updateSuggestions.map((suggestion, index) => {
                const reviewKey = `ai-update:${suggestion.projectId}:${suggestion.sourceFileIds?.join(',') || index}:${suggestion.summary}`;
                const project = projects.find((item) => item.id === suggestion.projectId);
                if (reviewedKeys.has(reviewKey) || !project) return null;
                return (
                  <article key={reviewKey} className="drive-suggestion-card">
                    <div>
                      <h3>{project.title}</h3>
                      <p>{[suggestion.summary, suggestion.confidence].filter(Boolean).join(' · ')}</p>
                      <p className="abstract-preview">{suggestion.rationale}</p>
                      {suggestion.patch?.note && <p><strong>Next:</strong> {suggestion.patch.note}</p>}
                      {suggestion.missingContext?.length ? <p className="abstract-preview">Missing: {suggestion.missingContext.join(' · ')}</p> : null}
                    </div>
                    <div className="drive-suggestion-actions">
                      <button onClick={() => dismissSuggestion({
                        key: reviewKey,
                        type: 'ai_update',
                        projectId: project.id,
                        fileId: suggestion.sourceFileIds?.[0] || '',
                        title: suggestion.summary || project.title,
                      })}>Dismiss</button>
                      <button onClick={() => approveAiUpdateSuggestion(suggestion, index)}>Approve update</button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="drive-docs">
        {!documents.length && (
          <div className="empty-state">
            <div className="sc">No indexed Drive files</div>
            <p>Sync Research Drive to populate the index before asking document-specific questions.</p>
          </div>
        )}
        {documents.map((doc) => (
          <article key={doc.fileId} className="drive-doc">
            <div>
              <h3>{doc.name}</h3>
              <p>{[doc.projectGuess, doc.versionGuess, doc.modifiedAt?.slice(0, 10)].filter(Boolean).join(' · ')}</p>
              {doc.excerpt && <p className="abstract-preview">{doc.excerpt.slice(0, 280)}{doc.excerpt.length > 280 ? '...' : ''}</p>}
            </div>
            <a href={doc.url} target="_blank" rel="noreferrer">Open</a>
          </article>
        ))}
      </div>
    </section>
  );
}
