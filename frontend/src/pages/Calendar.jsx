import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate }  from 'react-router-dom';
import { calendarApi }   from '../api/calendar';
import EventFormModal    from '../components/calendar/EventFormModal';
import '../styles/calendar.css';

// ── Category helpers ──────────────────────────────────────
const CAT_LABELS = { business:'💼 Business', meeting:'🤝 Meeting', personal:'🌿 Personal',
  health:'❤️ Health', travel:'✈️ Travel', deadline:'🚨 Deadline', other:'📅 Other' };

const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];

function ymd(d) { return d.toISOString().slice(0,10); }
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate()+n); return r; }
function startOfWeek(d) { const r = new Date(d); r.setDate(r.getDate()-r.getDay()); return r; }
function sameDay(a, b) { return ymd(a) === ymd(b); }

function fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return iso.slice(11,16);
  return d.toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' });
}

function buildMonthGrid(year, month) {
  const firstDay = new Date(year, month, 1);
  const start = startOfWeek(firstDay);
  const days = [];
  for (let i = 0; i < 42; i++) {
    const d = addDays(start, i);
    days.push({ date: d, inMonth: d.getMonth() === month });
  }
  return days;
}

function eventsForDay(events, date) {
  const ds = ymd(date);
  return events.filter(e => (e.start_at || '').slice(0,10) === ds);
}

// ── Range helper — returns stable YMD strings ──
function getRangeStrings(view, current) {
  if (view === 'month') {
    const y = current.getFullYear(), m = current.getMonth();
    const s = startOfWeek(new Date(y, m, 1));
    return { startStr: ymd(s), endStr: ymd(addDays(s, 41)) };
  }
  if (view === 'week') {
    const sw = startOfWeek(current);
    return { startStr: ymd(sw), endStr: ymd(addDays(sw, 6)) };
  }
  return { startStr: ymd(current), endStr: ymd(current) };
}

export default function Calendar() {
  const navigate = useNavigate();
  const today = useMemo(() => new Date(), []);          // stable reference
  const [view,     setView]     = useState('month');
  const [current,  setCurrent]  = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [events,   setEvents]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [catFilter, setCatFilter] = useState('');
  const [showForm,  setShowForm]  = useState(false);
  const [editEvent, setEditEvent] = useState(null);
  const [defaultDate, setDefaultDate] = useState('');

  // ✅ FIX: compute STABLE string deps — no new Date objects each render
  const { startStr, endStr } = useMemo(
    () => getRangeStrings(view, current),
    [view, current]
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const params = { start: startStr, end: endStr };
      if (catFilter) params.category = catFilter;
      const data = await calendarApi.list(params);
      setEvents(data.events);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [startStr, endStr, catFilter]);  // ✅ stable string deps only

  useEffect(() => { load(); }, [load]);

  async function handleCreate(formData) {
    const { event } = await calendarApi.create(formData);
    await load();
    navigate(`/calendar/${event.id}`);
  }
  async function handleEdit(formData) {
    await calendarApi.update(editEvent.id, formData); setEditEvent(null); load();
  }
  async function handleDelete(id) {
    await calendarApi.remove(id); load();
  }

  function openNew(dateStr) { setDefaultDate(dateStr || ''); setEditEvent(null); setShowForm(true); }
  function openEdit(ev) { setEditEvent(ev); setDefaultDate(''); setShowForm(true); }
  function closeForm() { setShowForm(false); setEditEvent(null); }

  function navigate_(dir) {
    setCurrent(c => {
      if (view === 'month') return new Date(c.getFullYear(), c.getMonth() + dir, 1);
      if (view === 'week')  return addDays(c, dir * 7);
      return addDays(c, dir);
    });
  }

  const headingText = view === 'month'
    ? `${MONTHS[current.getMonth()]} ${current.getFullYear()}`
    : view === 'week'
    ? (() => { const sw = startOfWeek(current); const ew = addDays(sw, 6); return `${sw.toLocaleDateString('en-US',{month:'short',day:'numeric'})} – ${ew.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}`; })()
    : current.toLocaleDateString('en-US',{ weekday:'long', month:'long', day:'numeric', year:'numeric' });

  return (
    <div className="cal-shell">
      {/* Page header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Calendar</h2>
          <p className="page-subtitle">Schedule events and manage your time</p>
        </div>
        <button className="btn btn-primary" onClick={() => openNew()}>+ New Event</button>
      </div>

      {/* Toolbar */}
      <div className="cal-toolbar">
        <div className="cal-nav-group">
          <button className="cal-nav-btn" onClick={() => navigate_(-1)}>‹</button>
          <button className="cal-today-btn" onClick={() => setCurrent(new Date())}>Today</button>
          <button className="cal-nav-btn" onClick={() => navigate_(1)}>›</button>
        </div>

        <div className="cal-heading">{headingText}</div>

        <select className="cal-filter-select" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="">All Categories</option>
          {Object.entries(CAT_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
        </select>

        <div className="cal-view-tabs">
          {['month','week','day'].map(v => (
            <button key={v} className={`cal-view-tab${view===v?' active':''}`}
              onClick={() => { setView(v); if (v!=='month') setCurrent(new Date()); }}>
              {v.charAt(0).toUpperCase()+v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Render active view */}
      {loading ? (
        <div className="skeleton" style={{ height:480, borderRadius:16 }} />
      ) : view === 'month' ? (
        <MonthView current={current} today={today} events={events}
          onDayClick={openNew} onEventClick={ev => navigate(`/calendar/${ev.id}`)}
          onEditEvent={openEdit} />
      ) : view === 'week' ? (
        <WeekView current={current} today={today} events={events}
          onSlotClick={openNew} onEventClick={ev => navigate(`/calendar/${ev.id}`)} />
      ) : (
        <DayView current={current} today={today} events={events}
          onSlotClick={openNew} onEventClick={ev => navigate(`/calendar/${ev.id}`)} />
      )}

      <EventFormModal isOpen={showForm} onClose={closeForm}
        onSave={editEvent ? handleEdit : handleCreate}
        initialData={editEvent} defaultDate={defaultDate} />
    </div>
  );
}

// ─────────────────────────────── Month View ───────────────────────────────
function MonthView({ current, today, events, onDayClick, onEventClick, onEditEvent }) {
  const days = buildMonthGrid(current.getFullYear(), current.getMonth());
  return (
    <div className="cal-month">
      <div className="cal-month-header">
        {DOW.map(d => <div key={d} className="cal-month-dow">{d}</div>)}
      </div>
      <div className="cal-month-grid">
        {days.map((cell, i) => {
          const cellEvs = eventsForDay(events, cell.date);
          const visible = cellEvs.slice(0,3);
          const overflow = cellEvs.length - 3;
          const isToday = sameDay(cell.date, today);
          return (
            <div key={i} className={`cal-day${!cell.inMonth?' other-month':''}${isToday?' today':''}`}>
              <div className="cal-day-num">{cell.date.getDate()}</div>
              <button className="cal-day-add-btn" title="Add event"
                onClick={() => onDayClick(ymd(cell.date))} aria-label="Add event">+</button>
              {visible.map(ev => (
                <button key={ev.id} className={`cal-event-pill ev-cat-${ev.category}`}
                  title={ev.title} onClick={() => onEventClick(ev)}>
                  {ev.is_all_day ? '' : fmtTime(ev.start_at)+' '}{ev.title}
                </button>
              ))}
              {overflow > 0 && (
                <button className="cal-more-link" onClick={() => {}}>+{overflow} more</button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────── Week View ────────────────────────────────
const HOURS = Array.from({length:24}, (_,i) => i);

function WeekView({ current, today, events, onSlotClick, onEventClick }) {
  const weekStart = startOfWeek(current);
  const days = Array.from({length:7}, (_,i) => addDays(weekStart, i));

  return (
    <div className="cal-week" style={{ maxHeight:600, overflowY:'auto' }}>
      {/* Header row */}
      <div className="cal-week-corner" />
      {days.map((d, i) => {
        const isToday = sameDay(d, today);
        return (
          <div key={i} className={`cal-week-day-head${isToday?' today-col':''}`}>
            <div className="cal-week-dow">{DOW[d.getDay()]}</div>
            <span className={isToday ? 'cal-week-date-num today-num' : 'cal-week-date-num'}>{d.getDate()}</span>
          </div>
        );
      })}

      {/* Time gutter */}
      <div className="cal-week-time-gutter">
        {HOURS.map(h => (
          <div key={h} className="cal-week-hour-label">{h===0?'':h%12||12}{h<12?'am':'pm'}</div>
        ))}
      </div>

      {/* Day columns */}
      {days.map((d, di) => {
        const dayEvs = eventsForDay(events, d).filter(e => !e.is_all_day);
        const isToday = sameDay(d, today);
        return (
          <div key={di} className={`cal-week-col${isToday?' today-col':''}`}>
            {HOURS.map(h => (
              <div key={h} className="cal-week-hour-slot"
                onClick={() => onSlotClick(`${ymd(d)}T${String(h).padStart(2,'0')}:00`)} />
            ))}
            {dayEvs.map(ev => {
              const top = eventTopPct(ev.start_at);
              const ht  = eventHeightPct(ev.start_at, ev.end_at);
              return (
                <div key={ev.id} className={`cal-week-event ev-cat-${ev.category}`}
                  style={{ top:`${top}px`, height:`${ht}px`, minHeight:20 }}
                  onClick={() => onEventClick(ev)} title={ev.title}>
                  {fmtTime(ev.start_at)} {ev.title}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────── Day View ────────────────────────────────
function DayView({ current, today, events, onSlotClick, onEventClick }) {
  const dayEvs = eventsForDay(events, current);
  const isToday = sameDay(current, today);
  return (
    <div className="cal-day-view" style={{ maxHeight:600, overflowY:'auto' }}>
      <div className="cal-day-view-header">
        <div className="cal-week-corner" />
        <div className={`cal-day-view-title${isToday?' today-col':''}`}>
          {current.toLocaleDateString('en-US',{weekday:'long', month:'long', day:'numeric'})}
        </div>
      </div>
      <div className="cal-week-time-gutter">
        {HOURS.map(h => (
          <div key={h} className="cal-week-hour-label">{h===0?'':h%12||12}{h<12?'am':'pm'}</div>
        ))}
      </div>
      <div style={{ position:'relative' }}>
        {HOURS.map(h => (
          <div key={h} className="cal-day-hour-slot"
            onClick={() => onSlotClick(`${ymd(current)}T${String(h).padStart(2,'0')}:00`)} />
        ))}
        {dayEvs.filter(e => !e.is_all_day).map(ev => {
          const top = eventTopPct(ev.start_at);
          const ht  = eventHeightPct(ev.start_at, ev.end_at);
          return (
            <div key={ev.id} className={`cal-day-event ev-cat-${ev.category}`}
              style={{ top:`${top}px`, height:`${ht}px`, minHeight:24 }}
              onClick={() => onEventClick(ev)} title={ev.title}>
              <div style={{ fontWeight:'var(--weight-semibold)' }}>{ev.title}</div>
              <div style={{ fontSize:10 }}>{fmtTime(ev.start_at)} – {fmtTime(ev.end_at)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Position helpers (each hour = 56px) ──
function eventTopPct(iso) {
  if (!iso) return 0;
  const d = new Date(iso);
  if (isNaN(d)) return 0;
  return (d.getHours() + d.getMinutes() / 60) * 56;
}
function eventHeightPct(startIso, endIso) {
  if (!startIso || !endIso) return 56;
  const s = new Date(startIso), e = new Date(endIso);
  if (isNaN(s) || isNaN(e)) return 56;
  const diff = (e - s) / 3600000; // hours
  return Math.max(diff * 56, 20);
}
