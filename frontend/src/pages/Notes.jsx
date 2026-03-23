import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { notesApi }  from '../api/notes';
import NoteCard      from '../components/notes/NoteCard';
import NoteFormModal from '../components/notes/NoteFormModal';
import '../styles/notes.css';

const CATEGORIES = [
  { value:'', label:'All Categories' },
  { value:'idea',     label:'💡 Idea' },
  { value:'meeting',  label:'🤝 Meeting' },
  { value:'journal',  label:'📓 Journal' },
  { value:'research', label:'🔬 Research' },
  { value:'business', label:'💼 Business' },
  { value:'personal', label:'🌿 Personal' },
  { value:'strategy', label:'♟️ Strategy' },
  { value:'other',    label:'📄 Other' },
];
const SORT_OPTIONS = [
  { value:'updated_at', label:'Last Updated' },
  { value:'created_at', label:'Date Created' },
  { value:'title',      label:'Title (A–Z)' },
];

export default function Notes() {
  const navigate = useNavigate();
  const [notes,    setNotes]    = useState([]);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [category, setCategory] = useState('');
  const [sort,     setSort]     = useState('updated_at');
  const [search,   setSearch]   = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [editNote, setEditNote] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const data = await notesApi.list({
        category, sort, dir: sort === 'title' ? 'asc' : 'desc',
        status: showArchived ? 'archived' : 'active',
        search,
      });
      setNotes(data.notes); setTotal(data.total);
    } catch { setError('Failed to load notes.'); }
    finally { setLoading(false); }
  }, [category, sort, search, showArchived]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(formData) {
    const { note } = await notesApi.create(formData);
    await load();
    navigate(`/notes/${note.id}`);
  }
  async function handleEdit(formData) {
    await notesApi.update(editNote.id, formData); setEditNote(null); load();
  }
  async function handleArchive(id) { await notesApi.update(id, { status:'archived' }); load(); }

  function openEdit(n) { setEditNote({ ...n, _tags: n.tags ? n.tags.split(',').map(t=>({name:t.trim()})) : [] }); setShowForm(true); }
  function closeForm() { setShowForm(false); setEditNote(null); }

  const skeletons = [1,2,3,4,5,6];

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Notes</h2>
          <p className="page-subtitle">Your ideas, research, and knowledge base</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditNote(null); setShowForm(true); }}>
          + New Note
        </button>
      </div>

      {/* Toolbar */}
      <div className="notes-toolbar">
        <div className="notes-search">
          <span className="notes-search-icon">🔍</span>
          <input type="text" placeholder="Search notes…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="notes-filter-select" value={category} onChange={e => setCategory(e.target.value)}>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <select className="notes-filter-select" value={sort} onChange={e => setSort(e.target.value)}>
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button
          className={`btn btn-sm ${showArchived ? 'btn-secondary' : 'btn-outline'}`}
          onClick={() => setShowArchived(a => !a)}
          style={{ whiteSpace:'nowrap' }}>
          {showArchived ? '📦 Archived' : '📦 Show Archived'}
        </button>
      </div>

      {!loading && total > 0 && (
        <div className="notes-summary">{total} note{total !== 1 ? 's' : ''}{showArchived ? ' (archived)' : ''}</div>
      )}

      {loading ? (
        <div className="notes-grid">
          {skeletons.map(i => <div key={i} className="skeleton" style={{ height:200, borderRadius:16 }} />)}
        </div>
      ) : error ? (
        <div className="error-state">
          <div className="error-state-icon">⚠️</div>
          <div className="error-state-title">Failed to load notes</div>
          <button className="btn btn-primary" onClick={load}>Retry</button>
        </div>
      ) : notes.length === 0 ? (
        <div className="notes-empty">
          <div className="notes-empty-icon">{search || category ? '🔍' : '📝'}</div>
          <div className="notes-empty-title">
            {search || category ? 'No notes match your filters'
              : showArchived ? 'No archived notes'
              : "You haven't created any notes yet"}
          </div>
          <div className="notes-empty-desc">
            {!search && !category && !showArchived &&
              "Capture ideas, research, or important information by creating your first note."}
          </div>
          {!search && !category && !showArchived && (
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Create Your First Note</button>
          )}
        </div>
      ) : (
        <div className="notes-grid">
          {notes.map(n => (
            <NoteCard key={n.id} note={n} onEdit={openEdit} onArchive={handleArchive} />
          ))}
        </div>
      )}

      <NoteFormModal
        isOpen={showForm} onClose={closeForm}
        onSave={editNote ? handleEdit : handleCreate}
        initialData={editNote}
      />
    </div>
  );
}
