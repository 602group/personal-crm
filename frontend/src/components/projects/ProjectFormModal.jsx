import { useState, useEffect } from 'react';

const CATEGORIES = ['business','personal','finance','health','learning','other'];
const STATUSES   = ['planning','active','paused','completed','archived'];
const PRIORITIES = ['low','medium','high'];

const STATUS_LABELS = {
  planning: 'Planning', active: 'Active', paused: 'Paused',
  completed: 'Completed', archived: 'Archived',
};

export default function ProjectFormModal({ isOpen, onClose, onSave, initialData = null }) {
  const isEdit = !!initialData;
  const [form, setForm]     = useState(defaultForm());
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  function defaultForm() {
    return {
      title: '', description: '', category: 'business',
      status: 'planning', priority: 'medium',
      start_date: '', target_date: '', progress: 0,
    };
  }

  useEffect(() => {
    if (isOpen) {
      setForm(initialData ? {
        title:       initialData.title       || '',
        description: initialData.description || '',
        category:    initialData.category    || 'business',
        status:      initialData.status      || 'planning',
        priority:    initialData.priority    || 'medium',
        start_date:  initialData.start_date  || '',
        target_date: initialData.target_date || '',
        progress:    initialData.progress    ?? 0,
      } : defaultForm());
      setError('');
    }
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
    if (!form.title.trim()) { setError('Project title is required.'); return; }
    setSaving(true); setError('');
    try { await onSave(form); onClose(); }
    catch (err) { setError(err.response?.data?.error || 'Failed to save project.'); }
    finally { setSaving(false); }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg" role="dialog" aria-modal="true">
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Edit Project' : 'New Project'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="form-error-banner">{error}</div>}
            <div className="project-form-grid">

              <div className="form-group project-form-full">
                <label className="form-label">Project Name <span className="required">*</span></label>
                <input className="form-input" type="text" placeholder="What is this project?"
                  value={form.title} onChange={e => set('title', e.target.value)} autoFocus maxLength={200} />
              </div>

              <div className="form-group project-form-full">
                <label className="form-label">Description</label>
                <textarea className="form-input" rows={3} placeholder="Describe the project scope and goals..."
                  value={form.description} onChange={e => set('description', e.target.value)}
                  style={{ resize: 'vertical', minHeight: 80 }} />
              </div>

              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-input" value={form.category} onChange={e => set('category', e.target.value)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
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
                  {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input className="form-input" type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Target Date</label>
                <input className="form-input" type="date" value={form.target_date} onChange={e => set('target_date', e.target.value)} />
              </div>

              <div className="form-group project-form-full">
                <label className="form-label">Progress</label>
                <div className="project-progress-slider-wrap">
                  <input type="range" min="0" max="100" step="5"
                    className="project-progress-slider"
                    value={form.progress} onChange={e => set('progress', Number(e.target.value))} />
                  <span className="project-progress-slider-value">{form.progress}%</span>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? 'Save Changes' : 'Create Project')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
