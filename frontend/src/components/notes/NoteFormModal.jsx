import { useState, useEffect } from 'react';
import { projectsApi } from '../../api/projects';
import { goalsApi }    from '../../api/goals';
import { tasksApi }    from '../../api/tasks';

const CATEGORIES = ['idea','meeting','journal','research','business','personal','strategy','other'];
const CAT_LABELS = { idea:'💡 Idea', meeting:'🤝 Meeting', journal:'📓 Journal', research:'🔬 Research',
  business:'💼 Business', personal:'🌿 Personal', strategy:'♟️ Strategy', other:'📄 Other' };

export default function NoteFormModal({ isOpen, onClose, onSave, initialData = null }) {
  const isEdit = !!initialData;
  const [form,     setForm]     = useState(defaultForm());
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [projects, setProjects] = useState([]);
  const [goals,    setGoals]    = useState([]);
  const [tasks,    setTasks]    = useState([]);
  const [tagInput, setTagInput] = useState('');

  function defaultForm() {
    return { title:'', content:'', category:'other', goal_id:'', project_id:'', task_id:'', tags:[] };
  }

  useEffect(() => {
    if (!isOpen) return;
    projectsApi.list({ sort:'title', dir:'asc' }).then(d => setProjects(d.projects || [])).catch(() => {});
    goalsApi.list(   { sort:'title', dir:'asc' }).then(d => setGoals(d.goals     || [])).catch(() => {});
    tasksApi.list(   { sort:'title', dir:'asc' }).then(d => setTasks(d.tasks     || [])).catch(() => {});
    if (initialData) {
      setForm({
        title:      initialData.title      || '',
        content:    initialData.content    || '',
        category:   initialData.category   || 'other',
        goal_id:    initialData.goal_id    || '',
        project_id: initialData.project_id || '',
        task_id:    initialData.task_id    || '',
        tags:       initialData._tags ? initialData._tags.map(t => t.name) : [],
      });
    } else {
      setForm(defaultForm());
    }
    setError(''); setTagInput('');
  }, [isOpen, initialData]);

  useEffect(() => {
    if (!isOpen) return;
    const h = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  function addTag() {
    const t = tagInput.trim();
    if (!t || form.tags.includes(t)) { setTagInput(''); return; }
    set('tags', [...form.tags, t]); setTagInput('');
  }
  function removeTag(t) { set('tags', form.tags.filter(x => x !== t)); }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try { await onSave(form); onClose(); }
    catch (err) { setError(err.response?.data?.error || 'Failed to save note.'); }
    finally { setSaving(false); }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg" role="dialog" aria-modal="true">
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Edit Note' : 'New Note'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="form-error-banner">{error}</div>}
            <div className="note-form-grid">

              <div className="form-group note-form-full">
                <label className="form-label">Title</label>
                <input className="form-input" type="text" placeholder="Give your note a title…"
                  value={form.title} onChange={e => set('title', e.target.value)} autoFocus maxLength={300} />
              </div>

              <div className="form-group note-form-full">
                <label className="form-label">Content</label>
                <textarea className="note-form-editor" rows={8} placeholder="Write your note here…"
                  value={form.content} onChange={e => set('content', e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-input" value={form.category} onChange={e => set('category', e.target.value)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Tags <span style={{ color:'var(--color-neutral-400)', fontWeight:'normal' }}>(press Enter)</span></label>
                <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                  <input className="form-input" style={{ flex:1 }} type="text"
                    placeholder="Add a tag…" value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} />
                  <button type="button" className="btn btn-outline btn-sm" onClick={addTag}>Add</button>
                </div>
                {form.tags.length > 0 && (
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:8 }}>
                    {form.tags.map(t => (
                      <span key={t} className="note-tag-pill">
                        {t}
                        <button type="button" onClick={() => removeTag(t)}
                          style={{ background:'none', border:'none', cursor:'pointer', color:'var(--color-neutral-400)', fontSize:12, padding:0, lineHeight:1 }}>×</button>
                      </span>
                    ))}
                  </div>
                )}
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
              {saving ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? 'Save Changes' : 'Create Note')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
