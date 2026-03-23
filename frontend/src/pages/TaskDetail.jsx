import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { tasksApi } from '../api/tasks';
import TaskFormModal from '../components/tasks/TaskFormModal';
import '../styles/tasks.css';

const STATUS_LABELS   = { todo:'To Do', in_progress:'In Progress', waiting:'Waiting', completed:'Completed', archived:'Archived' };
const PRIORITY_COLORS = { low:'#94a3b8', medium:'#6366f1', high:'#f97316', critical:'#ef4444' };

function fmt(d) { return d ? new Date(d).toLocaleDateString('en-US',{ month:'short', day:'numeric', year:'numeric' }) : '—'; }

function DueLabel({ date, completed }) {
  if (!date) return <span style={{ color:'var(--color-neutral-400)' }}>No due date</span>;
  if (completed) return <span>{fmt(date)}</span>;
  const todayStr = new Date().toISOString().slice(0,10);
  const diff = Math.round((new Date(date+'T00:00:00') - new Date(todayStr+'T00:00:00')) / 86400000);
  let color = 'var(--color-neutral-700)', label = fmt(date);
  if (diff < 0)   { color = 'var(--color-danger)';  label = `${fmt(date)} (${Math.abs(diff)}d overdue)`; }
  if (diff === 0) { color = '#f59e0b'; label = 'Today'; }
  if (diff === 1) { color = '#f59e0b'; label = `Tomorrow (${fmt(date)})`; }
  return <span style={{ color, fontWeight:'var(--weight-semibold)' }}>{label}</span>;
}

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [showEdit, setShowEdit] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const d = await tasksApi.get(id);
      setData(d);
    } catch(e) {
      setError(e.response?.status === 404 ? '404' : 'Failed to load task.');
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleEdit(formData) { await tasksApi.update(id, formData); setShowEdit(false); load(); }
  async function handleStatus(s)      { await tasksApi.update(id, { status: s }); load(); }
  async function handleDelete()       {
    if (!window.confirm('Delete this task permanently?')) return;
    await tasksApi.remove(id); navigate('/tasks');
  }

  if (loading) return <Skeleton />;
  if (error === '404') return (
    <div className="tasks-empty">
      <div className="tasks-empty-icon">🔍</div>
      <div className="tasks-empty-title">Task not found</div>
      <Link to="/tasks" className="btn btn-primary">Back to Tasks</Link>
    </div>
  );
  if (error) return (
    <div className="error-state">
      <div className="error-state-icon">⚠️</div>
      <div className="error-state-title">{error}</div>
      <button className="btn btn-primary" onClick={load}>Retry</button>
    </div>
  );

  const { task, goals, notes } = data;
  const isCompleted = task.status === 'completed';
  const isArchived  = task.status === 'archived';
  const pColor = PRIORITY_COLORS[task.priority] || '#94a3b8';

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="breadcrumb" style={{ marginBottom:'var(--space-4)' }}>
        <Link to="/tasks">Tasks</Link>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-current">{task.title}</span>
      </nav>

      {/* Header */}
      <div className="task-detail-header">
        <div style={{ width:6, height:56, borderRadius:8, background: pColor, flexShrink:0 }} />
        <div style={{ flex:1, minWidth:0 }}>
          <h2 style={{ fontSize:'var(--text-2xl)', fontWeight:'var(--weight-bold)', color:'var(--color-neutral-900)',
            marginBottom:'var(--space-2)', textDecoration: isCompleted?'line-through':undefined,
            color: isCompleted?'var(--color-neutral-400)':undefined }}>{task.title}</h2>
          <div style={{ display:'flex', alignItems:'center', gap:'var(--space-3)', flexWrap:'wrap' }}>
            <span className={`badge-task-${task.status}`}>{STATUS_LABELS[task.status]}</span>
            <span className={`badge-task-${task.priority}`}>{task.priority} priority</span>
            {task.project_title && (
              <Link to={`/projects/${task.project_id}`}
                style={{ fontSize:'var(--text-xs)', color:'var(--color-brand-500)', textDecoration:'none', display:'flex', alignItems:'center', gap:4 }}>
                📁 {task.project_title}
              </Link>
            )}
          </div>
        </div>
        <div style={{ display:'flex', gap:'var(--space-2)', flexShrink:0, flexWrap:'wrap' }}>
          <button className="btn btn-outline btn-sm" onClick={() => setShowEdit(true)}>✏️ Edit</button>
          {!isCompleted && <button className="btn btn-sm" style={{ background:'#ecfdf5', color:'#059669', border:'1px solid #a7f3d0' }} onClick={() => handleStatus('completed')}>✅ Complete</button>}
          {isCompleted && <button className="btn btn-sm btn-outline" onClick={() => handleStatus('todo')}>↩ Reopen</button>}
          {!isArchived && <button className="btn btn-outline btn-sm" onClick={() => handleStatus('archived')}>📦 Archive</button>}
          <button className="btn btn-sm" style={{ color:'var(--color-danger)', border:'1px solid #fca5a5', background:'var(--color-danger-light)' }} onClick={handleDelete}>🗑 Delete</button>
        </div>
      </div>

      {/* Grid */}
      <div className="task-detail-grid">
        {/* Left */}
        <div>
          {task.description && (
            <div className="task-detail-card">
              <div className="task-detail-card-header"><div className="task-detail-card-title">📋 Description</div></div>
              <div className="task-detail-card-body">
                <p style={{ fontSize:'var(--text-sm)', color:'var(--color-neutral-700)', lineHeight:1.7, whiteSpace:'pre-wrap' }}>{task.description}</p>
              </div>
            </div>
          )}

          {/* Linked Goals */}
          <div className="task-detail-card">
            <div className="task-detail-card-header">
              <div className="task-detail-card-title">🎯 Linked Goals ({goals.length})</div>
              <Link to="/goals" className="dash-card-link">All goals →</Link>
            </div>
            {goals.length === 0
              ? <div className="dash-empty" style={{ minHeight:72 }}>No goals linked to this task.</div>
              : goals.map(g => (
                  <Link key={g.id} to={`/goals/${g.id}`}
                    style={{ display:'flex', alignItems:'center', gap:'var(--space-3)', padding:'var(--space-3) var(--space-5)',
                      borderBottom:'1px solid var(--color-neutral-50)', textDecoration:'none', color:'inherit',
                      fontSize:'var(--text-sm)', transition: 'background var(--transition-fast)' }}
                    className="hover-highlight">
                    <span style={{ fontSize:16 }}>🎯</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:'var(--weight-medium)' }}>{g.title}</div>
                      <div style={{ fontSize:'var(--text-xs)', color:'var(--color-neutral-400)', textTransform:'capitalize' }}>{g.status} · {g.category}</div>
                    </div>
                  </Link>
                ))
            }
          </div>

          {/* Notes */}
          <div className="task-detail-card">
            <div className="task-detail-card-header">
              <div className="task-detail-card-title">📝 Notes ({notes.length})</div>
              <Link to="/notes" className="dash-card-link">All notes →</Link>
            </div>
            {notes.length === 0
              ? <div className="dash-empty" style={{ minHeight:72 }}>No notes linked to this task.</div>
              : notes.map(n => (
                  <div key={n.id} style={{ display:'flex', alignItems:'center', gap:'var(--space-3)', padding:'var(--space-3) var(--space-5)', borderBottom:'1px solid var(--color-neutral-50)', fontSize:'var(--text-sm)' }}>
                    <span style={{ fontSize:16 }}>📝</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:'var(--weight-medium)' }}>{n.title||'Untitled note'}</div>
                      <div style={{ fontSize:'var(--text-xs)', color:'var(--color-neutral-400)', textTransform:'capitalize' }}>{n.category} · {fmt(n.updated_at)}</div>
                    </div>
                  </div>
                ))
            }
          </div>
        </div>

        {/* Sidebar */}
        <div>
          {/* Details */}
          <div className="task-detail-card">
            <div className="task-detail-card-header"><div className="task-detail-card-title">ℹ️ Details</div></div>
            <div className="task-detail-card-body">
              <table style={{ width:'100%', fontSize:'var(--text-sm)', borderCollapse:'collapse' }}>
                <tbody>
                  {[
                    ['Status',    <span className={`badge-task-${task.status}`}>{STATUS_LABELS[task.status]}</span>],
                    ['Priority',  <span className={`badge-task-${task.priority}`}>{task.priority}</span>],
                    ['Due',       <DueLabel date={task.due_date} completed={isCompleted} />],
                    ['Start',     fmt(task.start_date)],
                    task.project_id && ['Project', task.project_title ? (
                      <Link to={`/projects/${task.project_id}`} style={{ color:'var(--color-brand-500)', textDecoration:'none', fontSize:'inherit' }}>
                        📁 {task.project_title}
                      </Link>
                    ) : task.project_id],
                    ['Created',   fmt(task.created_at)],
                    ['Updated',   fmt(task.updated_at)],
                    task.completed_at && ['Completed', fmt(task.completed_at)],
                  ].filter(Boolean).map(([label, value]) => (
                    <tr key={label} style={{ borderBottom:'1px solid var(--color-neutral-100)' }}>
                      <td style={{ padding:'8px 0', color:'var(--color-neutral-400)', width:'42%', verticalAlign:'middle' }}>{label}</td>
                      <td style={{ padding:'8px 0', color:'var(--color-neutral-700)', fontWeight:'var(--weight-medium)', verticalAlign:'middle' }}>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Status */}
          <div className="task-detail-card">
            <div className="task-detail-card-header"><div className="task-detail-card-title">⚡ Quick Actions</div></div>
            <div className="task-detail-card-body" style={{ display:'flex', flexDirection:'column', gap:'var(--space-2)' }}>
              {['todo','in_progress','waiting','completed','archived'].map(s => (
                <button key={s}
                  className={`btn btn-sm ${task.status===s?'btn-primary':'btn-outline'}`}
                  style={{ justifyContent:'flex-start', textAlign:'left' }}
                  onClick={() => handleStatus(s)} disabled={task.status===s}>
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <TaskFormModal isOpen={showEdit} onClose={() => setShowEdit(false)} onSave={handleEdit} initialData={task} />
    </div>
  );
}

function Skeleton() {
  return (
    <div>
      <div className="skeleton" style={{ height:14, width:180, marginBottom:'var(--space-6)', borderRadius:6 }} />
      <div style={{ display:'flex', gap:'var(--space-4)', marginBottom:'var(--space-6)' }}>
        <div className="skeleton" style={{ width:6, height:56, borderRadius:4, flexShrink:0 }} />
        <div style={{ flex:1 }}>
          <div className="skeleton skeleton-text wide" style={{ marginBottom:12 }} />
          <div style={{ display:'flex', gap:8 }}>
            {[80,70,90].map(w => <div key={w} className="skeleton" style={{ height:22, width:w, borderRadius:99 }} />)}
          </div>
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:24 }}>
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height:140, borderRadius:12 }} />)}
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          {[1,2].map(i => <div key={i} className="skeleton" style={{ height:180, borderRadius:12 }} />)}
        </div>
      </div>
    </div>
  );
}
