// Shared helpers + constants
const STATUSES = ['Idea', 'Drafting', 'In review', 'Waiting', 'Submitted'];
const TYPES    = ['paper', 'collaboration', 'applied'];

function classNames(...xs) { return xs.filter(Boolean).join(' '); }

function fmtDate(iso) {
  // "Apr 16" style, mono tabular
  const d = new Date(iso + 'T00:00:00');
  const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
  return `${m} ${String(d.getDate()).padStart(2, '0')}`;
}

function daysAgo(iso) {
  const d = new Date(iso + 'T00:00:00');
  const now = new Date();
  const diff = Math.round((now - d) / 86400000);
  if (diff <= 0) return 'today';
  if (diff === 1) return 'yesterday';
  if (diff < 7) return `${diff}d ago`;
  if (diff < 30) return `${Math.round(diff/7)}w ago`;
  return `${Math.round(diff/30)}mo ago`;
}

function personById(id) { return window.PEOPLE[id]; }

function turnLabel(turnId) {
  const p = personById(turnId);
  if (!p) return turnId;
  return p.kind === 'internal' ? p.initials : `${p.initials}·ext`;
}

function isMine(turn, me) { return turn === me; }

function typeMark(type) {
  return { paper: '¶', collaboration: '§', applied: '†', idea: '*' }[type] || '·';
}

function typeWord(type) {
  return { paper: 'Paper', collaboration: 'Collab.', applied: 'Applied', idea: 'Idea' }[type] || type;
}

Object.assign(window, {
  STATUSES, TYPES, classNames, fmtDate, daysAgo,
  personById, turnLabel, isMine, typeMark, typeWord,
});
