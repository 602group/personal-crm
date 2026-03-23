import { useState, useEffect } from 'react';
import { projectsApi } from '../../api/projects';

const INCOME_CATS  = ['salary','business','investment','refund','other'];
const EXPENSE_CATS = ['housing','food','transportation','business','software','subscriptions','travel','health','other'];

const INC_LABELS = { salary:'💼 Salary', business:'🏢 Business', investment:'📈 Investment', refund:'🔄 Refund', other:'💰 Other' };
const EXP_LABELS = { housing:'🏠 Housing', food:'🍔 Food', transportation:'🚗 Transport', business:'💼 Business',
  software:'💻 Software', subscriptions:'📱 Subscriptions', travel:'✈️ Travel', health:'❤️ Health', other:'🧾 Other' };

export default function TransactionFormModal({ isOpen, onClose, onSave, type = 'income', initialData = null }) {
  const isEdit = !!initialData;
  const cats = type === 'income' ? INCOME_CATS : EXPENSE_CATS;
  const labels = type === 'income' ? INC_LABELS : EXP_LABELS;

  const [form,     setForm]     = useState(defaultForm());
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [projects, setProjects] = useState([]);

  function defaultForm() {
    return { title:'', description:'', amount:'', category: type === 'income' ? 'other' : 'other',
      date: new Date().toISOString().slice(0,10), project_id:'', receipt_url:'' };
  }

  useEffect(() => {
    if (!isOpen) return;
    projectsApi.list({ sort:'title', dir:'asc' }).then(d => setProjects(d.projects || [])).catch(() => {});
    if (initialData) {
      setForm({
        title:       initialData.title       || '',
        description: initialData.description || '',
        amount:      initialData.amount      != null ? String(initialData.amount) : '',
        category:    initialData.category    || 'other',
        date:        initialData.date        || new Date().toISOString().slice(0,10),
        project_id:  initialData.project_id  || '',
        receipt_url: initialData.receipt_url || '',
      });
    } else { setForm(defaultForm()); }
    setError('');
  }, [isOpen, initialData, type]);

  useEffect(() => {
    if (!isOpen) return;
    const h = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required.'); return; }
    if (!form.amount || isNaN(form.amount) || Number(form.amount) < 0) { setError('Valid amount required.'); return; }
    if (!form.date) { setError('Date is required.'); return; }
    setSaving(true); setError('');
    try { await onSave({ ...form, amount: Number(form.amount) }); onClose(); }
    catch (err) { setError(err.response?.data?.error || 'Failed to save.'); }
    finally { setSaving(false); }
  }

  const accent = type === 'income' ? '#16a34a' : '#dc2626';
  const typeLabel = type === 'income' ? 'Income' : 'Expense';

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg" role="dialog" aria-modal="true">
        <div className="modal-header" style={{ borderTop:`3px solid ${accent}` }}>
          <h2 className="modal-title">{isEdit ? `Edit ${typeLabel}` : `New ${typeLabel}`}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="form-error-banner">{error}</div>}
            <div className="fin-form-grid">

              <div className="form-group fin-form-full">
                <label className="form-label">Title <span className="required">*</span></label>
                <input className="form-input" type="text" placeholder={type==='income' ? 'Income source or description…' : 'What was this expense?'}
                  value={form.title} onChange={e => set('title', e.target.value)} autoFocus maxLength={300} />
              </div>

              <div className="form-group">
                <label className="form-label">Amount ($) <span className="required">*</span></label>
                <input className="form-input" type="number" step="0.01" min="0" placeholder="0.00"
                  value={form.amount} onChange={e => set('amount', e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Date <span className="required">*</span></label>
                <input className="form-input" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-input" value={form.category} onChange={e => set('category', e.target.value)}>
                  {cats.map(c => <option key={c} value={c}>{labels[c]}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Link to Project</label>
                <select className="form-input" value={form.project_id} onChange={e => set('project_id', e.target.value)}>
                  <option value="">— None —</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>

              <div className="form-group fin-form-full">
                <label className="form-label">Notes</label>
                <textarea className="form-input" rows={2} placeholder="Any additional details…" style={{ resize:'vertical', minHeight:52 }}
                  value={form.description} onChange={e => set('description', e.target.value)} />
              </div>

              {type === 'expense' && (
                <div className="form-group fin-form-full">
                  <label className="form-label">Receipt URL <span style={{ color:'var(--color-neutral-400)', fontWeight:'normal' }}>(optional)</span></label>
                  <input className="form-input" type="url" placeholder="https://…"
                    value={form.receipt_url} onChange={e => set('receipt_url', e.target.value)} />
                </div>
              )}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}
              style={{ background: accent, borderColor: accent }}>
              {saving ? (isEdit ? 'Saving…' : 'Adding…') : (isEdit ? 'Save Changes' : `Add ${typeLabel}`)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
