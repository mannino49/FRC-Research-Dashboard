import React from 'react';
import { previewProjectUpdate } from '../lib/aiClient.js';
import { reviewedChanges, updateFields } from '../lib/projectUpdate.js';
import { STATUSES } from '../utils.js';

export default function ProjectUpdate({ project, people, onSave, available, author, onChooseAuthor }) {
  const [open, setOpen] = React.useState(false);
  const [sentence, setSentence] = React.useState('');
  const entryId = React.useRef(null);
  const [review, setReview] = React.useState(null);
  const [busy, setBusy] = React.useState('');
  const [message, setMessage] = React.useState('');
  const participants = Object.entries(people).map(([id, person]) => ({ id, name: person.name, kind: person.kind }));
  const authors = participants.filter((person) => person.kind === 'internal');

  function discard() {
    setOpen(false);
    setSentence('');
    setReview(null);
    setMessage('');
  }

  async function preview(event) {
    event.preventDefault();
    if (busy || !sentence.trim() || !author) return;
    const before = updateFields(project);
    setBusy('preview');
    setMessage('');
    let changes = {};
    try {
      changes = await previewProjectUpdate(sentence.trim(), before, participants, author);
    } catch (error) {
      setMessage(`${error.message} Review the fields manually.`);
    } finally {
      setReview({ before, after: { ...before, ...changes } });
      setBusy('');
    }
  }

  function edit(field, value) {
    setReview((current) => ({ ...current, after: { ...current.after, [field]: value } }));
  }

  async function save(event) {
    event.preventDefault();
    if (busy || !review) return;
    const { expected, changes } = reviewedChanges(review.before, review.after);
    if (Object.entries(expected).some(([field, value]) => project[field] !== value)) {
      setMessage('This project changed during review. Go back to your sentence and preview it again.');
      return;
    }
    setBusy('save');
    setMessage('');
    try {
      await onSave(project.id, { id: entryId.current, author, sentence: sentence.trim(), expected, changes });
      discard();
    } catch (error) {
      setMessage(error.message || 'Save failed. Your review is still open.');
    } finally {
      setBusy('');
    }
  }

  if (!open) return (
    <button type="button" className="update-open" disabled={!available} onClick={() => { entryId.current = crypto.randomUUID(); setOpen(true); }}>Add an update</button>
  );

  return (
    <form className="update-form" onSubmit={review ? save : preview}>
      <h3>{review ? 'Review project update' : 'Add a project update'}</h3>
      {review ? (
        <>
          <div className="update-history">
            <span>History entry · {people[author]?.name}</span>
            <p>{sentence.trim()}</p>
          </div>
          <label>Status
            <select value={review.after.status} onChange={(e) => edit('status', e.target.value)} disabled={!!busy}>
              {STATUSES.map((status) => <option key={status}>{status}</option>)}
            </select>
            {review.after.status !== review.before.status && <small>Previously {review.before.status}</small>}
          </label>
          <label>Whose turn
            <select value={review.after.turn} onChange={(e) => edit('turn', e.target.value)} disabled={!!busy}>
              {participants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {review.after.turn !== review.before.turn && <small>Previously {people[review.before.turn]?.name || review.before.turn}</small>}
          </label>
          <label>Next action
            <textarea value={review.after.note} onChange={(e) => edit('note', e.target.value)} disabled={!!busy} rows={2} />
            {review.after.note !== review.before.note && <small>Previously {review.before.note || 'empty'}</small>}
          </label>
        </>
      ) : (
        <>
          <label>Update
            <textarea autoFocus value={sentence} maxLength={2000} rows={2} required disabled={!!busy}
              onChange={(e) => setSentence(e.target.value)} placeholder="Sent the revised intro to Steven. He’ll review it Friday." />
          </label>
          <label>Written by
            <select value={author} required disabled={!!busy} onChange={(e) => onChooseAuthor(e.target.value)}>
              <option value="">Choose your name</option>
              {(authors.length ? authors : participants).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
        </>
      )}
      {message && <p role="status">{message}</p>}
      <div className="update-buttons">
        <button className="update-primary" disabled={!!busy || !sentence.trim() || !author} type="submit">
          {review ? (busy ? 'Saving…' : 'Save update') : (busy ? 'Preparing…' : 'Preview changes')}
        </button>
        {review && <button type="button" disabled={!!busy} onClick={() => { setReview(null); setMessage(''); }}>Edit sentence</button>}
        <button type="button" onClick={discard} disabled={!!busy}>Discard</button>
      </div>
    </form>
  );
}
