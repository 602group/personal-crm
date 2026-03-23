import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { tasksApi }  from '../api/tasks';
import TaskRow       from '../components/tasks/TaskRow';
import TaskFormModal from '../components/tasks/TaskFormModal';
import '../styles/tasks.css';

const VIEWS = [
  { id:'',          label:'All Tasks' },
  { id:'today',     label:'Today' },
  { id:'overdue',   label:'Overdue' },
  { id:'week',      label:'This Week' },
  { id:'completed', label:'Completed' },
];
const PRIORITY_OPTIONS = [
  { value:'', label:'All Priorities' },
  { value:'critical', label:'🔴 Critical' },
  { value:'high',     label:'🟠 High' },
  { value:'medium',   label:'🔵 Medium' },
  { value:'low',      label:'⚪ Low' },
];
const STATUS_OPTIONS = [
  { value:'', label:'All Statuses' },
  { value:'todo',        label:'To Do' },
  { value:'in_progress', label:'In Progress' },
  { value:'waiting',     label:'Waiting' },
];
const SORT_OPTIONS = [
  { value:'due_date',   label:'Due Date' },
  { value:'priority',   label:'Priority' },
  { value:'created_at', label:'Date Created' },
  { value:'title',      label:'Title (A–Z)' },
];

export default function Tasks() {
  const navigate = useNavigate();
  const [tasks,     setTasks]     = useState([]);
  const [meta,      setMeta]      = useState({ total:0, overdueCount:0, todayCount:0 });
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [view,      setView]      = useState('');
  const [priority,  setPriority]  = useState('');
  const [status,    setStatus]    = useState('');
  const [sort,      setSort]      = useState('due_date');
  const [search,    setSearch]    = useState('');
  const [editTask,  setEditTask]  = useState(null);
  const [showForm,  setShowForm]  = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const data = await tasksApi.list({ view, priority, status: view === 'completed' ? undefined : status, sort, search });
      setTasks(data.tasks);
      setMeta({ total: data.total, overdueCount: data.overdueCount, todayCount: data.todayCount });
    } catch { setError('Failed to load tasks.'); }
    finally { setLoading(false); }
  }, [view, priority, status, sort, search]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(formData) {
    const { task } = await tasksApi.create(formData);
    await load();
    navigate(`/tasks/${task.id}`);
  }
  async function handleEdit(formData) {
    await tasksApi.update(editTask.id, formData); setEditTask(null); load();
  }
  async function handleCheck(task) {
    const newStatus = task.status === 'completed' ? 'todo' : 'completed';
    await tasksApi.update(task.id, { status: newStatus }); load();
  }
  async function handleArchive(id) { await tasksApi.update(id, { status:'archived' }); load(); }
  function openEdit(t) { setEditTask(t); setShowForm(true); }
  function closeForm() { setShowForm(false); setEditTask(null); }

  const totalShown = tasks.length;
  const doneShown  = tasks.filter(t => t.status === 'completed').length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Tasks</h2>
          <p className="page-subtitle">Manage your daily work and execution</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditTask(null); setShowForm(true); }}>
          + New Task
        </button>
      </div>

      {/* View tabs */}
      <div className="tasks-view-tabs">
        {VIEWS.map(v => (
          <button key={v.id} className={`tasks-view-tab${view === v.id ? ' active' : ''}`}
            onClick={() => { setView(v.id); setStatus(''); }}>
            {v.label}
            {v.id === 'overdue' && meta.overdueCount > 0 && (
              <span className="tasks-badge">{meta.overdueCount}</span>
            )}
            {v.id === 'today' && meta.todayCount > 0 && (
              <span className="tasks-badge tasks-badge-warn">{meta.todayCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="tasks-toolbar">
        <div className="tasks-search">
          <span className="tasks-search-icon">🔍</span>
          <input type="text" placeholder="Search tasks…" value={search} onChange={e => setSearch(e.target.value)} />
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

      {!loading && totalShown > 0 && (
        <div className="tasks-summary">
          {totalShown} task{totalShown !== 1 ? 's' : ''}
          {doneShown > 0 && view !== 'completed' ? ` · ${doneShown} completed` : ''}
        </div>
      )}

      {loading ? (
        <div className="tasks-list" style={{ padding:'var(--space-4)' }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height:52, borderRadius:8, marginBottom:8 }} />)}
        </div>
      ) : error ? (
        <div className="error-state">
          <div className="error-state-icon">⚠️</div>
          <div className="error-state-title">Failed to load tasks</div>
          <button className="btn btn-primary" onClick={load}>Retry</button>
        </div>
      ) : tasks.length === 0 ? (
        <div className="tasks-empty">
          <div className="tasks-empty-icon">
            {view === 'overdue' ? '🎉' : view === 'today' ? '☀️' : '✅'}
          </div>
          <div className="tasks-empty-title">
            {view === 'overdue' ? 'All caught up — no overdue tasks!'
              : view === 'today' ? 'Nothing due today'
              : view === 'week'  ? 'No tasks due this week'
              : view === 'completed' ? 'No completed tasks yet'
              : search || priority || status ? 'No tasks match your filters'
              : "You haven't created any tasks yet"}
          </div>
          <div className="tasks-empty-desc">
            {!search && !priority && !status && !view &&
              "Create your first task to start organizing your work."}
          </div>
          {!view && !search && !priority && !status && (
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Create Your First Task</button>
          )}
        </div>
      ) : (
        <div className="tasks-list">
          <div className="tasks-list-header">
            <span />
            <span>Title</span>
            <span>Priority</span>
            <span>Status</span>
            <span>Due</span>
            <span />
          </div>
          {tasks.map(t => (
            <TaskRow key={t.id} task={t}
              onCheck={handleCheck}
              onEdit={openEdit}
              onArchive={handleArchive}
            />
          ))}
        </div>
      )}

      <TaskFormModal
        isOpen={showForm} onClose={closeForm}
        onSave={editTask ? handleEdit : handleCreate}
        initialData={editTask}
      />
    </div>
  );
}
