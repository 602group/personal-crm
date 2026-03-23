import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { calendarApi } from '../api/calendar';
import EventFormModal  from '../components/calendar/EventFormModal';
import '../styles/calendar.css';

const CAT_LABELS = { business:'💼 Business', meeting:'🤝 Meeting', personal:'🌿 Personal',
  health:'❤️ Health', travel:'✈️ Travel', deadline:'🚨 Deadline', other:'📅 Other' };
const CAT_BG    = { business:'#eef2ff', meeting:'#dbeafe', personal:'#dcfce7',
  health:'#fce7f3', travel:'#ffedd5', deadline:'#fee2e2', other:'#f1f5f9' };
const CAT_COLOR = { business:'#4f46e5', meeting:'#1d4ed8', personal:'#16a34a',
  health:'#be185d', travel:'#c2410c', deadline:'#b91c1c', other:'#64748b' };

function fmtDT(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('en-US',{ weekday:'short', month:'long', day:'numeric', year:'numeric' })
    + (iso.includes('T') && !iso.endsWith('Z') === false ? '' : ' · ' + d.toLocaleTimeString('en-US',{ hour:'numeric', minute:'2-digit' }));
}

function fmtDatetime(iso, isAllDay) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return iso.length > 10 ? iso.slice(0,16).replace('T',' ') : iso;
  if (isAllDay) return d.toLocaleDateString('en-US',{ weekday:'long', month:'long', day:'numeric', year:'numeric' });
  return d.toLocaleDateString('en-US',{ weekday:'short', month:'short', day:'numeric', year:'numeric' })
    + ' at ' + d.toLocaleTimeString('en-US',{ hour:'numeric', minute:'2-digit' });
}

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [showEdit, setShowEdit] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const d = await calendarApi.get(id);
      setData(d);
    } catch(e) {
      setError(e.response?.status === 404 ? '404' : 'Failed to load event.');
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleEdit(formData) { await calendarApi.update(id, formData); setShowEdit(false); load(); }
  async function handleDelete() {
    if (!window.confirm('Delete this event permanently?')) return;
    await calendarApi.remove(id); navigate('/calendar');
  }

  if (loading) return <Skeleton />;
  if (error === '404') return (
    <div className="cal-empty">
      <div className="cal-empty-icon">🔍</div>
      <div className="cal-empty-title">Event not found</div>
      <Link to="/calendar" className="btn btn-primary">Back to Calendar</Link>
    </div>
  );
  if (error) return (
    <div className="error-state">
      <div className="error-state-icon">⚠️</div>
      <div className="error-state-title">{error}</div>
      <button className="btn btn-primary" onClick={load}>Retry</button>
    </div>
  );

  const { event } = data;
  const accent = CAT_COLOR[event.category] || '#64748b';
  const bg     = CAT_BG[event.category]    || '#f1f5f9';

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="breadcrumb" style={{ marginBottom:'var(--space-4)' }}>
        <Link to="/calendar">Calendar</Link>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-current">{event.title}</span>
      </nav>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', gap:'var(--space-4)', marginBottom:'var(--space-6)', flexWrap:'wrap' }}>
        <div style={{ width:6, borderRadius:8, background: accent, flexShrink:0, alignSelf:'stretch', minHeight:56 }} />
        <div style={{ flex:1, minWidth:0 }}>
          <h2 style={{ fontSize:'var(--text-2xl)', fontWeight:'var(--weight-bold)', color:'var(--color-neutral-900)', marginBottom:'var(--space-2)' }}>
            {event.title}
          </h2>
          <div style={{ display:'flex', alignItems:'center', gap:'var(--space-3)', flexWrap:'wrap' }}>
            <span style={{ padding:'3px 10px', borderRadius:99, fontSize:12, fontWeight:600, background: bg, color: accent }}>
              {CAT_LABELS[event.category] || event.category}
            </span>
            {event.is_all_day && (
              <span style={{ padding:'3px 10px', borderRadius:99, fontSize:12, fontWeight:600, background:'#f0fdf4', color:'#16a34a' }}>☀️ All Day</span>
            )}
          </div>
        </div>
        <div style={{ display:'flex', gap:'var(--space-2)', flexShrink:0, flexWrap:'wrap' }}>
          <button className="btn btn-outline btn-sm" onClick={() => setShowEdit(true)}>✏️ Edit</button>
          <button className="btn btn-sm" style={{ color:'var(--color-danger)', border:'1px solid #fca5a5', background:'var(--color-danger-light)' }} onClick={handleDelete}>🗑 Delete</button>
        </div>
      </div>

      {/* 2-col grid */}
      <div className="event-detail-grid">
        {/* Left */}
        <div>
          {/* Time block */}
          <div className="event-detail-card">
            <div className="event-detail-card-header">📅 Date & Time</div>
            <div className="event-detail-card-body">
              <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-3)' }}>
                <div style={{ display:'flex', gap:'var(--space-4)', alignItems:'center', flexWrap:'wrap' }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:11, color:'var(--color-neutral-400)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>Start</div>
                    <div style={{ fontSize:'var(--text-base)', fontWeight:'var(--weight-semibold)', color:'var(--color-neutral-800)' }}>
                      {fmtDatetime(event.start_at, event.is_all_day)}
                    </div>
                  </div>
                  {event.end_at && (
                    <>
                      <div style={{ color:'var(--color-neutral-300)', fontSize:20 }}>→</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:11, color:'var(--color-neutral-400)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>End</div>
                        <div style={{ fontSize:'var(--text-base)', fontWeight:'var(--weight-semibold)', color:'var(--color-neutral-800)' }}>
                          {fmtDatetime(event.end_at, event.is_all_day)}
                        </div>
                      </div>
                    </>
                  )}
                </div>
                {event.location && (
                  <div style={{ display:'flex', alignItems:'center', gap:8, color:'var(--color-neutral-600)', fontSize:'var(--text-sm)' }}>
                    <span>📍</span> {event.location}
                  </div>
                )}
              </div>
            </div>
          </div>

          {event.description && (
            <div className="event-detail-card">
              <div className="event-detail-card-header">📋 Description</div>
              <div className="event-detail-card-body">
                <p style={{ fontSize:'var(--text-sm)', color:'var(--color-neutral-700)', lineHeight:1.7, whiteSpace:'pre-wrap' }}>{event.description}</p>
              </div>
            </div>
          )}

          {/* Linked records */}
          {(event.project_id || event.goal_id || event.task_id) && (
            <div className="event-detail-card">
              <div className="event-detail-card-header">🔗 Linked To</div>
              <div>
                {event.project_id && (
                  <Link to={`/projects/${event.project_id}`}
                    style={{ display:'flex', alignItems:'center', gap:10, padding:'var(--space-4)', textDecoration:'none', color:'inherit', fontSize:'var(--text-sm)', borderBottom:'1px solid var(--color-neutral-50)' }}>
                    <span>📁</span>
                    <div>
                      <div style={{ fontWeight:'var(--weight-medium)' }}>{event.project_title}</div>
                      <div style={{ fontSize:11, color:'var(--color-neutral-400)' }}>Project</div>
                    </div>
                  </Link>
                )}
                {event.goal_id && (
                  <Link to={`/goals/${event.goal_id}`}
                    style={{ display:'flex', alignItems:'center', gap:10, padding:'var(--space-4)', textDecoration:'none', color:'inherit', fontSize:'var(--text-sm)', borderBottom:'1px solid var(--color-neutral-50)' }}>
                    <span>🎯</span>
                    <div>
                      <div style={{ fontWeight:'var(--weight-medium)' }}>{event.goal_title}</div>
                      <div style={{ fontSize:11, color:'var(--color-neutral-400)' }}>Goal</div>
                    </div>
                  </Link>
                )}
                {event.task_id && (
                  <Link to={`/tasks/${event.task_id}`}
                    style={{ display:'flex', alignItems:'center', gap:10, padding:'var(--space-4)', textDecoration:'none', color:'inherit', fontSize:'var(--text-sm)' }}>
                    <span>✅</span>
                    <div>
                      <div style={{ fontWeight:'var(--weight-medium)' }}>{event.task_title}</div>
                      <div style={{ fontSize:11, color:'var(--color-neutral-400)' }}>Task</div>
                    </div>
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div>
          <div className="event-detail-card">
            <div className="event-detail-card-header">ℹ️ Details</div>
            <div className="event-detail-card-body">
              <table style={{ width:'100%', fontSize:'var(--text-sm)', borderCollapse:'collapse' }}>
                <tbody>
                  {[
                    ['Category', <span style={{ padding:'2px 9px', borderRadius:99, fontSize:11, fontWeight:600, background:bg, color:accent }}>{CAT_LABELS[event.category]}</span>],
                    ['Type',     event.is_all_day ? '☀️ All Day' : '⏰ Timed'],
                    event.location && ['Location', `📍 ${event.location}`],
                    ['Created',  new Date(event.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})],
                    ['Updated',  new Date(event.updated_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})],
                  ].filter(Boolean).map(([label, value]) => (
                    <tr key={label} style={{ borderBottom:'1px solid var(--color-neutral-100)' }}>
                      <td style={{ padding:'8px 0', color:'var(--color-neutral-400)', width:'42%', fontSize:'var(--text-xs)' }}>{label}</td>
                      <td style={{ padding:'8px 0', color:'var(--color-neutral-700)', fontWeight:'var(--weight-medium)' }}>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <EventFormModal isOpen={showEdit} onClose={() => setShowEdit(false)} onSave={handleEdit} initialData={event} />
    </div>
  );
}

function Skeleton() {
  return (
    <div>
      <div className="skeleton" style={{ height:14, width:180, marginBottom:24, borderRadius:6 }} />
      <div style={{ display:'flex', gap:16, marginBottom:24 }}>
        <div className="skeleton" style={{ width:6, borderRadius:4, flexShrink:0, height:56 }} />
        <div style={{ flex:1 }}>
          <div className="skeleton skeleton-text wide" style={{ marginBottom:12 }} />
          <div style={{ display:'flex', gap:8 }}>
            {[80,60].map(w => <div key={w} className="skeleton" style={{ height:22, width:w, borderRadius:99 }} />)}
          </div>
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 280px', gap:24 }}>
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {[1,2].map(i => <div key={i} className="skeleton" style={{ height:140, borderRadius:12 }} />)}
        </div>
        <div className="skeleton" style={{ height:200, borderRadius:12 }} />
      </div>
    </div>
  );
}
