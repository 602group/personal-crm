import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { projectsApi } from '../api/projects';
import ProjectFormModal from '../components/projects/ProjectFormModal';
import '../styles/projects.css';

const STATUS_LABELS  = { planning:'Planning', active:'Active', paused:'Paused', completed:'Completed', archived:'Archived' };
const CATEGORY_ICONS = { business:'💼', personal:'👤', finance:'💰', health:'💪', learning:'📚', other:'📁' };
const PRIORITY_COLORS= { low:'#94a3b8', medium:'#6366f1', high:'#f97316', critical:'#ef4444' };

function fmt(d) { return d ? new Date(d).toLocaleDateString('en-US',{ month:'short', day:'numeric', year:'numeric' }) : '—'; }

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [showEdit,  setShowEdit]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [localProg, setLocalProg] = useState(0);

  const load = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const d = await projectsApi.get(id);
      setData(d); setLocalProg(d.project.progress ?? 0);
    } catch(e) {
      setError(e.response?.status === 404 ? '404' : 'Failed to load project.');
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleEdit(formData) { await projectsApi.update(id, formData); setShowEdit(false); load(); }
  async function saveProgress(val)    { setSaving(true); try { await projectsApi.update(id, { progress: val }); } finally { setSaving(false); load(); } }
  async function handleStatus(s)      { await projectsApi.update(id, { status: s }); load(); }
  async function handleDelete()       {
    if (!window.confirm('Delete this project permanently? Tasks and notes referencing this project will lose the link.')) return;
    await projectsApi.remove(id); navigate('/projects');
  }

  if (loading) return <Skeleton />;
  if (error === '404') return (
    <div className="projects-empty">
      <div className="projects-empty-icon">🔍</div>
      <div className="projects-empty-title">Project not found</div>
      <Link to="/projects" className="btn btn-primary">Back to Projects</Link>
    </div>
  );
  if (error) return (
    <div className="error-state">
      <div className="error-state-icon">⚠️</div>
      <div className="error-state-title">{error}</div>
      <button className="btn btn-primary" onClick={load}>Retry</button>
    </div>
  );

  const { project, tasks, notes, goals, taskStats } = data;
  const isCompleted = project.status === 'completed';
  const isArchived  = project.status === 'archived';

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="breadcrumb" style={{ marginBottom:'var(--space-4)' }}>
        <Link to="/projects">Projects</Link>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-current">{project.title}</span>
      </nav>

      {/* Header */}
      <div className="project-detail-header">
        <div className="project-detail-icon">{CATEGORY_ICONS[project.category] || '📁'}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <h2 className="project-detail-title">{project.title}</h2>
          <div className="project-detail-meta">
            <span className={`badge-proj-${project.status}`}>{STATUS_LABELS[project.status]}</span>
            <span className="badge-category">{project.category}</span>
            <span className={`badge-priority-${project.priority}`}>{project.priority} priority</span>
            {project.target_date && <span style={{ fontSize:'var(--text-xs)', color:'var(--color-neutral-400)' }}>📅 {fmt(project.target_date)}</span>}
          </div>
        </div>
        <div className="project-detail-actions">
          <button className="btn btn-outline btn-sm" onClick={() => setShowEdit(true)}>✏️ Edit</button>
          {!isCompleted && !isArchived && (
            <button className="btn btn-sm" style={{ background:'#ecfdf5', color:'#059669', border:'1px solid #a7f3d0' }} onClick={() => handleStatus('completed')}>✅ Complete</button>
          )}
          {!isArchived && <button className="btn btn-outline btn-sm" onClick={() => handleStatus('archived')}>📦 Archive</button>}
          <button className="btn btn-sm" style={{ color:'var(--color-danger)', border:'1px solid #fca5a5', background:'var(--color-danger-light)' }} onClick={handleDelete}>🗑 Delete</button>
        </div>
      </div>

      {/* 2-col grid */}
      <div className="project-detail-grid">
        {/* Left */}
        <div>
          {/* Description */}
          {project.description && (
            <div className="project-detail-card">
              <div className="project-detail-card-header"><div className="project-detail-card-title">📋 Description</div></div>
              <div className="project-detail-card-body">
                <p style={{ fontSize:'var(--text-sm)', color:'var(--color-neutral-700)', lineHeight:1.7, whiteSpace:'pre-wrap' }}>{project.description}</p>
              </div>
            </div>
          )}

          {/* Tasks */}
          <div className="project-detail-card">
            <div className="project-detail-card-header">
              <div className="project-detail-card-title">✅ Tasks ({tasks.length})</div>
              <div style={{ display:'flex', alignItems:'center', gap:'var(--space-3)' }}>
                {taskStats.total > 0 && (
                  <span style={{ fontSize:'var(--text-xs)', color:'var(--color-neutral-400)' }}>
                    {taskStats.completed}/{taskStats.total} complete
                  </span>
                )}
                <Link to="/tasks" className="dash-card-link">All tasks →</Link>
              </div>
            </div>
            {tasks.length === 0
              ? <div className="dash-empty" style={{ minHeight:80 }}>No tasks linked to this project yet.</div>
              : tasks.map(t => (
                  <div key={t.id} className="project-task-row">
                    <div style={{ width:14, height:14, borderRadius:'50%', border:`1.5px solid ${PRIORITY_COLORS[t.priority]||'#9aa3b5'}`,
                      background: t.status === 'completed' ? PRIORITY_COLORS[t.priority]||'#9aa3b5' : 'transparent', flexShrink:0 }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:'var(--text-sm)', fontWeight:'var(--weight-medium)',
                        textDecoration: t.status==='completed'?'line-through':'none',
                        color: t.status==='completed'?'var(--color-neutral-400)':undefined, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {t.title}
                      </div>
                      {t.due_date && <div style={{ fontSize:'var(--text-xs)', color:'var(--color-neutral-400)' }}>Due {fmt(t.due_date)}</div>}
                    </div>
                    <span className={`badge-priority-${t.priority}`}>{t.priority}</span>
                  </div>
                ))
            }
          </div>

          {/* Linked Goals */}
          <div className="project-detail-card">
            <div className="project-detail-card-header">
              <div className="project-detail-card-title">🎯 Linked Goals ({goals.length})</div>
              <Link to="/goals" className="dash-card-link">All goals →</Link>
            </div>
            {goals.length === 0
              ? <div className="dash-empty" style={{ minHeight:80 }}>No goals linked to this project.</div>
              : goals.map(g => (
                  <div key={g.id} className="project-task-row">
                    <span style={{ fontSize:16 }}>🎯</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:'var(--weight-medium)', fontSize:'var(--text-sm)' }}>{g.title}</div>
                      <div style={{ fontSize:'var(--text-xs)', color:'var(--color-neutral-400)', textTransform:'capitalize' }}>{g.status} · {g.category}</div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                      <div style={{ width:48, height:5, background:'var(--color-neutral-100)', borderRadius:99, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${g.progress}%`, background:'var(--color-brand-400)', borderRadius:99 }} />
                      </div>
                      <span style={{ fontSize:11, color:'var(--color-neutral-400)', minWidth:28 }}>{g.progress}%</span>
                    </div>
                  </div>
                ))
            }
          </div>

          {/* Notes */}
          <div className="project-detail-card">
            <div className="project-detail-card-header">
              <div className="project-detail-card-title">📝 Notes ({notes.length})</div>
              <Link to="/notes" className="dash-card-link">All notes →</Link>
            </div>
            {notes.length === 0
              ? <div className="dash-empty" style={{ minHeight:80 }}>No notes linked to this project yet.</div>
              : notes.map(n => (
                  <div key={n.id} className="project-task-row">
                    <span style={{ fontSize:16 }}>📝</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:'var(--weight-medium)', fontSize:'var(--text-sm)' }}>{n.title||'Untitled note'}</div>
                      <div style={{ fontSize:'var(--text-xs)', color:'var(--color-neutral-400)', textTransform:'capitalize' }}>{n.category} · {fmt(n.updated_at)}</div>
                    </div>
                  </div>
                ))
            }
          </div>
        </div>

        {/* Sidebar */}
        <div>
          {/* Progress */}
          <div className="project-detail-card">
            <div className="project-detail-card-header"><div className="project-detail-card-title">📊 Progress</div></div>
            <div className="project-detail-card-body">
              <div style={{ textAlign:'center', marginBottom:'var(--space-4)' }}>
                <div style={{ fontSize:40, fontWeight:'var(--weight-bold)', color:'var(--color-brand-600)' }}>{localProg}%</div>
                <div style={{ fontSize:'var(--text-xs)', color:'var(--color-neutral-400)', marginTop:4 }}>Complete</div>
              </div>
              {taskStats.total > 0 && (
                <div style={{ marginBottom:'var(--space-3)', textAlign:'center', fontSize:'var(--text-xs)', color:'var(--color-neutral-400)' }}>
                  {taskStats.completed} of {taskStats.total} tasks done ({taskStats.pct}%)
                </div>
              )}
              <div className="project-progress-track" style={{ height:8, marginBottom:'var(--space-4)' }}>
                <div className={`project-progress-fill${isCompleted?' completed':''}`} style={{ width:`${localProg}%` }} />
              </div>
              <div className="project-progress-slider-wrap">
                <input type="range" min="0" max="100" step="5"
                  className="project-progress-slider" value={localProg}
                  onChange={e => setLocalProg(Number(e.target.value))}
                  onMouseUp={e => saveProgress(Number(e.target.value))}
                  onTouchEnd={e => saveProgress(Number(e.target.valueAsNumber))}
                  disabled={saving} />
                <span className="project-progress-slider-value">{localProg}%</span>
              </div>
              {saving && <div style={{ fontSize:11, color:'var(--color-neutral-400)', textAlign:'center', marginTop:8 }}>Saving…</div>}
            </div>
          </div>

          {/* Details */}
          <div className="project-detail-card">
            <div className="project-detail-card-header"><div className="project-detail-card-title">ℹ️ Details</div></div>
            <div className="project-detail-card-body">
              <table style={{ width:'100%', fontSize:'var(--text-sm)', borderCollapse:'collapse' }}>
                <tbody>
                  {[
                    ['Status',   <span className={`badge-proj-${project.status}`}>{STATUS_LABELS[project.status]}</span>],
                    ['Category', <span className="badge-category">{project.category}</span>],
                    ['Priority', <span className={`badge-priority-${project.priority}`}>{project.priority}</span>],
                    ['Start',    fmt(project.start_date)],
                    ['Target',   fmt(project.target_date)],
                    ['Created',  fmt(project.created_at)],
                    ['Updated',  fmt(project.updated_at)],
                    project.completed_at && ['Completed', fmt(project.completed_at)],
                  ].filter(Boolean).map(([label, value]) => (
                    <tr key={label} style={{ borderBottom:'1px solid var(--color-neutral-100)' }}>
                      <td style={{ padding:'8px 0', color:'var(--color-neutral-400)', width:'40%', verticalAlign:'middle' }}>{label}</td>
                      <td style={{ padding:'8px 0', color:'var(--color-neutral-700)', fontWeight:'var(--weight-medium)', verticalAlign:'middle' }}>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Status */}
          <div className="project-detail-card">
            <div className="project-detail-card-header"><div className="project-detail-card-title">⚡ Quick Actions</div></div>
            <div className="project-detail-card-body" style={{ display:'flex', flexDirection:'column', gap:'var(--space-2)' }}>
              {['planning','active','paused','completed','archived'].map(s => (
                <button key={s}
                  className={`btn btn-sm ${project.status===s?'btn-primary':'btn-outline'}`}
                  style={{ justifyContent:'flex-start', textAlign:'left' }}
                  onClick={() => handleStatus(s)} disabled={project.status===s}>
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ProjectFormModal isOpen={showEdit} onClose={() => setShowEdit(false)} onSave={handleEdit} initialData={project} />
    </div>
  );
}

function Skeleton() {
  return (
    <div>
      <div className="skeleton" style={{ height:14, width:200, marginBottom:'var(--space-6)', borderRadius:6 }} />
      <div style={{ display:'flex', gap:'var(--space-4)', marginBottom:'var(--space-6)' }}>
        <div className="skeleton" style={{ width:56, height:56, borderRadius:12, flexShrink:0 }} />
        <div style={{ flex:1 }}>
          <div className="skeleton skeleton-text wide" style={{ marginBottom:12 }} />
          <div style={{ display:'flex', gap:8 }}>
            {[80,70,60].map(w => <div key={w} className="skeleton" style={{ height:22, width:w, borderRadius:99 }} />)}
          </div>
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:24 }}>
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height:160, borderRadius:12 }} />)}
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          {[1,2].map(i => <div key={i} className="skeleton" style={{ height:180, borderRadius:12 }} />)}
        </div>
      </div>
    </div>
  );
}
