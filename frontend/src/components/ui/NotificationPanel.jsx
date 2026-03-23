import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';

const TYPE_CONFIG = {
  task_overdue:   { icon: '🔴', label: 'Overdue', path: id => `/tasks/${id}` },
  task_due:       { icon: '🟡', label: 'Due Today', path: id => `/tasks/${id}` },
  event_reminder: { icon: '📅', label: 'Event',    path: id => `/calendar/${id}` },
  goal_deadline:  { icon: '🎯', label: 'Goal',     path: id => `/goals/${id}` },
  reminder:       { icon: '🔔', label: 'Reminder', path: () => '/' },
  warning:        { icon: '⚠️',  label: 'Warning',  path: () => '/' },
  system:         { icon: '💬', label: 'System',   path: () => '/' },
};

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationPanel({ onClose }) {
  const navigate = useNavigate();
  const [items,   setItems]   = useState([]);
  const [count,   setCount]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('unread'); // unread | all

  const load = useCallback(async () => {
    try {
      const params = filter === 'all' ? { status: 'all', limit: 50 } : { limit: 30 };
      const { data } = await apiClient.get('/notifications', { params });
      setItems(data.notifications); setCount(data.unreadCount);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function markRead(id) {
    await apiClient.patch(`/notifications/${id}/read`);
    setItems(p => p.map(n => n.id === id ? { ...n, status:'read' } : n));
    setCount(c => Math.max(0, c - 1));
  }

  async function markAllRead() {
    await apiClient.patch('/notifications/read-all');
    setItems(p => p.map(n => ({ ...n, status:'read' })));
    setCount(0);
  }

  function handleClick(notif) {
    if (notif.status === 'unread') markRead(notif.id);
    const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.system;
    const path = cfg.path(notif.related_record_id);
    if (path !== '/') navigate(path);
    onClose();
  }

  const shown = filter === 'unread' ? items.filter(n => n.status === 'unread') : items;

  return (
    <div className="notif-panel">
      <div className="notif-header">
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span className="notif-title">Notifications</span>
          {count > 0 && <span className="notif-badge">{count}</span>}
        </div>
        <div style={{ display:'flex', gap:6 }}>
          {count > 0 && (
            <button className="btn btn-ghost btn-xs" onClick={markAllRead} title="Mark all read"
              style={{ fontSize:11, color:'var(--color-brand-600)', fontWeight:600 }}>
              Mark all read
            </button>
          )}
          <button className="btn btn-ghost btn-icon btn-xs" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>
      </div>

      <div className="notif-filter-tabs">
        {['unread','all'].map(f => (
          <button key={f} className={`notif-filter-tab${filter===f?' active':''}`} onClick={() => setFilter(f)}>
            {f === 'unread' ? `Unread${count>0?` (${count})`:''}` : 'All'}
          </button>
        ))}
      </div>

      <div className="notif-body">
        {loading ? (
          <div style={{ padding:'var(--space-4)', display:'flex', flexDirection:'column', gap:8 }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height:52, borderRadius:8 }} />)}
          </div>
        ) : shown.length === 0 ? (
          <div className="notif-empty">
            <div className="notif-empty-icon">🔔</div>
            <div className="notif-empty-title">All clear</div>
            <div className="notif-empty-desc">{filter==='unread' ? 'No unread notifications' : 'No notifications yet'}</div>
          </div>
        ) : shown.map(n => {
          const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.system;
          const isUnread = n.status === 'unread';
          return (
            <div key={n.id} className={`notif-item${isUnread ? ' unread' : ''}`}
              onClick={() => handleClick(n)} role="button" tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && handleClick(n)}>
              <div className="notif-item-icon">{cfg.icon}</div>
              <div className="notif-item-body">
                <div className="notif-item-title">{n.title}</div>
                <div className="notif-item-msg">{n.message}</div>
                <div className="notif-item-time">{timeAgo(n.created_at)}</div>
              </div>
              {isUnread && <div className="notif-unread-dot" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}

// Exported for use in TopBar to show badge on bell
export function useUnreadCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    apiClient.get('/notifications', { params: { limit: 1 } })
      .then(r => setCount(r.data.unreadCount)).catch(() => {});
    const interval = setInterval(() => {
      apiClient.get('/notifications', { params: { limit: 1 } })
        .then(r => setCount(r.data.unreadCount)).catch(() => {});
    }, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, []);
  return count;
}
