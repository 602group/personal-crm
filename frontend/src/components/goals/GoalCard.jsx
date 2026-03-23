import { Link } from 'react-router-dom';

const STATUS_LABELS = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  on_hold:     'On Hold',
  completed:   'Completed',
  archived:    'Archived',
};

function fmt(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function GoalCard({ goal, onEdit, onStatusChange }) {
  const isCompleted = goal.status === 'completed';
  const isArchived  = goal.status === 'archived';

  function handleMenuClick(e, action) {
    e.preventDefault();
    e.stopPropagation();
    action();
  }

  return (
    <Link to={`/goals/${goal.id}`} className="goal-card" style={{ opacity: isArchived ? 0.6 : 1 }}>
      {/* Top row: title + action menu */}
      <div className="goal-card-top">
        <div className="goal-card-title">{goal.title}</div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button
            className="goal-card-menu-btn"
            title="Edit"
            onClick={e => handleMenuClick(e, () => onEdit(goal))}
            aria-label="Edit goal"
          >✏️</button>
          {!isCompleted && !isArchived && (
            <button
              className="goal-card-menu-btn"
              title="Mark complete"
              onClick={e => handleMenuClick(e, () => onStatusChange(goal.id, 'completed'))}
              aria-label="Mark complete"
            >✅</button>
          )}
          {!isArchived && (
            <button
              className="goal-card-menu-btn"
              title="Archive"
              onClick={e => handleMenuClick(e, () => onStatusChange(goal.id, 'archived'))}
              aria-label="Archive goal"
            >📦</button>
          )}
        </div>
      </div>

      {/* Badges */}
      <div className="goal-card-badges">
        <span className={`badge-status badge-status-${goal.status}`}>
          {STATUS_LABELS[goal.status]}
        </span>
        <span className="badge-category">{goal.category}</span>
        <span className={`badge-priority-${goal.priority}`}>{goal.priority}</span>
      </div>

      {/* Progress bar */}
      <div className="goal-card-progress">
        <div className="goal-progress-header">
          <span>Progress</span>
          <span className="goal-progress-pct">{goal.progress ?? 0}%</span>
        </div>
        <div className="goal-progress-track">
          <div
            className={`goal-progress-fill ${isCompleted ? 'completed' : ''}`}
            style={{ width: `${goal.progress ?? 0}%` }}
          />
        </div>
      </div>

      {/* Footer: date + linked counts */}
      <div className="goal-card-footer">
        <span>{goal.target_date ? `Due ${fmt(goal.target_date)}` : 'No target date'}</span>
        <span style={{ display: 'flex', gap: 8 }}>
          {goal.project_count > 0 && <span title="Linked projects">📁 {goal.project_count}</span>}
          {goal.task_count    > 0 && <span title="Linked tasks">✅ {goal.task_count}</span>}
          {goal.note_count    > 0 && <span title="Related notes">📝 {goal.note_count}</span>}
        </span>
      </div>
    </Link>
  );
}
