import React from 'react';
import Detail from './components/Detail.jsx';
import Home from './components/Home.jsx';
import { ExternalLinkIcon } from './components/Icons.jsx';
import Palette from './components/Palette.jsx';
import { DriveIndex, NewProject, People } from './components/Pages.jsx';
import { RESEARCH_DRIVE_URL } from './constants.js';
import { PEOPLE, PROJECTS } from './data/seedData.js';
import {
  appendHistoryRecord,
  createPersonRecord,
  createProjectRecord,
  deleteProjectRecord,
  loadDashboardData,
  loadDriveDocuments,
  loadSuggestionReviews,
  replaceProjectLinksRecord,
  saveSuggestionReview,
  saveReviewedUpdate,
  updatePersonRecord,
  updateProjectRecord,
} from './lib/dashboardRepository.js';
import { isSupabaseConfigured } from './lib/supabaseClient.js';
import { relevantDriveDocuments } from './lib/driveMatch.js';
import { classNames } from './utils.js';

export default function App() {
  const [warmth, setWarmth] = React.useState(0.55);
  const [page, setPage] = React.useState(() => localStorage.getItem('frc.page') || 'home');
  const [selectedId, setSelectedId] = React.useState(null);
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [projects, setProjects] = React.useState(PROJECTS);
  const [people, setPeople] = React.useState(PEOPLE);
  const [dataSource, setDataSource] = React.useState('loading');
  const [saveState, setSaveState] = React.useState('idle');
  const [toast, setToast] = React.useState(null);
  const [tweaksOn, setTweaksOn] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [updateAuthor, setUpdateAuthor] = React.useState('');
  const [driveDocuments, setDriveDocuments] = React.useState([]);
  const [suggestionReviews, setSuggestionReviews] = React.useState([]);

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
    refreshDriveDocuments().catch((error) => {
      console.error(error);
    });
    refreshSuggestionReviews().catch((error) => {
      console.error(error);
    });
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

  async function applyReviewedUpdate(projectId, review) {
    setSaveState('saving');
    try {
      const { fields, entry, conflict, alreadySaved } = await saveReviewedUpdate(projectId, review);
      setProjects((current) => current.map((project) => {
        if (project.id !== projectId) return project;
        const history = entry ? [entry, ...project.history.filter((item) => item.id !== entry.id)] : project.history;
        return { ...project, ...fields, history };
      }));
      if (conflict) throw new Error('This project changed during review. Go back to your sentence and preview it again.');
      setSaveState('saved');
      flashToast(alreadySaved ? 'Update already recorded' : 'Project update saved');
    } catch (error) {
      setSaveState('error');
      throw error;
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

  async function deleteProject(id) {
    const previous = projects;
    setProjects((ps) => ps.filter((p) => p.id !== id));
    setSelectedId(null);
    setSaveState('saving');

    try {
      await deleteProjectRecord(id);
      setSaveState('saved');
      flashToast('Project deleted');
    } catch (error) {
      console.error(error);
      setProjects(previous);
      setSelectedId(id);
      setSaveState('error');
      flashToast('Delete failed');
    }
  }

  async function savePerson(id, person, mode) {
    const previous = people;
    setPeople((current) => ({
      ...current,
      [id]: person,
    }));
    setSaveState('saving');

    try {
      if (mode === 'create') await createPersonRecord(id, person);
      else await updatePersonRecord(id, person);
      setSaveState('saved');
      flashToast(mode === 'create' ? 'Collaborator added' : 'Collaborator updated');
    } catch (error) {
      console.error(error);
      setPeople(previous);
      setSaveState('error');
      flashToast('Collaborator save failed');
    }
  }

  async function refreshDriveDocuments() {
    const docs = await loadDriveDocuments();
    setDriveDocuments(docs);
  }

  async function refreshSuggestionReviews() {
    const reviews = await loadSuggestionReviews();
    setSuggestionReviews(reviews);
  }

  async function reviewSuggestion(review) {
    const tempReview = {
      reviewedAt: new Date().toISOString(),
      ...review,
    };
    setSuggestionReviews((reviews) => [
      tempReview,
      ...reviews.filter((item) => item.key !== tempReview.key),
    ]);

    try {
      const saved = await saveSuggestionReview(tempReview);
      setSuggestionReviews((reviews) => [
        saved,
        ...reviews.filter((item) => item.key !== saved.key),
      ]);
    } catch (error) {
      console.error(error);
      flashToast('Suggestion review save failed');
    }
  }

  const selectedProject = projects.find((p) => p.id === selectedId);
  const selected = React.useMemo(() => {
    if (!selectedProject) return null;
    return {
      ...selectedProject,
      driveDocuments: relevantDriveDocuments(selectedProject, driveDocuments),
    };
  }, [driveDocuments, selectedProject]);
  return (
    <div className="app">
      <header className="masthead">
        <h1>Research projects</h1>
      </header>

      <nav className="nav">
        <button className={page === 'home' ? 'active' : ''} onClick={() => { setPage('home'); setSelectedId(null); }}>Projects</button>
        <button className={page === 'people' ? 'active' : ''} onClick={() => { setPage('people'); setSelectedId(null); }}>Collaborators</button>
        <button className={page === 'new' ? 'active' : ''} onClick={() => { setPage('new'); setSelectedId(null); }}>New project</button>
        <button className={page === 'drive' ? 'active' : ''} onClick={() => { setPage('drive'); setSelectedId(null); }}>Drive AI</button>
        <a className="external-nav" href={RESEARCH_DRIVE_URL} target="_blank" rel="noopener noreferrer">
          Research Drive
          <ExternalLinkIcon />
        </a>
        <span className="spacer" />
        <span className={classNames('source-pill', dataSource === 'supabase' && 'live', dataSource === 'seed' && 'fallback')}>
          {sourceLabel(dataSource, saveState)}
        </span>
      </nav>

      {page === 'home' && (
        <Home people={people} projects={projects} query={searchQuery} onSearch={setSearchQuery} onOpen={setSelectedId} onPatch={patchProject} />
      )}

      {page === 'people' && <People people={people} projects={projects} onOpenProject={setSelectedId} onSavePerson={savePerson} />}
      {page === 'new' && <NewProject people={people} onCreate={createProject} onCancel={() => setPage('home')} />}
      {page === 'drive' && (
        <DriveIndex
          documents={driveDocuments}
          projects={projects}
          onRefresh={refreshDriveDocuments}
          onCreateProject={createProject}
          onPatchProject={patchProject}
          suggestionReviews={suggestionReviews}
          onReviewSuggestion={reviewSuggestion}
        />
      )}

      {selected && (
        <Detail
          key={selected.id}
          onSaveUpdate={applyReviewedUpdate}
          updateAuthor={updateAuthor}
          onChooseAuthor={setUpdateAuthor}
          updateAvailable={dataSource === 'supabase' || !isSupabaseConfigured}
          people={people}
          project={selected}
          onClose={() => setSelectedId(null)}
          onPatch={patchProject}
          onHistory={appendHistory}
          onDelete={deleteProject}
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

      </div>

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

function saveLabel(saveState) {
  if (saveState === 'saving') return 'saving';
  if (saveState === 'saved') return 'saved';
  if (saveState === 'error') return 'save error';
  return 'connected';
}

function sourceLabel(dataSource, saveState) {
  if (dataSource === 'loading') return 'loading data…';
  if (dataSource === 'supabase') return `Supabase · ${saveLabel(saveState)}`;
  return 'Fallback seed data';
}
