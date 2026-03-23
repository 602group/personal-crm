import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardApi } from '../api/dashboard';
import '../styles/dashboard.css';

/* ── Helpers ─────────────────────────────────────────────── */
function fmt(dateStr, opts = {}) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...opts });
}
function fmtTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
function currency(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n ?? 0);
}
function isOverdue(dueDate) {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}
const PRIORITY_COLORS = {
  critical: '#ef4444',
  high:     '#f97316',
  medium:   '#6366f1',
  low:      '#94a3b8',
};
const PRIORITY_BG = {
  critical: '#fee2e2',
  high:     '#ffedd5',
  medium:   '#eef2ff',
  low:      '#f1f5f9',
};

/* ═══════════════════════════════════════════════════════════
   Main Dashboard
═══════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const now     = new Date();
  const hour    = now.getHours();
  const greeting= hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const d = await dashboardApi.get();
      setData(d);
    } catch (e) {
      setError('Failed to load dashboard. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (error) {
    return (
      <div className="error-state">
        <div className="error-state-icon">⚠️</div>
        <div className="error-state-title">Dashboard unavailable</div>
        <div className="error-state-desc">{error}</div>
        <button className="btn btn-primary" style={{ marginTop: 'var(--space-4)' }} onClick={load}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* ── Welcome header ── */}
      <div className="dash-header">
        <div>
          <h2 className="page-title">{greeting}, {user?.name?.split(' ')[0]} 👋</h2>
          <p className="page-subtitle">{dateStr}</p>
        </div>
        <div className="dash-quick-actions">
          <button className="btn btn-sm btn-outline" onClick={() => navigate('/tasks')}>   + Task</button>
          <button className="btn btn-sm btn-outline" onClick={() => navigate('/goals')}>   + Goal</button>
          <button className="btn btn-sm btn-outline" onClick={() => navigate('/notes')}>   + Note</button>
          <button className="btn btn-sm btn-outline" onClick={() => navigate('/finance')}>  + Expense</button>
        </div>
      </div>

      {/* ── Stat chips ── */}
      {loading ? <SkeletonStats /> : <StatChips stats={data?.stats} />}

      {/* ── Main grid ── */}
      <div className="dash-grid">

        {/* TODAY'S PRIORITIES */}
        <div className="dash-card dash-card-full">
          <CardHeader
            icon="🔥"
            title="Today's Priorities"
            subtitle={loading ? '' : `${data?.todaysPriorities?.length ?? 0} items need attention`}
            linkTo="/tasks"
            linkLabel="All tasks →"
          />
          {loading
            ? <SkeletonRows count={4} />
            : <TaskList items={data?.todaysPriorities} emptyMsg="You're all caught up — no urgent tasks today." />
          }
        </div>

        {/* UPCOMING TASKS */}
        <div className="dash-card">
          <CardHeader
            icon="📆"
            title="Upcoming"
            subtitle="Next 7 days"
            linkTo="/tasks"
            linkLabel="View all →"
          />
          {loading
            ? <SkeletonRows count={4} />
            : <TaskList items={data?.upcomingTasks} compact emptyMsg="No tasks scheduled this week." />
          }
        </div>

        {/* ACTIVE GOALS */}
        <div className="dash-card">
          <CardHeader
            icon="🎯"
            title="Active Goals"
            subtitle={loading ? '' : `${data?.stats?.activeGoals ?? 0} in progress`}
            linkTo="/goals"
            linkLabel="All goals →"
          />
          {loading
            ? <SkeletonRows count={3} />
            : <GoalList items={data?.activeGoals} />
          }
        </div>

        {/* CALENDAR */}
        <div className="dash-card">
          <CardHeader
            icon="📅"
            title="Upcoming Events"
            subtitle="Next 14 days"
            linkTo="/calendar"
            linkLabel="Calendar →"
          />
          {loading
            ? <SkeletonRows count={4} />
            : <EventList items={data?.calendarEvents} />
          }
        </div>

        {/* FINANCE */}
        <div className="dash-card">
          <CardHeader
            icon="💰"
            title="Finance"
            subtitle={now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            linkTo="/finance"
            linkLabel="Details →"
          />
          {loading
            ? <SkeletonRows count={3} />
            : <FinanceSnapshot finance={data?.finance} />
          }
        </div>

        {/* RECENT NOTES */}
        <div className="dash-card">
          <CardHeader
            icon="📝"
            title="Recent Notes"
            subtitle="Latest captures"
            linkTo="/notes"
            linkLabel="All notes →"
          />
          {loading
            ? <SkeletonRows count={4} />
            : <NoteList items={data?.recentNotes} />
          }
        </div>

      </div>
    </div>
  );
}

/* ── Stat Chips ──────────────────────────────────────────── */
function StatChips({ stats }) {
  const chips = [
    { label: 'Open Tasks',     value: stats?.totalTasks    ?? 0, icon: '✅', color: 'brand',   to: '/tasks' },
    { label: 'Overdue',        value: stats?.overdueTasks  ?? 0, icon: '⚠️', color: stats?.overdueTasks > 0 ? 'danger' : 'neutral', to: '/tasks' },
    { label: 'Active Goals',   value: stats?.activeGoals   ?? 0, icon: '🎯', color: 'success', to: '/goals' },
    { label: 'Active Projects',value: stats?.activeProjects ?? 0, icon: '📁', color: 'brand',   to: '/projects' },
  ];
  return (
    <div className="dash-stats">
      {chips.map(c => (
        <Link key={c.label} to={c.to} className={`dash-stat-chip dash-stat-${c.color}`}>
          <span className="dash-stat-icon">{c.icon}</span>
          <span className="dash-stat-value">{c.value}</span>
          <span className="dash-stat-label">{c.label}</span>
        </Link>
      ))}
    </div>
  );
}
function SkeletonStats() {
  return (
    <div className="dash-stats">
      {[1,2,3,4].map(i => (
        <div key={i} className="dash-stat-chip" style={{ height: 72 }}>
          <div className="skeleton" style={{ height: 36, width: '100%', borderRadius: 8 }} />
        </div>
      ))}
    </div>
  );
}

/* ── Card Header ─────────────────────────────────────────── */
function CardHeader({ icon, title, subtitle, linkTo, linkLabel }) {
  return (
    <div className="dash-card-header">
      <div className="dash-card-title">
        <span className="dash-card-icon">{icon}</span>
        <div>
          <div className="dash-card-name">{title}</div>
          {subtitle && <div className="dash-card-sub">{subtitle}</div>}
        </div>
      </div>
      {linkTo && (
        <Link to={linkTo} className="dash-card-link">{linkLabel}</Link>
      )}
    </div>
  );
}

/* ── Task List ───────────────────────────────────────────── */
function TaskList({ items = [], compact, emptyMsg }) {
  if (!items.length) {
    return <div className="dash-empty">{emptyMsg || 'No tasks found.'}</div>;
  }
  return (
    <div className="dash-list">
      {items.map(t => {
        const overdue = isOverdue(t.due_date);
        return (
          <div key={t.id} className="dash-list-item">
            <div className="dash-task-check" />
            <div className="dash-list-text">
              <span className="dash-list-title" style={{ color: overdue ? 'var(--color-danger)' : undefined }}>
                {t.title}
              </span>
              {!compact && t.due_date && (
                <span className={`dash-list-meta ${overdue ? 'dash-overdue' : ''}`}>
                  {overdue ? 'Overdue · ' : ''}{fmt(t.due_date)}
                </span>
              )}
            </div>
            <span
              className="dash-priority-badge"
              style={{ background: PRIORITY_BG[t.priority], color: PRIORITY_COLORS[t.priority] }}
            >
              {t.priority}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Goal List ───────────────────────────────────────────── */
function GoalList({ items = [] }) {
  if (!items.length) {
    return (
      <div className="dash-empty">
        No active goals yet.{' '}
        <Link to="/goals">Create your first goal →</Link>
      </div>
    );
  }
  return (
    <div className="dash-list">
      {items.map(g => (
        <div key={g.id} className="dash-goal-item">
          <div className="dash-goal-top">
            <span className="dash-list-title" style={{ flex: 1 }}>{g.title}</span>
            <span className="dash-list-meta">{g.progress ?? 0}%</span>
          </div>
          <div className="dash-progress-track">
            <div
              className="dash-progress-fill"
              style={{ width: `${g.progress ?? 0}%` }}
            />
          </div>
          {g.target_date && (
            <div className="dash-list-meta" style={{ marginTop: 4 }}>
              Target: {fmt(g.target_date)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Event List ──────────────────────────────────────────── */
function EventList({ items = [] }) {
  if (!items.length) {
    return (
      <div className="dash-empty">
        No upcoming events.{' '}
        <Link to="/calendar">Add to calendar →</Link>
      </div>
    );
  }
  return (
    <div className="dash-list">
      {items.map(e => (
        <div key={e.id} className="dash-list-item">
          <div className="dash-event-dot" />
          <div className="dash-list-text">
            <span className="dash-list-title">{e.title}</span>
            <span className="dash-list-meta">
              {fmt(e.start_at)}{e.is_all_day ? ' · All day' : ` · ${fmtTime(e.start_at)}`}
            </span>
          </div>
          <span className="dash-category-tag">{e.category}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Finance Snapshot ────────────────────────────────────── */
function FinanceSnapshot({ finance }) {
  if (!finance) return null;
  const { income = 0, expenses = 0, net = 0, expenseBreakdown = [] } = finance;
  const hasData = income > 0 || expenses > 0;

  if (!hasData) {
    return (
      <div className="dash-empty">
        No financial records this month.{' '}
        <Link to="/finance">Add your first record →</Link>
      </div>
    );
  }

  return (
    <div className="dash-finance">
      <div className="dash-finance-row">
        <div className="dash-finance-stat dash-finance-income">
          <span className="dash-finance-label">Income</span>
          <span className="dash-finance-amount">{currency(income)}</span>
        </div>
        <div className="dash-finance-stat dash-finance-expense">
          <span className="dash-finance-label">Expenses</span>
          <span className="dash-finance-amount">{currency(expenses)}</span>
        </div>
        <div className={`dash-finance-stat ${net >= 0 ? 'dash-finance-pos' : 'dash-finance-neg'}`}>
          <span className="dash-finance-label">Net</span>
          <span className="dash-finance-amount">{net >= 0 ? '+' : ''}{currency(net)}</span>
        </div>
      </div>
      {expenseBreakdown.length > 0 && (
        <div className="dash-finance-breakdown">
          {expenseBreakdown.map(b => (
            <div key={b.category} className="dash-breakdown-row">
              <span className="dash-breakdown-cat">{b.category}</span>
              <span className="dash-breakdown-amt">{currency(b.total)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Note List ───────────────────────────────────────────── */
function NoteList({ items = [] }) {
  if (!items.length) {
    return (
      <div className="dash-empty">
        No notes yet.{' '}
        <Link to="/notes">Capture your first idea →</Link>
      </div>
    );
  }
  return (
    <div className="dash-list">
      {items.map(n => (
        <div key={n.id} className="dash-list-item">
          <div className="dash-note-icon">📝</div>
          <div className="dash-list-text">
            <span className="dash-list-title">{n.title || 'Untitled note'}</span>
            <span className="dash-list-meta">{fmt(n.updated_at)} · {n.category}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Skeleton Rows ───────────────────────────────────────── */
function SkeletonRows({ count = 4 }) {
  return (
    <div className="dash-list" style={{ padding: '0 var(--space-4) var(--space-4)' }}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 0' }}>
          <div className="skeleton" style={{ width: 16, height: 16, borderRadius: '50%', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton skeleton-text" style={{ width: `${60 + (i * 11) % 30}%` }} />
          </div>
          <div className="skeleton" style={{ width: 48, height: 20, borderRadius: 4 }} />
        </div>
      ))}
    </div>
  );
}
