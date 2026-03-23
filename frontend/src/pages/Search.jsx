import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';

const TYPE_META = {
  goal:    { icon:'🎯', label:'Goal',    color:'#6366f1', path:id=>`/goals/${id}` },
  project: { icon:'📁', label:'Project', color:'#3b82f6', path:id=>`/projects/${id}` },
  task:    { icon:'✅', label:'Task',    color:'#22c55e', path:id=>`/tasks/${id}` },
  note:    { icon:'📝', label:'Note',    color:'#f59e0b', path:id=>`/notes/${id}` },
  event:   { icon:'📅', label:'Event',   color:'#8b5cf6', path:id=>`/calendar/${id}` },
  income:  { icon:'💰', label:'Income',  color:'#16a34a', path:()=>`/finance` },
  expense: { icon:'💸', label:'Expense', color:'#dc2626', path:()=>`/finance` },
};

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d) ? '' : d.toLocaleDateString('en-US',{ month:'short', day:'numeric', year:'numeric' });
}

export default function Search() {
  const navigate = useNavigate();
  const [query,    setQuery]    = useState('');
  const [results,  setResults]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [searched, setSearched] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // Auto-focus
  useEffect(() => { inputRef.current?.focus(); }, []);

  const fetch_results = useCallback(async (q, tf) => {
    if (!q || q.trim().length < 2) { setResults([]); setSearched(false); return; }
    setLoading(true);
    try {
      const params = { q: q.trim() };
      if (tf) params.types = tf;
      const { data } = await apiClient.get('/search', { params });
      setResults(data.results); setSearched(true);
    } catch { setResults([]); }
    finally { setLoading(false); }
  }, []);

  function handleInput(e) {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetch_results(q, typeFilter), 280);
  }

  useEffect(() => {
    if (query.trim().length >= 2) fetch_results(query, typeFilter);
  }, [typeFilter]);

  const displayed = typeFilter ? results.filter(r => r.type === typeFilter) : results;
  const typeCounts = results.reduce((acc, r) => { acc[r.type] = (acc[r.type]||0)+1; return acc; }, {});

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Search</h2>
          <p className="page-subtitle">Find anything across your platform instantly</p>
        </div>
      </div>

      {/* Search box */}
      <div className="search-box-wrap">
        <span className="search-box-icon">🔍</span>
        <input ref={inputRef} className="search-box-input" type="text"
          placeholder="Search goals, projects, tasks, notes, events, finance…"
          value={query} onChange={handleInput} autoComplete="off"
        />
        {query && (
          <button className="search-box-clear" onClick={() => { setQuery(''); setResults([]); setSearched(false); inputRef.current?.focus(); }}>✕</button>
        )}
      </div>

      {/* Type filter chips */}
      {searched && results.length > 0 && (
        <div className="search-type-chips">
          <button className={`search-chip${!typeFilter?' active':''}`} onClick={() => setTypeFilter('')}>
            All <span className="search-chip-count">{results.length}</span>
          </button>
          {Object.entries(typeCounts).map(([type, count]) => {
            const m = TYPE_META[type];
            if (!m) return null;
            return (
              <button key={type} className={`search-chip${typeFilter===type?' active':''}`}
                onClick={() => setTypeFilter(typeFilter===type?'':type)}>
                {m.icon} {m.label} <span className="search-chip-count">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="search-results-list">
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height:64, borderRadius:12, marginBottom:8 }} />)}
        </div>
      ) : searched && displayed.length === 0 ? (
        <div className="search-empty">
          <div className="search-empty-icon">🔍</div>
          <div className="search-empty-title">No results for "{query}"</div>
          <div className="search-empty-desc">
            {typeFilter ? `Try removing the ${TYPE_META[typeFilter]?.label} filter, or` : 'Try'} searching with different keywords.
          </div>
        </div>
      ) : displayed.length > 0 ? (
        <div className="search-results-list">
          {displayed.map((r, i) => {
            const m = TYPE_META[r.type] || { icon:'📄', label:r.type, color:'#64748b', path:()=>'/' };
            const path = m.path(r.id);
            return (
              <Link key={`${r.type}-${r.id}-${i}`} to={path} className="search-result-item">
                <div className="search-result-icon" style={{ background:`${m.color}18`, color:m.color }}>{m.icon}</div>
                <div className="search-result-body">
                  <div className="search-result-title">{r.title}</div>
                  <div className="search-result-meta">
                    <span className="search-result-type" style={{ background:`${m.color}18`, color:m.color }}>{m.label}</span>
                    {r.status && <span className="search-result-status">{r.status}</span>}
                    {r.meta   && <span className="search-result-status">{r.meta}</span>}
                    {r.subtitle && <span className="search-result-status">{r.subtitle}</span>}
                    {r.updated_at && <span className="search-result-date">{fmtDate(r.updated_at)}</span>}
                  </div>
                </div>
                <div className="search-result-arrow">→</div>
              </Link>
            );
          })}
        </div>
      ) : !query ? (
        <div className="search-empty">
          <div className="search-empty-icon">✨</div>
          <div className="search-empty-title">Search across your entire platform</div>
          <div className="search-empty-desc" style={{ maxWidth:460 }}>
            Find goals, projects, tasks, notes, calendar events, and finance records instantly.
            Start typing to search.
          </div>
          <div className="search-hint-grid">
            {Object.entries(TYPE_META).map(([type, m]) => (
              <div key={type} className="search-hint-chip">
                <span>{m.icon}</span> {m.label}s
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
