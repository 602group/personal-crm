import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectsApi } from '../api/projects';
import ProjectCard from '../components/projects/ProjectCard';
import ProjectFormModal from '../components/projects/ProjectFormModal';
import '../styles/projects.css';

const STATUS_OPTIONS = [
  { value:'', label:'All Statuses' },
  { value:'planning',  label:'Planning' },
  { value:'active',    label:'Active' },
  { value:'paused',    label:'Paused' },
  { value:'completed', label:'Completed' },
  { value:'archived',  label:'Archived' },
];
const CATEGORY_OPTIONS = [
  { value:'', label:'All Categories' },
  { value:'business',  label:'Business' },
  { value:'personal',  label:'Personal' },
  { value:'finance',   label:'Finance' },
  { value:'health',    label:'Health' },
  { value:'learning',  label:'Learning' },
  { value:'other',     label:'Other' },
];
const SORT_OPTIONS = [
  { value:'created_at',  label:'Date Created' },
  { value:'updated_at',  label:'Last Updated' },
  { value:'target_date', label:'Target Date' },
  { value:'progress',    label:'Progress' },
  { value:'title',       label:'Title (A–Z)' },
];

export default function Projects() {
  const navigate = useNavigate();
  const [projects,  setProjects]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [search,    setSearch]    = useState('');
  const [status,    setStatus]    = useState('');
  const [category,  setCategory]  = useState('');
  const [sort,      setSort]      = useState('created_at');
  const [editProject, setEditProject] = useState(null);
  const [showForm,    setShowForm]    = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const data = await projectsApi.list({ status, category, sort, search });
      setProjects(data.projects);
    } catch { setError('Failed to load projects.'); }
    finally  { setLoading(false); }
  }, [status, category, sort, search]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(formData) {
    const { project } = await projectsApi.create(formData);
    await load();
    navigate(`/projects/${project.id}`);
  }
  async function handleEdit(formData) {
    await projectsApi.update(editProject.id, formData);
    setEditProject(null); load();
  }
  async function handleStatusChange(id, newStatus) {
    await projectsApi.update(id, { status: newStatus }); load();
  }
  function openEdit(p) { setEditProject(p); setShowForm(true); }
  function closeForm() { setShowForm(false); setEditProject(null); }

  const counts = {
    total:  projects.length,
    active: projects.filter(p => p.status === 'active').length,
    done:   projects.filter(p => p.status === 'completed').length,
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Projects</h2>
          <p className="page-subtitle">Organize your work into structured initiatives</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditProject(null); setShowForm(true); }}>
          + New Project
        </button>
      </div>

      {!loading && projects.length > 0 && (
        <div className="projects-summary">
          <span>{counts.total} project{counts.total !== 1 ? 's' : ''}</span>
          {counts.active > 0 && <span><span className="projects-summary-dot" style={{ background:'#6366f1' }}/>{counts.active} active</span>}
          {counts.done   > 0 && <span><span className="projects-summary-dot" style={{ background:'#10b981' }}/>{counts.done} completed</span>}
        </div>
      )}

      <div className="projects-toolbar">
        <div className="projects-toolbar-left">
          <div className="projects-search">
            <span className="projects-search-icon">🔍</span>
            <input type="text" placeholder="Search projects…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="projects-filter-select" value={status} onChange={e => setStatus(e.target.value)}>
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select className="projects-filter-select" value={category} onChange={e => setCategory(e.target.value)}>
            {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="projects-toolbar-right">
          <select className="projects-filter-select" value={sort} onChange={e => setSort(e.target.value)}>
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="projects-grid">
          {[1,2,3].map(i => (
            <div key={i} style={{ background:'white', borderRadius:12, border:'1px solid #eaecf2', padding:20, display:'flex', flexDirection:'column', gap:14 }}>
              <div className="skeleton skeleton-text wide" />
              <div style={{ display:'flex', gap:8 }}>
                <div className="skeleton" style={{ height:22, width:80, borderRadius:99 }} />
                <div className="skeleton" style={{ height:22, width:70, borderRadius:99 }} />
              </div>
              <div className="skeleton" style={{ height:6, borderRadius:99 }} />
              <div className="skeleton skeleton-text" style={{ width:'50%' }} />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="error-state">
          <div className="error-state-icon">⚠️</div>
          <div className="error-state-title">Failed to load projects</div>
          <button className="btn btn-primary" onClick={load}>Retry</button>
        </div>
      ) : projects.length === 0 ? (
        <div className="projects-empty">
          <div className="projects-empty-icon">📁</div>
          <div className="projects-empty-title">
            {search || status || category ? 'No projects match your filters' : "You haven't created any projects yet"}
          </div>
          <div className="projects-empty-desc">
            {search || status || category
              ? 'Try adjusting your filters to see more results.'
              : 'Create a project to start organizing your work into structured initiatives.'}
          </div>
          {!search && !status && !category && (
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Create Your First Project</button>
          )}
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map(p => (
            <ProjectCard key={p.id} project={p} onEdit={openEdit} onStatusChange={handleStatusChange} />
          ))}
        </div>
      )}

      <ProjectFormModal
        isOpen={showForm} onClose={closeForm}
        onSave={editProject ? handleEdit : handleCreate}
        initialData={editProject}
      />
    </div>
  );
}
