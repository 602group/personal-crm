import { useState, useEffect } from 'react';

const CATEGORIES = ['personal','business','financial','health','learning','other'];
const STATUSES   = ['not_started','in_progress','on_hold','completed','archived'];
const PRIORITIES = ['low','medium','high'];

const STATUS_LABELS = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  on_hold:     'On Hold',
  completed:   'Completed',
  archived:    'Archived',
};

export default function GoalFormModal({ isOpen, onClose, onSave, initialData = null }) {
  const isEdit = !!initialData;
  const [form, setForm] = useState(defaultForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function defaultForm() {
    return {
      title: '', description: '', category: 'personal',
      status: 'not_started', priority: 'medium',
      start_date: '', target_date: '', progress: 0,
    };
  }

  useEffect(() => {
    if (isOpen) {
      setForm(initialData ? {
        title:       initialData.title       || '',
        description: initialData.description || '',
        category:    initialData.category    || 'personal',
        status:      initialData.status      || 'not_started',
        priority:    initialData.priority    || 'medium',
        start_date:  initialData.start_date  || '',
        target_date: initialData.target_date || '',
        progress:    initialData.progress    ?? 0,
      } : defaultForm());
      setError('');
    }
  }, [isOpen, initialData]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function set(field, value) { setForm(f => ({ ...f, [field]: value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) { setError('Goal title is required.'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save goal. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg" role="dialog" aria-modal="true" aria-label={isEdit ? 'Edit Goal' : 'New Goal'}>
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Edit Goal' : 'New Goal'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="form-error-banner">{error}</div>}

            <div className="goal-form-grid">
              {/* Title — full width */}
              <div className="form-group goal-form-full">
                <label className="form-label">Goal Title <span className="required">*</span></label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="What do you want to achieve?"
                  value={form.title}
                  onChange={e => set('title', e.target.value)}
                  autoFocus
                  maxLength={200}
                />
              </div>

              {/* Description — full width */}
              <div className="form-group goal-form-full">
                <label className="form-label">Description</label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="Describe this goal in more detail..."
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  style={{ resize: 'vertical', minHeight: 80 }}
                />
              </div>

              {/* Category */}
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-input" value={form.category} onChange={e => set('category', e.target.value)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>

              {/* Status */}
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-input" value={form.status} onChange={e => set('status', e.target.value)}>
                  {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </div>

              {/* Priority */}
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select className="form-input" value={form.priority} onChange={e => set('priority', e.target.value)}>
                  {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              </div>

              {/* Start Date */}
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input className="form-input" type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
              </div>

              {/* Target Date */}
              <div className="form-group">
                <label className="form-label">Target Date</label>
                <input className="form-input" type="date" value={form.target_date} onChange={e => set('target_date', e.target.value)} />
              </div>

              {/* Progress — full width */}
              <div className="form-group goal-form-full">
                <label className="form-label">Progress</label>
                <div className="progress-slider-wrap">
                  <input
                    type="range" min="0" max="100" step="5"
                    className="progress-slider"
                    value={form.progress}
                    onChange={e => set('progress', Number(e.target.value))}
                  />
                  <span className="progress-slider-value">{form.progress}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? 'Save Changes' : 'Create Goal')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
