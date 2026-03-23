import { useState, useEffect } from 'react';
import { projectsApi } from '../../api/projects';
import { goalsApi }    from '../../api/goals';
import { tasksApi }    from '../../api/tasks';

const CATEGORIES = ['business','meeting','personal','health','travel','deadline','other'];
const CAT_LABELS = { business:'💼 Business', meeting:'🤝 Meeting', personal:'🌿 Personal',
  health:'❤️ Health', travel:'✈️ Travel', deadline:'🚨 Deadline', other:'📅 Other' };

export default function EventFormModal({ isOpen, onClose, onSave, initialData = null, defaultDate = '' }) {
  const isEdit = !!initialData;
  const [form,     setForm]     = useState(defaultForm());
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [projects, setProjects] = useState([]);
  const [goals,    setGoals]    = useState([]);
  const [tasks,    setTasks]    = useState([]);

  function defaultForm() {
    const base = defaultDate || new Date().toISOString().slice(0,10);
    return {
      title: '', description: '', category: 'personal',
      start_at: `${base}T09:00`, end_at: `${base}T10:00`,
      is_all_day: false, location: '',
      goal_id: '', project_id: '', task_id: '',
    };
  }

  useEffect(() => {
    if (!isOpen) return;
    projectsApi.list({ sort:'title', dir:'asc' }).then(d => setProjects(d.projects || [])).catch(() => {});
    goalsApi.list(   { sort:'title', dir:'asc' }).then(d => setGoals(d.goals     || [])).catch(() => {});
    tasksApi.list(   { sort:'title', dir:'asc' }).then(d => setTasks(d.tasks     || [])).catch(() => {});
    if (initialData) {
      setForm({
        title:      initialData.title      || '',
        description: initialData.description || '',
        category:   initialData.category   || 'personal',
        start_at:   (initialData.start_at  || '').slice(0,16),
        end_at:     (initialData.end_at    || '').slice(0,16),
        is_all_day: !!initialData.is_all_day,
        location:   initialData.location   || '',
        goal_id:    initialData.goal_id    || '',
        project_id: initialData.project_id || '',
        task_id:    initialData.task_id    || '',
      });
    } else {
      setForm(defaultForm());
    }
    setError('');
  }, [isOpen, initialData, defaultDate]);

  useEffect(() => {
    if (!isOpen) return;
    const h = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim())  { setError('Event title is required.');      return; }
    if (!form.start_at)      { setError('Start date/time is required.');  return; }
    setSaving(true); setError('');
    try { await onSave({
      ...form,
      start_at:  form.is_all_day ? form.start_at.slice(0,10) : form.start_at,
      end_at:    form.is_all_day ? (form.end_at.slice(0,10) || null) : (form.end_at || null),
      is_all_day: form.is_all_day ? 1 : 0,
    }); onClose(); }
    catch (err) { setError(err.response?.data?.error || 'Failed to save event.'); }
    finally { setSaving(false); }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg" role="dialog" aria-modal="true">
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Edit Event' : 'New Event'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="form-error-banner">{error}</div>}
            <div className="event-form-grid">

              <div className="form-group event-form-full">
                <label className="form-label">Event Title <span className="required">*</span></label>
                <input className="form-input" type="text" placeholder="What's the event?"
                  value={form.title} onChange={e => set('title', e.target.value)} autoFocus maxLength={300} />
              </div>

              <div className="form-group event-form-full">
                <label className="form-label">Description</label>
                <textarea className="form-input" rows={2} placeholder="Additional details…"
                  value={form.description} onChange={e => set('description', e.target.value)}
                  style={{ resize:'vertical', minHeight:56 }} />
              </div>

              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-input" value={form.category} onChange={e => set('category', e.target.value)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Location</label>
                <input className="form-input" type="text" placeholder="Office, Zoom link, etc."
                  value={form.location} onChange={e => set('location', e.target.value)} />
              </div>

              <div className="form-group event-form-full" style={{ display:'flex', alignItems:'center', gap:10 }}>
                <input type="checkbox" id="all-day" checked={form.is_all_day}
                  onChange={e => set('is_all_day', e.target.checked)}
                  style={{ width:16, height:16, cursor:'pointer', accentColor:'var(--color-brand-600)' }} />
                <label htmlFor="all-day" className="form-label" style={{ margin:0, cursor:'pointer' }}>All-day event</label>
              </div>

              <div className="form-group">
                <label className="form-label">Start {form.is_all_day ? 'Date' : 'Date & Time'} <span className="required">*</span></label>
                <input className="form-input" type={form.is_all_day ? 'date' : 'datetime-local'}
                  value={form.is_all_day ? form.start_at.slice(0,10) : form.start_at}
                  onChange={e => set('start_at', e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">End {form.is_all_day ? 'Date' : 'Date & Time'}</label>
                <input className="form-input" type={form.is_all_day ? 'date' : 'datetime-local'}
                  value={form.is_all_day ? form.end_at.slice(0,10) : form.end_at}
                  onChange={e => set('end_at', e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Link to Project</label>
                <select className="form-input" value={form.project_id} onChange={e => set('project_id', e.target.value)}>
                  <option value="">— None —</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Link to Goal</label>
                <select className="form-input" value={form.goal_id} onChange={e => set('goal_id', e.target.value)}>
                  <option value="">— None —</option>
                  {goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Link to Task</label>
                <select className="form-input" value={form.task_id} onChange={e => set('task_id', e.target.value)}>
                  <option value="">— None —</option>
                  {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
              </div>

            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? 'Save Changes' : 'Create Event')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
