import React from 'react';
import { classNames, turnLabel } from '../utils.js';

export default function Palette({ people, open, onClose, projects, onGoto, onOpen }) {
  const [q, setQ] = React.useState('');
  const [cur, setCur] = React.useState(0);
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    if (open) {
      setQ('');
      setCur(0);
      setTimeout(() => inputRef.current && inputRef.current.focus(), 10);
    }
  }, [open]);

  const items = React.useMemo(() => {
    const all = [
      { kind: 'nav', label: 'Home', to: 'home', hint: 'g h' },
      { kind: 'nav', label: 'New project', to: 'new', hint: 'g n' },
      { kind: 'nav', label: 'Collaborators', to: 'people', hint: 'g c' },
    ];
    for (const p of projects) all.push({ kind: 'project', label: p.title, venue: p.venue, id: p.id, turn: p.turn });
    const needle = q.trim().toLowerCase();
    if (!needle) return all;
    return all.filter((i) => (i.label + (i.venue || '')).toLowerCase().includes(needle));
  }, [q, projects]);

  React.useEffect(() => {
    setCur(0);
  }, [q]);

  function handleKey(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCur((c) => Math.min(c + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCur((c) => Math.max(c - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const it = items[cur];
      if (!it) return;
      if (it.kind === 'nav') onGoto(it.to);
      else if (it.kind === 'project') onOpen(it.id);
      onClose();
    } else if (e.key === 'Escape') onClose();
  }

  if (!open) return null;

  return (
    <div className="palette-scrim" onMouseDown={onClose}>
      <div className="palette" onMouseDown={(e) => e.stopPropagation()}>
        <div className="pin">
          <span className="pfx">⌘K</span>
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={handleKey} placeholder="jump to project, page, or action…" />
        </div>
        <div className="list">
          {items.length === 0 && <div style={{ padding: '20px 18px', color: 'var(--ink-3)', fontStyle: 'italic' }}>Nothing matches.</div>}
          {items.map((it, i) => (
            <div
              key={`${it.kind}-${it.id || it.to}-${i}`}
              className={classNames('item', i === cur && 'act')}
              onMouseEnter={() => setCur(i)}
              onClick={() => {
                if (it.kind === 'nav') onGoto(it.to);
                else onOpen(it.id);
                onClose();
              }}
            >
              <span className="kind">{it.kind === 'nav' ? '→' : '¶'}</span>
              <span className="label">
                {it.label}
                {it.venue ? <em> — {it.venue}</em> : null}
              </span>
              <span className="hint">{it.hint || (it.kind === 'project' ? `turn · ${turnLabel(people, it.turn)}` : '')}</span>
            </div>
          ))}
        </div>
        <div className="foot">
          <span><kbd>↑↓</kbd> navigate</span>
          <span><kbd>↵</kbd> open</span>
          <span><kbd>esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
