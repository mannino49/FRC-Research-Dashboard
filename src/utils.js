export const STATUSES = ['Idea', 'Drafting', 'In review', 'Waiting', 'Submitted'];
export const TYPES = ['paper', 'collaboration', 'applied'];

export function classNames(...xs) {
  return xs.filter(Boolean).join(' ');
}

export function fmtDate(iso) {
  const d = new Date(`${iso}T00:00:00`);
  const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
  return `${m} ${String(d.getDate()).padStart(2, '0')}`;
}

export function daysAgo(iso) {
  const d = new Date(`${iso}T00:00:00`);
  const now = new Date();
  const diff = Math.round((now - d) / 86400000);
  if (diff <= 0) return 'today';
  if (diff === 1) return 'yesterday';
  if (diff < 7) return `${diff}d ago`;
  if (diff < 30) return `${Math.round(diff / 7)}w ago`;
  return `${Math.round(diff / 30)}mo ago`;
}

export function personById(people, id) {
  return people[id];
}

export function turnLabel(people, turnId) {
  const p = personById(people, turnId);
  if (!p) return turnId;
  return p.kind === 'internal' ? p.initials : `${p.initials}·ext`;
}

export function isMine(turn, me) {
  return turn === me;
}

export function typeMark(type) {
  return { paper: '¶', collaboration: '§', applied: '†', idea: '*' }[type] || '·';
}

export function typeWord(type) {
  return { paper: 'Paper', collaboration: 'Collab.', applied: 'Applied', idea: 'Idea' }[type] || type;
}
