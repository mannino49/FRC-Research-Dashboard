import React from 'react';
import { draftMeetingBrief } from '../lib/aiClient.js';
import { formatMeetingBrief, meetingPapers } from '../lib/meetingBrief.js';

export default function MeetingPrep({ projects, people, connected, onOpen }) {
  const [since, setSince] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [draft, setDraft] = React.useState(null);
  const [message, setMessage] = React.useState('');
  const editor = React.useRef(null);

  async function generate(event) {
    event.preventDefault();
    if (busy || !connected) return;
    setMessage('');
    const papers = meetingPapers(projects, people);
    if (!papers.length) {
      setMessage('Add a next action, note, or draft to an active paper to prepare a brief.');
      return;
    }
    setBusy(true);
    try {
      const items = await draftMeetingBrief(papers, since);
      if (items.length) setDraft(formatMeetingBrief(items, papers));
      else setMessage('The paper records contain no decisions or discussion items for this meeting.');
    } catch (error) {
      setMessage(error.message || 'Could not generate a meeting brief. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(draft.text);
      setMessage('Draft copied.');
    } catch {
      editor.current.focus();
      editor.current.select();
      setMessage('Text selected. Use your copy shortcut.');
    }
  }

  return (
    <details className="meeting-prep">
      <summary>Meeting prep</summary>
      <div className="meeting-body">
        <h2>Brief for Steven</h2>
        {draft ? (
          <>
            <label>Draft for review
              <textarea ref={editor} value={draft.text} rows={12}
                onChange={(e) => { setDraft({ ...draft, text: e.target.value }); setMessage(''); }} />
            </label>
            <details className="meeting-sources">
              <summary>Check sources ({draft.references.length})</summary>
              {draft.references.map((item) => (
                <div key={item.projectId}>
                  <button className="ledger-open" type="button" onClick={() => onOpen(item.projectId)}>{item.title}</button>
                  <p>{item.source.label} · “{item.quote}”</p>
                  {item.source.url && <a href={item.source.url} target="_blank" rel="noreferrer">Open cited draft</a>}
                </div>
              ))}
            </details>
            <div className="meeting-actions">
              <button type="button" disabled={!draft.text.trim()} onClick={copy}>Copy draft</button>
              <button type="button" onClick={() => { setDraft(null); setMessage(''); }}>Discard draft</button>
            </div>
          </>
        ) : (
          <form onSubmit={generate}>
            <p>Find papers that need a decision and what Steven could read before the meeting.</p>
            <label>Last meeting (optional)
              <input type="date" value={since} onChange={(e) => setSince(e.target.value)} disabled={busy} />
            </label>
            <div className="meeting-actions">
              <button type="submit" disabled={busy || !connected}>{busy ? 'Preparing brief…' : 'Draft meeting brief'}</button>
            </div>
            {!connected && <p>Connect to the dashboard to use your paper records.</p>}
          </form>
        )}
        <div role="status">{busy ? 'Reviewing paper records…' : message}</div>
      </div>
    </details>
  );
}
