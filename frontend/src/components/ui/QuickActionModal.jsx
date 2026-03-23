import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const QUICK_ACTIONS = [
  {
    group: 'Productivity',
    actions: [
      { id: 'goal',     label: 'New Goal',    icon: '🎯', to: '/goals',    description: 'Set a new objective' },
      { id: 'project',  label: 'New Project', icon: '📁', to: '/projects', description: 'Start a new project' },
      { id: 'task',     label: 'New Task',    icon: '✅', to: '/tasks',    description: 'Add a task to your list' },
      { id: 'note',     label: 'New Note',    icon: '📝', to: '/notes',    description: 'Capture a thought or idea' },
    ],
  },
  {
    group: 'Management',
    actions: [
      { id: 'event',   label: 'New Event',   icon: '📅', to: '/calendar', description: 'Add to your calendar' },
      { id: 'expense', label: 'New Expense',  icon: '💰', to: '/finance',  description: 'Log a financial entry' },
    ],
  },
];

export default function QuickActionModal({ onClose }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const inputRef = useRef(null);

  // Focus search on open
  useEffect(() => { inputRef.current?.focus(); }, []);

  // Close on Escape
  useEffect(() => {
    function handler(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const allActions = QUICK_ACTIONS.flatMap(g => g.actions);
  const filtered = search.trim()
    ? allActions.filter(a =>
        a.label.toLowerCase().includes(search.toLowerCase()) ||
        a.description.toLowerCase().includes(search.toLowerCase()))
    : null;

  function handleAction(action) {
    navigate(action.to);
    onClose();
  }

  return (
    <div className="modal-overlay quick-action-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="quick-action-modal">
        {/* Search bar */}
        <div className="quick-action-search">
          <SearchIcon />
          <input
            ref={inputRef}
            className="quick-action-input"
            placeholder="Search actions…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="quick-action-clear" onClick={() => setSearch('')}>
              <ClearIcon />
            </button>
          )}
        </div>

        <div className="quick-action-body">
          {filtered ? (
            filtered.length === 0 ? (
              <div className="quick-action-empty">No actions match &ldquo;{search}&rdquo;</div>
            ) : (
              <div className="quick-action-group">
                {filtered.map(action => (
                  <ActionItem key={action.id} action={action} onSelect={handleAction} />
                ))}
              </div>
            )
          ) : (
            QUICK_ACTIONS.map(group => (
              <div key={group.group} className="quick-action-group">
                <div className="quick-action-group-label">{group.group}</div>
                {group.actions.map(action => (
                  <ActionItem key={action.id} action={action} onSelect={handleAction} />
                ))}
              </div>
            ))
          )}
        </div>

        <div className="quick-action-footer">
          <span className="quick-action-hint"><kbd>↑↓</kbd> navigate</span>
          <span className="quick-action-hint"><kbd>↵</kbd> select</span>
          <span className="quick-action-hint"><kbd>Esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}

function ActionItem({ action, onSelect }) {
  return (
    <button className="quick-action-item" onClick={() => onSelect(action)}>
      <span className="quick-action-icon">{action.icon}</span>
      <div className="quick-action-text">
        <span className="quick-action-label">{action.label}</span>
        <span className="quick-action-desc">{action.description}</span>
      </div>
      <span className="quick-action-arrow">→</span>
    </button>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
}
function ClearIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}
