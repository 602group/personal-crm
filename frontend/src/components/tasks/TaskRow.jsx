import { Link } from 'react-router-dom';

const STATUS_LABELS   = { todo:'To Do', in_progress:'In Progress', waiting:'Waiting', completed:'Completed', archived:'Archived' };
const PRIORITY_COLORS = { low:'#94a3b8', medium:'#6366f1', high:'#f97316', critical:'#ef4444' };

function fmtDue(d) {
  if (!d) return null;
  const todayStr = new Date().toISOString().slice(0,10);
  const diff = Math.round((new Date(d + 'T00:00:00') - new Date(todayStr + 'T00:00:00')) / 86400000);
  if (diff < 0)  return { label: `${Math.abs(diff)}d overdue`, cls: 'overdue' };
  if (diff === 0) return { label: 'Today',               cls: 'today' };
  if (diff === 1) return { label: 'Tomorrow',            cls: 'soon' };
  if (diff <= 7)  return { label: `In ${diff} days`,     cls: 'soon' };
  return { label: new Date(d).toLocaleDateString('en-US',{ month:'short', day:'numeric' }), cls: '' };
}

export default function TaskRow({ task, onCheck, onEdit, onArchive, onClick }) {
  const isCompleted = task.status === 'completed';
  const isArchived  = task.status === 'archived';
  const dueInfo     = fmtDue(task.due_date);
  const pColor      = PRIORITY_COLORS[task.priority] || '#94a3b8';

  function stop(e, fn) { e.preventDefault(); e.stopPropagation(); fn(); }

  return (
    <Link
      to={`/tasks/${task.id}`}
      className={`task-row${isCompleted || isArchived ? ' completed-row' : ''}`}
      onClick={e => onClick && stop(e, () => onClick(task))}
    >
      {/* Checkbox */}
      <div onClick={e => stop(e, () => onCheck(task))} style={{ display:'flex', alignItems:'center' }}>
        <button
          className={`task-check-btn${isCompleted ? ' done' : ''}`}
          type="button"
          style={{ borderColor: isCompleted ? undefined : pColor }}
          aria-label={isCompleted ? 'Mark incomplete' : 'Mark complete'}
        >
          {isCompleted ? '✓' : ''}
        </button>
      </div>

      {/* Title + meta */}
      <div className="task-title-cell">
        <div className={`task-title${isCompleted ? ' crossed' : ''}`}>{task.title}</div>
        {(task.project_title || task.goal_titles) && (
          <div className="task-meta">
            {task.project_title && <span>📁 {task.project_title}</span>}
            {task.project_title && task.goal_titles && <span style={{ margin:'0 4px' }}>·</span>}
            {task.goal_titles && <span>🎯 {task.goal_titles}</span>}
          </div>
        )}
      </div>

      {/* Priority */}
      <div>
        <span className={`badge-task-${task.priority}`}>{task.priority}</span>
      </div>

      {/* Status */}
      <div>
        <span className={`badge-task-${task.status}`}>{STATUS_LABELS[task.status]}</span>
      </div>

      {/* Due date */}
      <div className={`task-due ${dueInfo ? dueInfo.cls : 'none'}`}>
        {dueInfo ? dueInfo.label : '—'}
      </div>

      {/* Actions */}
      <div className="task-row-actions" onClick={e => e.preventDefault()}>
        <button className="task-row-btn" title="Edit" onClick={e => stop(e, () => onEdit(task))}>✏️</button>
        {!isArchived && <button className="task-row-btn" title="Archive" onClick={e => stop(e, () => onArchive(task.id))}>📦</button>}
      </div>
    </Link>
  );
}
