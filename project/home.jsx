// Home dashboard — the unified list sorted by whose turn it is
function Home({ projects, onOpen, grouping, onPatch, onHistory }) {
  const [openMenu, setOpenMenu] = React.useState(null); // { projectId, kind: 'status'|'turn' }

  // Sort: mine first, then by update date desc
  const sorted = React.useMemo(() => {
    const me = 'MM';
    return [...projects].sort((a, b) => {
      const aMine = a.turn === me ? 0 : (a.turn === 'SK' ? 1 : 2);
      const bMine = b.turn === me ? 0 : (b.turn === 'SK' ? 1 : 2);
      if (aMine !== bMine) return aMine - bMine;
      return b.updated.localeCompare(a.updated);
    });
  }, [projects]);

  // Group
  const groups = React.useMemo(() => {
    if (grouping === 'flat') {
      return [{ key: 'all', title: 'All projects', items: sorted, numeral: 'I' }];
    }
    if (grouping === 'turn') {
      const buckets = { mine: [], partner: [], external: [] };
      for (const p of sorted) {
        const pp = personById(p.turn);
        if (p.turn === 'MM') buckets.mine.push(p);
        else if (p.turn === 'SK') buckets.partner.push(p);
        else buckets.external.push(p);
      }
      return [
        { key: 'mine', title: 'Your turn', items: buckets.mine, numeral: 'I' },
        { key: 'partner', title: 'Steven\u2019s turn', items: buckets.partner, numeral: 'II' },
        { key: 'external', title: 'Waiting on collaborators', items: buckets.external, numeral: 'III' },
      ].filter(g => g.items.length > 0);
    }
    if (grouping === 'status') {
      const order = ['Drafting', 'In review', 'Waiting', 'Submitted', 'Idea'];
      const numerals = ['I','II','III','IV','V'];
      return order.map((s, i) => ({
        key: s, title: s, items: sorted.filter(p => p.status === s), numeral: numerals[i]
      })).filter(g => g.items.length > 0);
    }
    if (grouping === 'type') {
      const labels = { paper: 'Papers', collaboration: 'Collaborations', applied: 'Applied projects' };
      const numerals = { paper: 'I', collaboration: 'II', applied: 'III' };
      return ['paper','collaboration','applied']
        .map(t => ({ key: t, title: labels[t], items: sorted.filter(p => p.type === t), numeral: numerals[t] }))
        .filter(g => g.items.length > 0);
    }
    return [];
  }, [sorted, grouping]);

  // Close menus on outside click
  React.useEffect(() => {
    function onDoc() { setOpenMenu(null); }
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  const mineCount = projects.filter(p => p.turn === 'MM').length;
  const partnerCount = projects.filter(p => p.turn === 'SK').length;
  const extCount = projects.filter(p => personById(p.turn)?.kind === 'external').length;
  const inReview = projects.filter(p => p.status === 'In review').length;

  let runningIdx = 0;

  return (
    <>
      <section className="summary">
        <div className="cell">
          <div className="n old" style={{color: 'var(--accent)'}}>{mineCount}</div>
          <div className="lbl">Your turn</div>
          <div className="sub">to move these forward</div>
        </div>
        <div className="cell">
          <div className="n old">{partnerCount}</div>
          <div className="lbl">Steven&rsquo;s turn</div>
          <div className="sub">with Steven</div>
        </div>
        <div className="cell">
          <div className="n old">{extCount}</div>
          <div className="lbl">External</div>
          <div className="sub">waiting on co-authors</div>
        </div>
        <div className="cell">
          <div className="n old">{inReview}<small>in review</small></div>
          <div className="lbl">Active, total · {projects.length}</div>
          <div className="sub">across papers, collabs, applied</div>
        </div>
      </section>

      {groups.map(g => (
        <section key={g.key}>
          <div className="section-head">
            <span className="numeral">{g.numeral}.</span>
            <span className="title">{g.title}</span>
            <span className="count">{g.items.length} {g.items.length === 1 ? 'project' : 'projects'}</span>
          </div>
          <div className="list">
            {g.items.map(p => {
              runningIdx += 1;
              const mine = p.turn === 'MM';
              const turnPerson = personById(p.turn);
              return (
                <div
                  key={p.id}
                  className={classNames('row', mine && 'mine')}
                  onClick={() => onOpen(p.id)}
                >
                  <span className="idx">{runningIdx}</span>
                  <span className="turn" onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu && openMenu.projectId === p.id && openMenu.kind === 'turn' ? null : { projectId: p.id, kind: 'turn' }); }}>
                    <span className="arrow">→</span>
                    <span className="who mono">{turnPerson ? turnPerson.initials : p.turn}</span>
                    {openMenu && openMenu.projectId === p.id && openMenu.kind === 'turn' && (
                      <div className="menu" style={{top: 28, left: 0}} onClick={e => e.stopPropagation()}>
                        {['MM','SK', ...p.coauthors].map(id => (
                          <button key={id}
                            className={p.turn === id ? 'on' : ''}
                            onClick={() => {
                              onPatch(p.id, { turn: id, updated: new Date().toISOString().slice(0,10) });
                              onHistory(p.id, { d: new Date().toISOString().slice(0,10), who: 'MM', t: `Passed turn to ${personById(id)?.name || id}.`});
                              setOpenMenu(null);
                            }}
                          >{personById(id)?.name || id}</button>
                        ))}
                      </div>
                    )}
                  </span>
                  <span className="title-cell">
                    <span className="t">{p.title}</span>
                    <span className="meta">
                      <span>{typeMark(p.type)} {typeWord(p.type)}</span>
                      {p.coauthors.filter(id => personById(id)?.kind === 'external').length > 0 && (
                        <>
                          <span className="dot">·</span>
                          <span className="co">with {p.coauthors.filter(id => personById(id)?.kind === 'external').map(id => personById(id)?.name.split(' ').slice(-1)[0]).join(', ')}</span>
                        </>
                      )}
                      {p.waitingOn && (
                        <>
                          <span className="dot">·</span>
                          <span className="co" style={{color: 'var(--status-waiting)'}}>waiting on {personById(p.waitingOn)?.name.split(' ').slice(-1)[0]}</span>
                        </>
                      )}
                    </span>
                  </span>
                  <span className="venue">{p.venue}</span>
                  <span className="status" onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu && openMenu.projectId === p.id && openMenu.kind === 'status' ? null : { projectId: p.id, kind: 'status' }); }}>
                    <span className="tick">—</span>{p.status}
                    {openMenu && openMenu.projectId === p.id && openMenu.kind === 'status' && (
                      <div className="menu" style={{top: 24, left: 0}} onClick={e => e.stopPropagation()}>
                        {STATUSES.map(s => (
                          <button key={s}
                            className={p.status === s ? 'on' : ''}
                            onClick={() => { onPatch(p.id, { status: s }); setOpenMenu(null); }}
                          >{s}</button>
                        ))}
                      </div>
                    )}
                  </span>
                  <span className="date">{daysAgo(p.updated)}</span>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}

Object.assign(window, { Home });
