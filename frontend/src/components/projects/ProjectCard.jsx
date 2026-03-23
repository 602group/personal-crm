import { Link } from 'react-router-dom';

const STATUS_LABELS  = { planning:'Planning', active:'Active', paused:'Paused', completed:'Completed', archived:'Archived' };
const CATEGORY_ICONS = { business:'💼', personal:'👤', finance:'💰', health:'💪', learning:'📚', other:'📁' };
const ACCENT_COLORS  = { business:'#6366f1', personal:'#10b981', finance:'#f59e0b', health:'#ef4444', learning:'#8b5cf6', other:'#6b7280' };

function fmt(d) { return d ? new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : null; }

export default function ProjectCard({ project, onEdit, onStatusChange }) {
  const isCompleted = project.status === 'completed';
  const isArchived  = project.status === 'archived';
  const accent = ACCENT_COLORS[project.category] || ACCENT_COLORS.other;

  function stop(e, fn) { e.preventDefault(); e.stopPropagation(); fn(); }

  return (
    <Link
      to={`/projects/${project.id}`}
      className="project-card"
      style={{ '--project-accent': accent, opacity: isArchived ? 0.6 : 1 }}
    >
      <div className="project-card-top">
        <div style={{ display:'flex', alignItems:'center', gap:'var(--space-2)', flex:1, minWidth:0 }}>
          <span style={{ fontSize:18, flexShrink:0 }}>{CATEGORY_ICONS[project.category] || '📁'}</span>
          <span className="project-card-title">{project.title}</span>
        </div>
        <div className="project-card-actions">
          <button className="project-card-btn" title="Edit" onClick={e => stop(e, () => onEdit(project))}>✏️</button>
          {!isCompleted && !isArchived && (
            <button className="project-card-btn" title="Mark complete" onClick={e => stop(e, () => onStatusChange(project.id, 'completed'))}>✅</button>
          )}
          {!isArchived && (
            <button className="project-card-btn" title="Archive" onClick={e => stop(e, () => onStatusChange(project.id, 'archived'))}>📦</button>
          )}
        </div>
      </div>

      <div className="project-card-badges">
        <span className={`badge-proj-${project.status}`}>{STATUS_LABELS[project.status]}</span>
        <span className="badge-category">{project.category}</span>
        {project.priority !== 'medium' && <span className={`badge-priority-${project.priority}`}>{project.priority}</span>}
      </div>

      <div className="project-progress">
        <div className="project-progress-header">
          <span>Progress</span>
          <span className="project-progress-pct">{project.progress ?? 0}%</span>
        </div>
        <div className="project-progress-track">
          <div className={`project-progress-fill${isCompleted ? ' completed' : ''}`}
            style={{ width: `${project.progress ?? 0}%` }} />
        </div>
      </div>

      <div className="project-card-footer">
        <span>{project.target_date ? `Due ${fmt(project.target_date)}` : 'No target date'}</span>
        <span style={{ display:'flex', gap:8 }}>
          {project.goal_count > 0 && <span title="Linked goals">🎯 {project.goal_count}</span>}
          {project.task_count > 0 && <span title="Open tasks">✅ {project.task_count}</span>}
          {project.note_count > 0 && <span title="Notes">📝 {project.note_count}</span>}
        </span>
      </div>
    </Link>
  );
}
