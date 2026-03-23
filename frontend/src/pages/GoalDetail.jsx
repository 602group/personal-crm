import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { goalsApi } from '../api/goals';
import GoalFormModal from '../components/goals/GoalFormModal';
import '../styles/goals.css';

const STATUS_LABELS = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  on_hold:     'On Hold',
  completed:   'Completed',
  archived:    'Archived',
};

const CATEGORY_ICONS = {
  personal: '👤', business: '💼', financial: '💰',
  health: '💪', learning: '📚', other: '🎯',
};

function fmt(dateStr, opts = {}) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', ...opts });
}

const PRIORITY_COLORS = { low: '#94a3b8', medium: '#6366f1', high: '#f97316', critical: '#ef4444' };

export default function GoalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [showEdit,  setShowEdit]  = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);
  const [localProgress, setLocalProgress]   = useState(0);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const d = await goalsApi.get(id);
      setData(d);
      setLocalProgress(d.goal.progress ?? 0);
    } catch (e) {
      if (e.response?.status === 404) setError('404');
      else setError('Failed to load goal.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleEdit(formData) {
    await goalsApi.update(id, formData);
    load();
  }

  async function saveProgress(val) {
    setSavingProgress(true);
    try { await goalsApi.update(id, { progress: val }); }
    finally { setSavingProgress(false); load(); }
  }

  async function handleStatusChange(newStatus) {
    await goalsApi.update(id, { status: newStatus });
    load();
  }

  async function handleDelete() {
    if (!window.confirm('Delete this goal permanently? This cannot be undone.')) return;
    await goalsApi.remove(id);
    navigate('/goals');
  }

  if (loading) return <DetailSkeleton />;
  if (error === '404') return (
    <div className="goals-empty">
      <div className="goals-empty-icon">🔍</div>
      <div className="goals-empty-title">Goal not found</div>
      <Link to="/goals" className="btn btn-primary">Back to Goals</Link>
    </div>
  );
  if (error) return (
    <div className="error-state">
      <div className="error-state-icon">⚠️</div>
      <div className="error-state-title">{error}</div>
      <button className="btn btn-primary" onClick={load}>Retry</button>
    </div>
  );

  const { goal, projects, tasks, notes } = data;
  const isCompleted = goal.status === 'completed';
  const isArchived  = goal.status === 'archived';

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="breadcrumb" style={{ marginBottom: 'var(--space-4)' }}>
        <Link to="/goals">Goals</Link>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-current">{goal.title}</span>
      </nav>

      {/* Header */}
      <div className="goal-detail-header">
        <div className="goal-detail-icon">
          {CATEGORY_ICONS[goal.category] || '🎯'}
        </div>
        <div className="goal-detail-header-content">
          <h2 className="goal-detail-title">{goal.title}</h2>
          <div className="goal-detail-meta">
            <span className={`badge-status badge-status-${goal.status}`}>{STATUS_LABELS[goal.status]}</span>
            <span className="badge-category">{goal.category}</span>
            <span className={`badge-priority-${goal.priority}`}>{goal.priority} priority</span>
            {goal.target_date && (
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-neutral-400)' }}>
                📅 Target: {fmt(goal.target_date)}
              </span>
            )}
          </div>
        </div>
        <div className="goal-detail-actions">
          <button className="btn btn-outline btn-sm" onClick={() => setShowEdit(true)}>✏️ Edit</button>
          {!isCompleted && !isArchived && (
            <button className="btn btn-sm" style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}
              onClick={() => handleStatusChange('completed')}>
              ✅ Complete
            </button>
          )}
          {!isArchived && (
            <button className="btn btn-outline btn-sm" onClick={() => handleStatusChange('archived')}>
              📦 Archive
            </button>
          )}
          <button className="btn btn-sm" style={{ color: 'var(--color-danger)', border: '1px solid #fca5a5', background: 'var(--color-danger-light)' }}
            onClick={handleDelete}>
            🗑 Delete
          </button>
        </div>
      </div>

      {/* Main 2-col grid */}
      <div className="goal-detail-grid">
        {/* Left column */}
        <div>
          {/* Description */}
          {goal.description && (
            <div className="goal-detail-card">
              <div className="goal-detail-card-header">
                <div className="goal-detail-card-title">📋 Description</div>
              </div>
              <div className="goal-detail-card-body">
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-neutral-700)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                  {goal.description}
                </p>
              </div>
            </div>
          )}

          {/* Linked Projects */}
          <div className="goal-detail-card">
            <div className="goal-detail-card-header">
              <div className="goal-detail-card-title">📁 Linked Projects ({projects.length})</div>
              <Link to="/projects" className="dash-card-link">View all →</Link>
            </div>
            {projects.length === 0
              ? <div className="dash-empty" style={{ minHeight: 80 }}>No projects linked to this goal yet.</div>
              : projects.map(p => (
                  <div key={p.id} className="related-item">
                    <span style={{ fontSize: 16 }}>📁</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 'var(--weight-medium)', fontSize: 'var(--text-sm)' }}>{p.title}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-neutral-400)', textTransform: 'capitalize' }}>{p.status} · {p.category}</div>
                    </div>
                    <ProgressPill value={p.progress} />
                  </div>
                ))
            }
          </div>

          {/* Linked Tasks */}
          <div className="goal-detail-card">
            <div className="goal-detail-card-header">
              <div className="goal-detail-card-title">✅ Linked Tasks ({tasks.length})</div>
              <Link to="/tasks" className="dash-card-link">View all →</Link>
            </div>
            {tasks.length === 0
              ? <div className="dash-empty" style={{ minHeight: 80 }}>No tasks linked to this goal yet.</div>
              : tasks.map(t => (
                  <div key={t.id} className="related-item">
                    <div style={{ width: 14, height: 14, borderRadius: '50%', border: `1.5px solid ${PRIORITY_COLORS[t.priority] || '#9aa3b5'}`, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 'var(--weight-medium)', fontSize: 'var(--text-sm)', textDecoration: t.status === 'completed' ? 'line-through' : 'none', color: t.status === 'completed' ? 'var(--color-neutral-400)' : undefined }}>
                        {t.title}
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-neutral-400)' }}>
                        {t.status.replace('_', ' ')} {t.due_date ? `· Due ${fmt(t.due_date)}` : ''}
                      </div>
                    </div>
                    <span className={`badge-priority-${t.priority}`}>{t.priority}</span>
                  </div>
                ))
            }
          </div>

          {/* Linked Notes */}
          <div className="goal-detail-card">
            <div className="goal-detail-card-header">
              <div className="goal-detail-card-title">📝 Related Notes ({notes.length})</div>
              <Link to="/notes" className="dash-card-link">View all →</Link>
            </div>
            {notes.length === 0
              ? <div className="dash-empty" style={{ minHeight: 80 }}>No notes linked to this goal yet.</div>
              : notes.map(n => (
                  <div key={n.id} className="related-item">
                    <span style={{ fontSize: 16 }}>📝</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 'var(--weight-medium)', fontSize: 'var(--text-sm)' }}>{n.title || 'Untitled note'}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-neutral-400)', textTransform: 'capitalize' }}>{n.category} · {fmt(n.updated_at)}</div>
                    </div>
                  </div>
                ))
            }
          </div>
        </div>

        {/* Right sidebar */}
        <div>
          {/* Progress card */}
          <div className="goal-detail-card">
            <div className="goal-detail-card-header">
              <div className="goal-detail-card-title">📊 Progress</div>
            </div>
            <div className="goal-detail-card-body">
              <div style={{ textAlign: 'center', marginBottom: 'var(--space-4)' }}>
                <div style={{ fontSize: 40, fontWeight: 'var(--weight-bold)', color: 'var(--color-brand-600)' }}>
                  {localProgress}%
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-neutral-400)', marginTop: 4 }}>Complete</div>
              </div>
              <div className="goal-progress-track" style={{ height: 8, marginBottom: 'var(--space-4)' }}>
                <div
                  className={`goal-progress-fill ${isCompleted ? 'completed' : ''}`}
                  style={{ width: `${localProgress}%` }}
                />
              </div>
              <div className="progress-slider-wrap">
                <input
                  type="range" min="0" max="100" step="5"
                  className="progress-slider"
                  value={localProgress}
                  onChange={e => setLocalProgress(Number(e.target.value))}
                  onMouseUp={e => saveProgress(Number(e.target.value))}
                  onTouchEnd={e => saveProgress(Number(e.target.valueAsNumber))}
                  disabled={savingProgress}
                />
                <span className="progress-slider-value">{localProgress}%</span>
              </div>
              {savingProgress && <div style={{ fontSize: 11, color: 'var(--color-neutral-400)', textAlign: 'center', marginTop: 8 }}>Saving…</div>}
            </div>
          </div>

          {/* Details card */}
          <div className="goal-detail-card">
            <div className="goal-detail-card-header">
              <div className="goal-detail-card-title">ℹ️ Details</div>
            </div>
            <div className="goal-detail-card-body">
              <table style={{ width: '100%', fontSize: 'var(--text-sm)', borderCollapse: 'collapse' }}>
                <tbody>
                  {[
                    ['Status',   <span className={`badge-status badge-status-${goal.status}`}>{STATUS_LABELS[goal.status]}</span>],
                    ['Category', <span className="badge-category">{goal.category}</span>],
                    ['Priority', <span className={`badge-priority-${goal.priority}`}>{goal.priority}</span>],
                    ['Start',    goal.start_date  ? fmt(goal.start_date)  : '—'],
                    ['Target',   goal.target_date ? fmt(goal.target_date) : '—'],
                    ['Created',  fmt(goal.created_at)],
                    ['Updated',  fmt(goal.updated_at)],
                    goal.completed_at && ['Completed', fmt(goal.completed_at)],
                  ].filter(Boolean).map(([label, value]) => (
                    <tr key={label} style={{ borderBottom: '1px solid var(--color-neutral-100)' }}>
                      <td style={{ padding: '8px 0', color: 'var(--color-neutral-400)', width: '40%', verticalAlign: 'middle' }}>{label}</td>
                      <td style={{ padding: '8px 0', color: 'var(--color-neutral-700)', fontWeight: 'var(--weight-medium)', verticalAlign: 'middle' }}>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick status change */}
          <div className="goal-detail-card">
            <div className="goal-detail-card-header">
              <div className="goal-detail-card-title">⚡ Quick Actions</div>
            </div>
            <div className="goal-detail-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {['not_started','in_progress','on_hold','completed','archived'].map(s => (
                <button
                  key={s}
                  className={`btn btn-sm ${goal.status === s ? 'btn-primary' : 'btn-outline'}`}
                  style={{ justifyContent: 'flex-start', textAlign: 'left' }}
                  onClick={() => handleStatusChange(s)}
                  disabled={goal.status === s}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <GoalFormModal
        isOpen={showEdit}
        onClose={() => setShowEdit(false)}
        onSave={handleEdit}
        initialData={goal}
      />
    </div>
  );
}

function ProgressPill({ value = 0 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
      <div style={{ width: 56, height: 5, background: 'var(--color-neutral-100)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${value}%`, background: 'var(--color-brand-400)', borderRadius: 99 }} />
      </div>
      <span style={{ fontSize: 11, color: 'var(--color-neutral-400)', minWidth: 28 }}>{value}%</span>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div>
      <div className="skeleton" style={{ height: 14, width: 200, marginBottom: 'var(--space-6)', borderRadius: 6 }} />
      <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <div className="skeleton" style={{ width: 56, height: 56, borderRadius: 12, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton skeleton-text wide" style={{ marginBottom: 12 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            {[80,70,60].map(w => <div key={w} className="skeleton" style={{ height: 22, width: w, borderRadius: 99 }} />)}
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 160, borderRadius: 12 }} />)}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {[1,2].map(i => <div key={i} className="skeleton" style={{ height: 180, borderRadius: 12 }} />)}
        </div>
      </div>
    </div>
  );
}
