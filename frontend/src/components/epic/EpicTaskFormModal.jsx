import { useState, useEffect } from 'react';
import { projectsApi } from '../../api/projects';

const STATUSES   = ['todo','in_progress','review','done'];
const PRIORITIES = ['low','medium','high','urgent'];
const STATUS_LABELS   = { todo:'To Do', in_progress:'In Progress', review:'Review', done:'Done' };
const PRIORITY_LABELS = { low:'Low', medium:'Medium', high:'High', urgent:'Urgent' };

export default function EpicTaskFormModal({ isOpen, onClose, onSave, initialData = null }) {
  const isEdit = !!initialData;
  const [form,     setForm]     = useState(defaultForm());
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [projects, setProjects] = useState([]);

  function defaultForm() {
    return { title:'', description:'', status:'todo', priority:'medium',
             due_date:'', project_id:'' };
  }

  useEffect(() => {
    if (!isOpen) return;
    projectsApi.list({ sort:'title', dir:'asc' }).then(d => setProjects(d.projects || [])).catch(() => {});
    setForm(initialData ? {
      title:       initialData.title       || '',
      description: initialData.description || '',
      status:      initialData.status      || 'todo',
      priority:    initialData.priority    || 'medium',
      due_date:    initialData.due_date    || '',
      project_id:  initialData.project_id  || '',
    } : defaultForm());
    setError('');
  }, [isOpen, initialData]);

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
    if (!form.title.trim()) { setError('Task title is required.'); return; }
    setSaving(true); setError('');
    try { await onSave(form); onClose(); }
    catch (err) { setError(err.response?.data?.error || 'Failed to save task.'); }
    finally { setSaving(false); }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg" role="dialog" aria-modal="true">
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Edit Epic Task' : 'New Epic Task'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="form-error-banner">{error}</div>}
            <div className="task-form-grid">

              <div className="form-group task-form-full">
                <label className="form-label">Task Title <span className="required">*</span></label>
                <input className="form-input" type="text" placeholder="What needs to be done?"
                  value={form.title} onChange={e => set('title', e.target.value)} autoFocus maxLength={300} />
              </div>

              <div className="form-group task-form-full">
                <label className="form-label">Description</label>
                <textarea className="form-input" rows={3} placeholder="Additional details or context..."
                  value={form.description} onChange={e => set('description', e.target.value)}
                  style={{ resize:'vertical', minHeight:72 }} />
              </div>

              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-input" value={form.status} onChange={e => set('status', e.target.value)}>
                  {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Priority</label>
                <select className="form-input" value={form.priority} onChange={e => set('priority', e.target.value)}>
                  {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Due Date</label>
                <input className="form-input" type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Linked Project</label>
                <select className="form-input" value={form.project_id} onChange={e => set('project_id', e.target.value)}>
                  <option value="">— None —</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>

            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? 'Save Changes' : 'Create Task')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
