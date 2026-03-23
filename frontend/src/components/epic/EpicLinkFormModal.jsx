import { useState, useEffect } from 'react';

export default function EpicLinkFormModal({ isOpen, onClose, onSave, initialData }) {
  const [form, setForm] = useState({ title: '', url: '', category: '' });

  useEffect(() => {
    if (isOpen) {
      if (initialData) setForm(initialData);
      else setForm({ title: '', url: '', category: '' });
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-header">
          <h2 className="modal-title">{initialData ? 'Edit Quick Link' : 'Add Quick Link'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Title <span className="required">*</span></label>
            <input className="form-input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} autoFocus placeholder="e.g. Render Dashboard" />
          </div>
          <div className="form-group">
            <label className="form-label">URL <span className="required">*</span></label>
            <input className="form-input" type="url" value={form.url} onChange={e => setForm({...form, url: e.target.value})} placeholder="https://..." />
          </div>
          <div className="form-group">
            <label className="form-label">Category</label>
            <input className="form-input" value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="e.g. Hosting, References, etc." />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(form)} disabled={!form.title || !form.url}>Save Link</button>
        </div>
      </div>
    </div>
  );
}
