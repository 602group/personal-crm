import { Link } from 'react-router-dom';

const CAT_COLORS = {
  idea:     '#fdf4ff', research: '#ecfdf5', meeting: '#eff6ff', journal: '#fff7ed',
  business: '#eef2ff', personal: '#f0fdf4', strategy: '#fefce8', other: '#f8fafc',
};
const CAT_ACCENT = {
  idea:     '#d946ef', research: '#059669', meeting: '#3b82f6', journal: '#f97316',
  business: '#6366f1', personal: '#22c55e', strategy: '#ca8a04', other: '#94a3b8',
};
const CAT_ICONS = {
  idea:'💡', meeting:'🤝', journal:'📓', research:'🔬',
  business:'💼', personal:'🌿', strategy:'♟️', other:'📄',
};

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
}

export default function NoteCard({ note, onEdit, onArchive }) {
  const accent = CAT_ACCENT[note.category] || '#94a3b8';
  const preview = (note.content || '').slice(0, 160);

  function stop(e, fn) { e.preventDefault(); e.stopPropagation(); fn(); }

  return (
    <Link to={`/notes/${note.id}`} className="note-card">
      <div className="note-card-accent" style={{ background: accent }} />
      <div className="note-card-body">
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
          <span style={{ fontSize:14 }}>{CAT_ICONS[note.category] || '📄'}</span>
          <span className={`note-cat-badge note-cat-${note.category}`} style={{ fontSize:10 }}>
            {note.category}
          </span>
        </div>
        <div className="note-card-title">{note.title || 'Untitled note'}</div>
        {preview
          ? <div className="note-card-preview">{preview}</div>
          : <div className="note-card-preview" style={{ fontStyle:'italic', color:'var(--color-neutral-300)' }}>No content yet…</div>
        }
      </div>

      <div className="note-card-meta">
        <div className="note-card-date">
          {fmtDate(note.updated_at)}
        </div>
        <div className="note-card-link-chips">
          {note.project_title && <span className="note-chip">📁 {note.project_title}</span>}
          {note.goal_title    && <span className="note-chip">🎯 {note.goal_title}</span>}
          {note.task_title    && <span className="note-chip">✅ {note.task_title}</span>}
          {note.tags && <span className="note-chip">{note.tags.split(',').length} tag{note.tags.split(',').length !== 1 ? 's':''}</span>}
        </div>
      </div>

      {/* Hover actions */}
      <div className="note-card-actions" onClick={e => e.preventDefault()}>
        <button className="note-card-btn" title="Edit" onClick={e => stop(e, () => onEdit(note))}>✏️</button>
        <button className="note-card-btn" title="Archive" onClick={e => stop(e, () => onArchive(note.id))}>📦</button>
      </div>
    </Link>
  );
}
