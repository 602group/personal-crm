import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { notesApi } from '../api/notes';
import NoteFormModal from '../components/notes/NoteFormModal';
import '../styles/notes.css';

const CAT_LABELS = { idea:'💡 Idea', meeting:'🤝 Meeting', journal:'📓 Journal',
  research:'🔬 Research', business:'💼 Business', personal:'🌿 Personal', strategy:'♟️ Strategy', other:'📄 Other' };
const CAT_ACCENT = {
  idea:'#d946ef', research:'#059669', meeting:'#3b82f6', journal:'#f97316',
  business:'#6366f1', personal:'#22c55e', strategy:'#ca8a04', other:'#94a3b8',
};

function fmt(d) { return d ? new Date(d).toLocaleDateString('en-US',{ month:'long', day:'numeric', year:'numeric' }) : '—'; }
function fmtShort(d) { return d ? new Date(d).toLocaleDateString('en-US',{ month:'short', day:'numeric', year:'2-digit' }) : ''; }

export default function NoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [showEdit, setShowEdit] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const d = await notesApi.get(id);
      setData(d);
    } catch(e) {
      setError(e.response?.status === 404 ? '404' : 'Failed to load note.');
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleEdit(formData) { await notesApi.update(id, formData); setShowEdit(false); load(); }
  async function handleArchive() { await notesApi.update(id, { status:'archived' }); navigate('/notes'); }
  async function handleRestore() { await notesApi.update(id, { status:'active' }); load(); }
  async function handleDelete() {
    if (!window.confirm('Delete this note permanently?')) return;
    await notesApi.remove(id); navigate('/notes');
  }

  if (loading) return <Skeleton />;
  if (error === '404') return (
    <div className="notes-empty">
      <div className="notes-empty-icon">🔍</div>
      <div className="notes-empty-title">Note not found</div>
      <Link to="/notes" className="btn btn-primary">Back to Notes</Link>
    </div>
  );
  if (error) return (
    <div className="error-state">
      <div className="error-state-icon">⚠️</div>
      <div className="error-state-title">{error}</div>
      <button className="btn btn-primary" onClick={load}>Retry</button>
    </div>
  );

  const { note, tags } = data;
  const accent = CAT_ACCENT[note.category] || '#94a3b8';
  const isArchived = note.status === 'archived';

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="breadcrumb" style={{ marginBottom:'var(--space-4)' }}>
        <Link to="/notes">Notes</Link>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-current">{note.title || 'Untitled note'}</span>
      </nav>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', gap:'var(--space-4)', marginBottom:'var(--space-6)', flexWrap:'wrap' }}>
        <div style={{ width:6, height:56, borderRadius:8, background: accent, flexShrink:0 }} />
        <div style={{ flex:1, minWidth:0 }}>
          <h2 style={{ fontSize:'var(--text-2xl)', fontWeight:'var(--weight-bold)', color:'var(--color-neutral-900)', marginBottom:'var(--space-2)' }}>
            {note.title || <em style={{ color:'var(--color-neutral-400)', fontWeight:'normal' }}>Untitled note</em>}
          </h2>
          <div style={{ display:'flex', alignItems:'center', gap:'var(--space-3)', flexWrap:'wrap' }}>
            <span className={`note-cat-badge note-cat-${note.category}`}>{CAT_LABELS[note.category] || note.category}</span>
            {isArchived && <span style={{ fontSize:11, background:'#f1f5f9', color:'#64748b', padding:'2px 8px', borderRadius:99, fontWeight:500 }}>📦 Archived</span>}
            {tags.map(t => (
              <span key={t.id} className="note-tag-pill" style={{ borderColor: t.color + '44', color: t.color, background: t.color + '11' }}>
                {t.name}
              </span>
            ))}
          </div>
        </div>
        <div style={{ display:'flex', gap:'var(--space-2)', flexShrink:0, flexWrap:'wrap' }}>
          <button className="btn btn-outline btn-sm" onClick={() => setShowEdit(true)}>✏️ Edit</button>
          {isArchived
            ? <button className="btn btn-sm btn-outline" onClick={handleRestore}>↩ Restore</button>
            : <button className="btn btn-outline btn-sm" onClick={handleArchive}>📦 Archive</button>
          }
          <button className="btn btn-sm" style={{ color:'var(--color-danger)', border:'1px solid #fca5a5', background:'var(--color-danger-light)' }} onClick={handleDelete}>🗑 Delete</button>
        </div>
      </div>

      {/* 2-col grid */}
      <div className="note-detail-grid">
        {/* Left — content */}
        <div>
          <div className="note-content-card">
            <div className="note-content-card-header">
              <span style={{ fontWeight:'var(--weight-semibold)', fontSize:'var(--text-sm)', color:'var(--color-neutral-600)' }}>📋 Content</span>
              <button className="btn btn-outline btn-sm" onClick={() => setShowEdit(true)}>Edit</button>
            </div>
            <div className="note-content-card-body">
              {note.content
                ? <pre className="note-content-text">{note.content}</pre>
                : <p className="note-content-empty">This note has no content yet. Click Edit to add some.</p>
              }
            </div>
          </div>
        </div>

        {/* Right — sidebar */}
        <div>
          {/* Details */}
          <div className="note-content-card">
            <div className="note-content-card-header">
              <span style={{ fontWeight:'var(--weight-semibold)', fontSize:'var(--text-sm)', color:'var(--color-neutral-600)' }}>ℹ️ Details</span>
            </div>
            <div className="note-content-card-body">
              <table style={{ width:'100%', fontSize:'var(--text-sm)', borderCollapse:'collapse' }}>
                <tbody>
                  {[
                    ['Category', <span className={`note-cat-badge note-cat-${note.category}`}>{CAT_LABELS[note.category]}</span>],
                    ['Status',   isArchived ? '📦 Archived' : '✅ Active'],
                    ['Created',  fmt(note.created_at)],
                    ['Updated',  fmt(note.updated_at)],
                    note.archived_at && ['Archived', fmt(note.archived_at)],
                  ].filter(Boolean).map(([label, value]) => (
                    <tr key={label} style={{ borderBottom:'1px solid var(--color-neutral-100)' }}>
                      <td style={{ padding:'8px 0', color:'var(--color-neutral-400)', width:'42%', verticalAlign:'middle', fontSize:'var(--text-xs)' }}>{label}</td>
                      <td style={{ padding:'8px 0', color:'var(--color-neutral-700)', fontWeight:'var(--weight-medium)', verticalAlign:'middle' }}>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Linked records */}
          {(note.project_id || note.goal_id || note.task_id) && (
            <div className="note-content-card">
              <div className="note-content-card-header">
                <span style={{ fontWeight:'var(--weight-semibold)', fontSize:'var(--text-sm)', color:'var(--color-neutral-600)' }}>🔗 Linked To</span>
              </div>
              <div style={{ padding:'var(--space-2) 0' }}>
                {note.project_id && (
                  <Link to={`/projects/${note.project_id}`}
                    style={{ display:'flex', alignItems:'center', gap:8, padding:'var(--space-3) var(--space-4)', textDecoration:'none', color:'inherit', fontSize:'var(--text-sm)', borderBottom:'1px solid var(--color-neutral-50)' }}>
                    <span>📁</span>
                    <div>
                      <div style={{ fontWeight:'var(--weight-medium)' }}>{note.project_title}</div>
                      <div style={{ fontSize:11, color:'var(--color-neutral-400)' }}>Project</div>
                    </div>
                  </Link>
                )}
                {note.goal_id && (
                  <Link to={`/goals/${note.goal_id}`}
                    style={{ display:'flex', alignItems:'center', gap:8, padding:'var(--space-3) var(--space-4)', textDecoration:'none', color:'inherit', fontSize:'var(--text-sm)', borderBottom:'1px solid var(--color-neutral-50)' }}>
                    <span>🎯</span>
                    <div>
                      <div style={{ fontWeight:'var(--weight-medium)' }}>{note.goal_title}</div>
                      <div style={{ fontSize:11, color:'var(--color-neutral-400)' }}>Goal</div>
                    </div>
                  </Link>
                )}
                {note.task_id && (
                  <Link to={`/tasks/${note.task_id}`}
                    style={{ display:'flex', alignItems:'center', gap:8, padding:'var(--space-3) var(--space-4)', textDecoration:'none', color:'inherit', fontSize:'var(--text-sm)' }}>
                    <span>✅</span>
                    <div>
                      <div style={{ fontWeight:'var(--weight-medium)' }}>{note.task_title}</div>
                      <div style={{ fontSize:11, color:'var(--color-neutral-400)' }}>Task</div>
                    </div>
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="note-content-card">
              <div className="note-content-card-header">
                <span style={{ fontWeight:'var(--weight-semibold)', fontSize:'var(--text-sm)', color:'var(--color-neutral-600)' }}>🏷 Tags</span>
              </div>
              <div style={{ padding:'var(--space-4)', display:'flex', flexWrap:'wrap', gap:6 }}>
                {tags.map(t => (
                  <span key={t.id} className="note-tag-pill" style={{ borderColor: t.color + '44', color: t.color, background: t.color + '11' }}>
                    {t.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <NoteFormModal
        isOpen={showEdit} onClose={() => setShowEdit(false)} onSave={handleEdit}
        initialData={{ ...note, _tags: tags }}
      />
    </div>
  );
}

function Skeleton() {
  return (
    <div>
      <div className="skeleton" style={{ height:14, width:180, marginBottom:'var(--space-6)', borderRadius:6 }} />
      <div style={{ display:'flex', gap:'var(--space-4)', marginBottom:'var(--space-6)' }}>
        <div className="skeleton" style={{ width:6, height:56, borderRadius:4, flexShrink:0 }} />
        <div style={{ flex:1 }}>
          <div className="skeleton skeleton-text wide" style={{ marginBottom:12 }} />
          <div style={{ display:'flex', gap:8 }}>
            {[80,60,70].map(w => <div key={w} className="skeleton" style={{ height:20, width:w, borderRadius:99 }} />)}
          </div>
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 280px', gap:24 }}>
        <div className="skeleton" style={{ height:320, borderRadius:16 }} />
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {[1,2].map(i => <div key={i} className="skeleton" style={{ height:160, borderRadius:16 }} />)}
        </div>
      </div>
    </div>
  );
}
