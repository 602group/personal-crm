import { useState, useEffect, useCallback } from 'react';
import { epicApi } from '../api/epic';
import EpicTaskFormModal from '../components/epic/EpicTaskFormModal';
import EpicLinkFormModal from '../components/epic/EpicLinkFormModal';
import TaskRow           from '../components/tasks/TaskRow';
import '../styles/epic.css';
import '../styles/tasks.css'; // ensure we inherit the toolbar styles

const VIEWS = [
  { id:'',          label:'All Epic Tasks' },
  { id:'completed', label:'Completed' },
];
const PRIORITY_OPTIONS = [
  { value:'', label:'All Priorities' },
  { value:'urgent',   label:'🔴 Urgent' },
  { value:'high',     label:'🟠 High' },
  { value:'medium',   label:'🔵 Medium' },
  { value:'low',      label:'⚪ Low' },
];
const STATUS_OPTIONS = [
  { value:'', label:'All Statuses' },
  { value:'todo',        label:'To Do' },
  { value:'in_progress', label:'In Progress' },
  { value:'review',      label:'Review' },
];
const SORT_OPTIONS = [
  { value:'due_date',   label:'Due Date' },
  { value:'priority',   label:'Priority' },
  { value:'created_at', label:'Date Created' },
  { value:'title',      label:'Title (A–Z)' },
];

export default function Epic() {
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' | 'links'
  
  // Data sets
  const [tasks, setTasks] = useState([]);
  const [links, setLinks] = useState([]);
  const [meta,  setMeta]  = useState({ total: 0 });
  const [loading, setLoading] = useState(true);

  // Filters for Epic Tasks
  const [view,     setView]     = useState('');
  const [priority, setPriority] = useState('');
  const [status,   setStatus]   = useState('');
  const [sort,     setSort]     = useState('due_date');
  const [search,   setSearch]   = useState('');

  // Modals
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editTask, setEditTask]           = useState(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [editLink, setEditLink]           = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const p = { view, priority, status: view === 'completed' ? undefined : status, sort, search };
      const [tRes, lRes] = await Promise.all([epicApi.listTasks(p), epicApi.listLinks()]);
      setTasks(tRes.tasks || []);
      setMeta({ total: tRes.total || 0 });
      setLinks(lRes.links || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [view, priority, status, sort, search]);

  useEffect(() => { loadData(); }, [loadData]);

  // Task Actions
  async function handleSaveTask(payload) {
    if (editTask) {
      await epicApi.updateTask(editTask.id, payload);
    } else {
      await epicApi.createTask(payload);
    }
    loadData();
  }

  async function handleDeleteTask(id) {
    if (!window.confirm('Delete this task?')) return;
    await epicApi.deleteTask(id);
    loadData();
  }

  async function handleToggleStatus(task) {
    const nextStatus = task.status === 'done' ? 'todo' : 'done';
    await epicApi.updateTask(task.id, { status: nextStatus });
    loadData(); // Re-fetch, which will magically hide it if view=''
  }

  // Link Actions
  async function handleSaveLink(payload) {
    if (editLink) {
      const saved = await epicApi.updateLink(editLink.id, payload);
      setLinks(p => p.map(l => l.id === editLink.id ? saved.link : l));
    } else {
      const saved = await epicApi.createLink(payload);
      setLinks(p => [saved.link, ...p]);
    }
  }

  async function handleDeleteLink(id, e) {
    e.stopPropagation();
    if (!window.confirm('Delete this link?')) return;
    await epicApi.deleteLink(id);
    setLinks(p => p.filter(l => l.id !== id));
  }

  function getFavicon(url) {
    try {
      const domain = new URL(url).hostname;
      return `https://icons.duckduckgo.com/ip3/${domain}.ico`;
    } catch { return null; }
  }

  const tasksReady = !loading || tasks.length > 0;
  const doneShown  = tasks.filter(t => t.status === 'done').length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Epic Work</h2>
          <p className="page-subtitle">Manage epic-scale tasks and quick references.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => {
            if (activeTab === 'tasks') { setEditTask(null); setShowTaskModal(true); }
            else { setEditLink(null); setShowLinkModal(true); }
          }}>
            {activeTab === 'tasks' ? '+ New Task' : '+ Add Link'}
          </button>
        </div>
      </div>

      <div className="epic-tabs">
        <button className={`epic-tab-btn ${activeTab==='tasks'?'active':''}`} onClick={()=>setActiveTab('tasks')}>Tasks</button>
        <button className={`epic-tab-btn ${activeTab==='links'?'active':''}`} onClick={()=>setActiveTab('links')}>Quick Links</button>
      </div>

      {activeTab === 'tasks' ? (
        /* TASKS TAB (Duplicated from Tasks.jsx UI) */
        <>
          <div className="tasks-view-tabs" style={{marginBottom:'var(--space-4)'}}>
            {VIEWS.map(v => (
              <button key={v.id} className={`tasks-view-tab${view === v.id ? ' active' : ''}`}
                onClick={() => { setView(v.id); setStatus(''); }}>
                {v.label}
              </button>
            ))}
          </div>

          <div className="tasks-toolbar">
            <div className="tasks-search">
              <span className="tasks-search-icon">🔍</span>
              <input type="text" placeholder="Search epic tasks…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {view !== 'completed' && (
              <select className="tasks-filter-select" value={status} onChange={e => setStatus(e.target.value)}>
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            )}
            <select className="tasks-filter-select" value={priority} onChange={e => setPriority(e.target.value)}>
              {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select className="tasks-filter-select" value={sort} onChange={e => setSort(e.target.value)}>
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {tasksReady && tasks.length > 0 && (
            <div className="tasks-summary">
              {meta.total} epic task{meta.total !== 1 ? 's' : ''}
              {doneShown > 0 && view !== 'completed' ? ` · ${doneShown} completed` : ''}
            </div>
          )}

          {loading && tasks.length === 0 ? (
            <div className="tasks-list" style={{ padding:'var(--space-4)' }}>
              {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height:52, borderRadius:8, marginBottom:8 }} />)}
            </div>
          ) : tasks.length === 0 ? (
            <div className="empty-state" style={{marginTop:'var(--space-8)'}}>
              <div className="empty-icon">📌</div>
              <h3>No Epic Tasks</h3>
              <p>Create tasks directly related to your epic work.</p>
              <button className="btn btn-primary" onClick={() => { setEditTask(null); setShowTaskModal(true); }}>
                Create Task
              </button>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-responsive">
                <table className="table">
                  <tbody>
                    {tasks.map(task => (
                      <TaskRow 
                        key={task.id} 
                        task={task} 
                        onToggle={() => handleToggleStatus(task)}
                        onEdit={() => { setEditTask(task); setShowTaskModal(true); }}
                        onDelete={() => handleDeleteTask(task.id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        /* LINKS TAB */
        <>
          {loading && links.length === 0 ? (
            <div className="skeleton" style={{ height: 400, borderRadius: 16 }} />
          ) : links.length === 0 ? (
            <div className="empty-state" style={{marginTop:'var(--space-8)'}}>
              <div className="empty-icon">🔗</div>
              <h3>No Quick Links</h3>
              <p>Save important URLs and references here for quick access.</p>
              <button className="btn btn-primary" onClick={() => { setEditLink(null); setShowLinkModal(true); }}>
                Add Link
              </button>
            </div>
          ) : (
            <div className="epic-links-grid">
              {links.map(link => {
                const fav = getFavicon(link.url);
                return (
                  <div key={link.id} className="epic-link-card" onClick={() => window.open(link.url, '_blank', 'noopener,noreferrer')}>
                    <div className="epic-link-actions">
                      <button className="epic-link-action-btn" onClick={(e) => { e.stopPropagation(); setEditLink(link); setShowLinkModal(true); }}>✎</button>
                      <button className="epic-link-action-btn delete" onClick={(e) => handleDeleteLink(link.id, e)}>🗑</button>
                    </div>
                    <div className="epic-link-header">
                      <div className="epic-link-icon">{fav ? <img src={fav} alt="" style={{width:16,height:16,borderRadius:2}}/> : '🏷'}</div>
                      {link.category && <span className="epic-link-category">{link.category}</span>}
                    </div>
                    <div className="epic-link-title">{link.title}</div>
                    <div className="epic-link-url">{link.url}</div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <EpicTaskFormModal 
        isOpen={showTaskModal} 
        onClose={() => setShowTaskModal(false)}
        initialData={editTask}
        onSave={handleSaveTask}
        onSaveComplete={() => setShowTaskModal(false)}
      />

      <EpicLinkFormModal 
        isOpen={showLinkModal} 
        onClose={() => setShowLinkModal(false)}
        initialData={editLink}
        onSave={(data) => { handleSaveLink(data); setShowLinkModal(false); }}
      />
    </div>
  );
}
