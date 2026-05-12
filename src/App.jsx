import React from 'react';
import Detail from './components/Detail.jsx';
import Home from './components/Home.jsx';
import Palette from './components/Palette.jsx';
import { NewProject, People } from './components/Pages.jsx';
import { PEOPLE, PROJECTS } from './data/seedData.js';
import { appendHistoryRecord, createProjectRecord, loadDashboardData, replaceProjectLinksRecord, updateProjectRecord } from './lib/dashboardRepository.js';
import { classNames } from './utils.js';

export default function App() {
  const TWEAKS = {
    warmth: 0.55,
    grouping: 'turn',
  };

  const [warmth, setWarmth] = React.useState(TWEAKS.warmth);
  const [grouping, setGrouping] = React.useState(TWEAKS.grouping);
  const [page, setPage] = React.useState(() => localStorage.getItem('frc.page') || 'home');
  const [selectedId, setSelectedId] = React.useState(null);
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [projects, setProjects] = React.useState(PROJECTS);
  const [people, setPeople] = React.useState(PEOPLE);
  const [dataSource, setDataSource] = React.useState('loading');
  const [saveState, setSaveState] = React.useState('idle');
  const [toast, setToast] = React.useState(null);
  const [tweaksOn, setTweaksOn] = React.useState(false);

  React.useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const data = await loadDashboardData();
        if (!alive) return;
        setPeople(data.people);
        setProjects(data.projects);
        setDataSource(data.source);
      } catch (error) {
        console.error(error);
        if (!alive) return;
        setDataSource('seed');
        flashToast('Using local seed data');
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  React.useEffect(() => {
    document.documentElement.style.setProperty('--warmth', String(warmth));
  }, [warmth]);

  React.useEffect(() => {
    localStorage.setItem('frc.page', page);
  }, [page]);

  React.useEffect(() => {
    function onMsg(e) {
      if (!e.data || typeof e.data !== 'object') return;
      if (e.data.type === '__activate_edit_mode') setTweaksOn(true);
      if (e.data.type === '__deactivate_edit_mode') setTweaksOn(false);
    }
    window.addEventListener('message', onMsg);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);

  function pushEdit(edits) {
    window.parent.postMessage({ type: '__edit_mode_set_keys', edits }, '*');
  }

  React.useEffect(() => {
    function onKey(e) {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }
      if (paletteOpen) return;
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'Escape') {
        setSelectedId(null);
        return;
      }
      if (e.key === 'g') {
        const handler = (ev) => {
          if (ev.key === 'h') setPage('home');
          else if (ev.key === 'n') {
            setPage('new');
            setSelectedId(null);
          } else if (ev.key === 'c') {
            setPage('people');
            setSelectedId(null);
          }
          window.removeEventListener('keydown', handler);
        };
        window.addEventListener('keydown', handler);
        setTimeout(() => window.removeEventListener('keydown', handler), 800);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [paletteOpen]);

  function flashToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 1400);
  }

  async function patchProject(id, patch) {
    const previous = projects;
    setProjects((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    setSaveState('saving');

    try {
      const { links, ...projectPatch } = patch;
      await updateProjectRecord(id, projectPatch);
      if (links) await replaceProjectLinksRecord(id, links);
      setSaveState('saved');
      flashToast('Updated');
    } catch (error) {
      console.error(error);
      setProjects(previous);
      setSaveState('error');
      flashToast('Save failed');
    }
  }

  async function appendHistory(id, entry) {
    setProjects((ps) => ps.map((p) => (p.id === id ? { ...p, history: [entry, ...p.history] } : p)));
    setSaveState('saving');

    try {
      await appendHistoryRecord(id, entry);
      setSaveState('saved');
    } catch (error) {
      console.error(error);
      setSaveState('error');
      flashToast('History save failed');
    }
  }

  async function createProject(p) {
    const previous = projects;
    setProjects((ps) => [p, ...ps]);
    setPage('home');
    setSelectedId(p.id);
    setSaveState('saving');

    try {
      await createProjectRecord(p);
      setSaveState('saved');
      flashToast('Project created');
    } catch (error) {
      console.error(error);
      setProjects(previous);
      setSelectedId(null);
      setSaveState('error');
      flashToast('Create failed');
    }
  }

  const selected = projects.find((p) => p.id === selectedId);
  const todayStr = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="app">
      <header className="masthead">
        <div>
          <h1>
            Research <span className="amp">and</span> Project Dashboard
          </h1>
          <div className="dateline">Friday · {todayStr} · Vol. III No. XVII</div>
        </div>
        <div className="issue">
          <div>
            <strong>Mannino</strong> &amp; <strong>Kotler</strong>
          </div>
          <div>two admins · equal standing</div>
          <div>est. 2024</div>
        </div>
      </header>

      <nav className="nav">
        <a className={page === 'home' ? 'active' : ''} onClick={() => { setPage('home'); setSelectedId(null); }}>Projects</a>
        <a className={page === 'people' ? 'active' : ''} onClick={() => { setPage('people'); setSelectedId(null); }}>Collaborators</a>
        <a className={page === 'new' ? 'active' : ''} onClick={() => { setPage('new'); setSelectedId(null); }}>New project</a>
        <span className="spacer" />
        <span className="kbd">{sourceLabel(dataSource, saveState)}</span>
        <span className="kbd">press <kbd>⌘K</kbd> to jump · <kbd>g h</kbd> home · <kbd>g n</kbd> new · <kbd>g c</kbd> co-authors</span>
      </nav>

      {page === 'home' && (
        <>
          <div className="bar">
            <span style={{ color: 'var(--ink)' }}>Group</span>
            <span className={classNames('chip', grouping === 'turn' && 'on')} onClick={() => { setGrouping('turn'); pushEdit({ grouping: 'turn' }); }}>by turn</span>
            <span className="sep">·</span>
            <span className={classNames('chip', grouping === 'status' && 'on')} onClick={() => { setGrouping('status'); pushEdit({ grouping: 'status' }); }}>by status</span>
            <span className="sep">·</span>
            <span className={classNames('chip', grouping === 'type' && 'on')} onClick={() => { setGrouping('type'); pushEdit({ grouping: 'type' }); }}>by type</span>
            <span className="sep">·</span>
            <span className={classNames('chip', grouping === 'flat' && 'on')} onClick={() => { setGrouping('flat'); pushEdit({ grouping: 'flat' }); }}>flat</span>
            <span className="right">
              <span>{projects.length} active · as of today</span>
            </span>
          </div>
          <Home
            people={people}
            projects={projects}
            onOpen={setSelectedId}
            grouping={grouping}
            onPatch={patchProject}
            onHistory={appendHistory}
          />
        </>
      )}

      {page === 'people' && <People people={people} projects={projects} onOpenProject={setSelectedId} />}
      {page === 'new' && <NewProject people={people} onCreate={createProject} onCancel={() => setPage('home')} />}

      {selected && (
        <Detail
          people={people}
          project={selected}
          onClose={() => setSelectedId(null)}
          onPatch={patchProject}
          onHistory={appendHistory}
        />
      )}

      <Palette
        people={people}
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        projects={projects}
        onGoto={(p) => { setPage(p); setSelectedId(null); }}
        onOpen={(id) => setSelectedId(id)}
      />

      <div className={classNames('tweaks-fab', tweaksOn && 'on')}>
        <div className="h">Tweaks</div>
        <label>Paper warmth</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={warmth}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            setWarmth(v);
            pushEdit({ warmth: v });
          }}
        />
        <div className="warmth-scale"><span>cool</span><span>warm</span></div>

        <label style={{ marginTop: 18 }}>Home grouping</label>
        <div className="opts">
          {[
            ['turn', 'by turn'],
            ['status', 'by status'],
            ['type', 'by type'],
            ['flat', 'flat'],
          ].map(([v, l]) => (
            <button
              key={v}
              className={grouping === v ? 'on' : ''}
              onClick={() => {
                setGrouping(v);
                pushEdit({ grouping: v });
              }}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function saveLabel(saveState) {
  if (saveState === 'saving') return 'saving…';
  if (saveState === 'saved') return 'saved';
  if (saveState === 'error') return 'save error';
  return 'supabase';
}

function sourceLabel(dataSource, saveState) {
  if (dataSource === 'loading') return 'loading data…';
  if (dataSource === 'supabase') return saveLabel(saveState);
  return 'local seed data';
}
