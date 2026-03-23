import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { goalsApi } from '../api/goals';
import GoalCard from '../components/goals/GoalCard';
import GoalFormModal from '../components/goals/GoalFormModal';
import '../styles/goals.css';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'on_hold',     label: 'On Hold' },
  { value: 'completed',   label: 'Completed' },
  { value: 'archived',    label: 'Archived' },
];
const CATEGORY_OPTIONS = [
  { value: '', label: 'All Categories' },
  { value: 'personal',   label: 'Personal' },
  { value: 'business',   label: 'Business' },
  { value: 'financial',  label: 'Financial' },
  { value: 'health',     label: 'Health' },
  { value: 'learning',   label: 'Learning' },
  { value: 'other',      label: 'Other' },
];
const SORT_OPTIONS = [
  { value: 'created_at', label: 'Date Created' },
  { value: 'updated_at', label: 'Last Updated' },
  { value: 'target_date',label: 'Target Date' },
  { value: 'progress',   label: 'Progress' },
  { value: 'title',      label: 'Title (A–Z)' },
];

export default function Goals() {
  const navigate = useNavigate();
  const [goals,    setGoals]   = useState([]);
  const [loading,  setLoading] = useState(true);
  const [error,    setError]   = useState(null);
  const [search,   setSearch]  = useState('');
  const [status,   setStatus]  = useState('');
  const [category, setCategory]= useState('');
  const [sort,     setSort]    = useState('created_at');
  const [editGoal, setEditGoal]= useState(null);
  const [showForm, setShowForm]= useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await goalsApi.list({ status, category, sort, search });
      setGoals(data.goals);
    } catch {
      setError('Failed to load goals.');
    } finally {
      setLoading(false);
    }
  }, [status, category, sort, search]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(formData) {
    const { goal } = await goalsApi.create(formData);
    await load();
    navigate(`/goals/${goal.id}`);
  }

  async function handleEdit(formData) {
    await goalsApi.update(editGoal.id, formData);
    setEditGoal(null);
    load();
  }

  async function handleStatusChange(id, newStatus) {
    await goalsApi.update(id, { status: newStatus });
    load();
  }

  function openEdit(goal) {
    setEditGoal(goal);
    setShowForm(true);
  }
  function closeForm() {
    setShowForm(false);
    setEditGoal(null);
  }

  // Stats summary for header
  const counts = {
    total:       goals.length,
    in_progress: goals.filter(g => g.status === 'in_progress').length,
    completed:   goals.filter(g => g.status === 'completed').length,
  };

  const STATUS_DOT_COLORS = {
    in_progress: '#6366f1',
    completed:   '#10b981',
  };

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Goals</h2>
          <p className="page-subtitle">Define and track your long-term objectives</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditGoal(null); setShowForm(true); }}>
          + New Goal
        </button>
      </div>

      {/* Summary bar */}
      {!loading && goals.length > 0 && (
        <div className="goals-summary">
          <span>{counts.total} goal{counts.total !== 1 ? 's' : ''}</span>
          {counts.in_progress > 0 && (
            <span>
              <span className="goals-summary-dot" style={{ background: STATUS_DOT_COLORS.in_progress }} />
              {counts.in_progress} in progress
            </span>
          )}
          {counts.completed > 0 && (
            <span>
              <span className="goals-summary-dot" style={{ background: STATUS_DOT_COLORS.completed }} />
              {counts.completed} completed
            </span>
          )}
        </div>
      )}

      {/* Toolbar */}
      <div className="goals-toolbar">
        <div className="goals-toolbar-left">
          <div className="goals-search">
            <span className="goals-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search goals…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select className="goals-filter-select" value={status} onChange={e => setStatus(e.target.value)}>
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select className="goals-filter-select" value={category} onChange={e => setCategory(e.target.value)}>
            {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="goals-toolbar-right">
          <select className="goals-filter-select" value={sort} onChange={e => setSort(e.target.value)}>
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="goals-grid">
          {[1,2,3].map(i => (
            <div key={i} style={{ background: 'white', borderRadius: 12, border: '1px solid #eaecf2', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="skeleton skeleton-text wide" />
              <div style={{ display: 'flex', gap: 8 }}>
                <div className="skeleton" style={{ height: 22, width: 80, borderRadius: 99 }} />
                <div className="skeleton" style={{ height: 22, width: 70, borderRadius: 99 }} />
              </div>
              <div className="skeleton" style={{ height: 6, borderRadius: 99 }} />
              <div className="skeleton skeleton-text" style={{ width: '60%' }} />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="error-state">
          <div className="error-state-icon">⚠️</div>
          <div className="error-state-title">Failed to load goals</div>
          <button className="btn btn-primary" onClick={load}>Retry</button>
        </div>
      ) : goals.length === 0 ? (
        <div className="goals-empty">
          <div className="goals-empty-icon">🎯</div>
          <div className="goals-empty-title">
            {search || status || category ? 'No goals match your filters' : "You haven't created any goals yet"}
          </div>
          <div className="goals-empty-desc">
            {search || status || category
              ? 'Try adjusting your filters to see more results.'
              : 'Define your first goal to start planning your progress and bringing your vision to life.'}
          </div>
          {!search && !status && !category && (
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              + Create Your First Goal
            </button>
          )}
        </div>
      ) : (
        <div className="goals-grid">
          {goals.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={openEdit}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}

      {/* Form Modal */}
      <GoalFormModal
        isOpen={showForm}
        onClose={closeForm}
        onSave={editGoal ? handleEdit : handleCreate}
        initialData={editGoal}
      />
    </div>
  );
}
