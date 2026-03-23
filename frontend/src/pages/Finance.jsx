import { useState, useEffect, useCallback } from 'react';
import { financeApi }         from '../api/finance';
import TransactionFormModal   from '../components/finance/TransactionFormModal';
import '../styles/finance.css';

const fmt$ = n => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

const INC_CAT_LABELS = { salary:'💼 Salary', business:'🏢 Business', investment:'📈 Investment', refund:'🔄 Refund', other:'💰 Other' };
const EXP_CAT_LABELS = { housing:'🏠 Housing', food:'🍔 Food', transportation:'🚗 Transport', business:'💼 Business',
  software:'💻 Software', subscriptions:'📱 Subscriptions', travel:'✈️ Travel', health:'❤️ Health', other:'🧾 Other' };

function monthLabel(ym) {
  const [y, m] = ym.split('-');
  return new Date(Number(y), Number(m)-1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

export default function Finance() {
  const today   = new Date();
  const [month, setMonth] = useState(today.toISOString().slice(0, 7));

  const [summary, setSummary]   = useState(null);
  const [tab,     setTab]       = useState('income'); // income | expenses
  const [records, setRecords]   = useState([]);
  const [tabTotal, setTabTotal] = useState(0);
  const [loading, setLoading]   = useState(true);
  const [loadingTab, setLoadingTab] = useState(false);

  // Filters
  const [catFilter, setCatFilter] = useState('');
  const [sortField, setSortField] = useState('date');
  const [search,    setSearch]    = useState('');

  // Modal
  const [showForm,  setShowForm]  = useState(false);
  const [formType,  setFormType]  = useState('income');
  const [editRec,   setEditRec]   = useState(null);

  // ── Load summary ──
  const loadSummary = useCallback(async () => {
    try { const d = await financeApi.summary({ month }); setSummary(d); }
    catch { /* silent */ }
  }, [month]);

  // ── Load tab records ──
  const loadRecords = useCallback(async () => {
    setLoadingTab(true);
    try {
      const [y, m] = month.split('-');
      const start  = `${y}-${m}-01`;
      const end    = new Date(Number(y), Number(m), 0).toISOString().slice(0,10);
      const params = { start, end, sort: sortField, dir: 'desc' };
      if (catFilter) params.category = catFilter;
      if (search)    params.search   = search;
      const d = tab === 'income' ? await financeApi.listIncome(params) : await financeApi.listExpenses(params);
      setRecords(d.records); setTabTotal(d.total);
    } catch { setRecords([]); }
    finally { setLoadingTab(false); }
  }, [tab, month, catFilter, sortField, search]);

  useEffect(() => { setLoading(true); Promise.all([loadSummary(), loadRecords()]).finally(() => setLoading(false)); }, [month]);
  useEffect(() => { if (!loading) loadRecords(); }, [tab, catFilter, sortField, search]);

  function navMonth(dir) {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    setMonth(d.toISOString().slice(0,7));
    setCatFilter(''); setSearch('');
  }

  function openNew(type) { setFormType(type); setEditRec(null); setShowForm(true); }
  function openEdit(rec, type) { setFormType(type); setEditRec(rec); setShowForm(true); }
  function closeForm() { setShowForm(false); setEditRec(null); }

  async function handleSave(formData) {
    if (formType === 'income') {
      editRec ? await financeApi.updateIncome(editRec.id, formData) : await financeApi.createIncome(formData);
    } else {
      editRec ? await financeApi.updateExpense(editRec.id, formData) : await financeApi.createExpense(formData);
    }
    closeForm();
    await Promise.all([loadSummary(), loadRecords()]);
  }

  async function handleDelete(id, type) {
    if (!window.confirm('Delete this record?')) return;
    type === 'income' ? await financeApi.deleteIncome(id) : await financeApi.deleteExpense(id);
    await Promise.all([loadSummary(), loadRecords()]);
  }

  const catLabels = tab === 'income' ? INC_CAT_LABELS : EXP_CAT_LABELS;
  const catOptions = Object.entries(catLabels);

  // Bar chart max
  const maxBar = summary?.history ? Math.max(...summary.history.flatMap(h => [h.income, h.expense]), 1) : 1;

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Finance</h2>
          <p className="page-subtitle">Track income, expenses, and monthly cash flow</p>
        </div>
        <div style={{ display:'flex', gap:'var(--space-3)' }}>
          <button className="btn btn-outline btn-sm" style={{ color:'#16a34a', borderColor:'#86efac' }}
            onClick={() => openNew('income')}>+ Income</button>
          <button className="btn btn-outline btn-sm" style={{ color:'#dc2626', borderColor:'#fca5a5' }}
            onClick={() => openNew('expense')}>+ Expense</button>
        </div>
      </div>

      {/* Month nav */}
      <div className="fin-month-nav" style={{ marginBottom:'var(--space-5)' }}>
        <button onClick={() => navMonth(-1)}>‹</button>
        <div className="fin-month-label">
          {new Date(month + '-01').toLocaleDateString('en-US',{ month:'long', year:'numeric' })}
        </div>
        <button onClick={() => navMonth(1)}>›</button>
      </div>

      {loading ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:24 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height:100, borderRadius:16 }} />)}
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="fin-summary-grid">
            <div className="fin-stat-card income">
              <div className="fin-stat-icon">💰</div>
              <div className="fin-stat-label">Total Income</div>
              <div className="fin-stat-value positive">{fmt$(summary?.totalIncome)}</div>
              <div className="fin-stat-sub">{summary?.history?.slice(-1)[0] ? `vs ${fmt$(summary.history.slice(-2,-1)[0]?.income)} last month` : 'This month'}</div>
            </div>
            <div className="fin-stat-card expense">
              <div className="fin-stat-icon">💸</div>
              <div className="fin-stat-label">Total Expenses</div>
              <div className="fin-stat-value negative">{fmt$(summary?.totalExpense)}</div>
              <div className="fin-stat-sub">This month</div>
            </div>
            <div className="fin-stat-card net">
              <div className="fin-stat-icon">{(summary?.net || 0) >= 0 ? '📈' : '📉'}</div>
              <div className="fin-stat-label">Net Cash Flow</div>
              <div className={`fin-stat-value ${(summary?.net||0) >= 0 ? 'positive' : 'negative'}`}>{fmt$(summary?.net)}</div>
              <div className="fin-stat-sub">Income minus expenses</div>
            </div>
          </div>

          {/* 6-month spark chart */}
          {summary?.history?.length > 0 && (
            <div className="fin-sparkbar-wrap">
              <div className="fin-sparkbar-title">6-Month Overview</div>
              <div className="fin-sparkbar-grid">
                {summary.history.map(h => (
                  <div key={h.month} className="fin-sparkbar-col">
                    <div className="fin-sparkbar-bars">
                      <div className="fin-bar income-bar"  style={{ height: Math.max((h.income  / maxBar) * 68, 3) + 'px' }} title={`Income: ${fmt$(h.income)}`} />
                      <div className="fin-bar expense-bar" style={{ height: Math.max((h.expense / maxBar) * 68, 3) + 'px' }} title={`Expenses: ${fmt$(h.expense)}`} />
                    </div>
                    <div className="fin-sparkbar-mo">{monthLabel(h.month)}</div>
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', gap:16, marginTop:8, fontSize:11, color:'var(--color-neutral-400)' }}>
                <span style={{ display:'flex', alignItems:'center', gap:5 }}><span style={{ width:10, height:10, borderRadius:2, background:'#4ade80', display:'inline-block' }} />Income</span>
                <span style={{ display:'flex', alignItems:'center', gap:5 }}><span style={{ width:10, height:10, borderRadius:2, background:'#fb7185', display:'inline-block' }} />Expenses</span>
              </div>
            </div>
          )}

          {/* Expense category breakdown */}
          {tab === 'expenses' && summary?.expByCategory?.length > 0 && (
            <div className="fin-sparkbar-wrap" style={{ marginBottom:'var(--space-4)' }}>
              <div className="fin-sparkbar-title">Spending by Category</div>
              <div className="fin-cat-breakdown">
                {summary.expByCategory.map(c => (
                  <div key={c.category} className="fin-cat-bar-wrap">
                    <div className="fin-cat-bar-label">{EXP_CAT_LABELS[c.category] || c.category}</div>
                    <div className="fin-cat-bar-track">
                      <div className="fin-cat-bar-fill" style={{ width: `${(c.total / summary.totalExpense) * 100}%` }} />
                    </div>
                    <div className="fin-cat-bar-amt">{fmt$(c.total)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Tabs */}
      <div className="fin-tabs">
        <button className={`fin-tab${tab==='income'?' active':''}`} onClick={() => { setTab('income'); setCatFilter(''); }}>
          💰 Income
          {summary && <span className="fin-tab-amount income">{fmt$(summary.totalIncome)}</span>}
        </button>
        <button className={`fin-tab${tab==='expenses'?' active':''}`} onClick={() => { setTab('expenses'); setCatFilter(''); }}>
          💸 Expenses
          {summary && <span className="fin-tab-amount expense">{fmt$(summary.totalExpense)}</span>}
        </button>
      </div>

      {/* Toolbar */}
      <div className="fin-toolbar">
        <div className="fin-search">
          <span className="fin-search-icon">🔍</span>
          <input type="text" placeholder={`Search ${tab}…`} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="fin-filter-select" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="">All Categories</option>
          {catOptions.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select className="fin-filter-select" value={sortField} onChange={e => setSortField(e.target.value)}>
          <option value="date">Sort: Date</option>
          <option value="amount">Sort: Amount</option>
          <option value="title">Sort: Title</option>
        </select>
        <button className="btn btn-primary btn-sm" onClick={() => openNew(tab === 'income' ? 'income' : 'expense')}
          style={{ marginLeft:'auto', background: tab==='income'?'#16a34a':'#dc2626', borderColor: tab==='income'?'#16a34a':'#dc2626' }}>
          + {tab === 'income' ? 'Add Income' : 'Add Expense'}
        </button>
      </div>

      {/* Table */}
      <div className="fin-table-card">
        {loadingTab ? (
          <div style={{ padding:'var(--space-6)' }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height:44, borderRadius:8, marginBottom:8 }} />)}
          </div>
        ) : records.length === 0 ? (
          <div className="fin-empty">
            <div className="fin-empty-icon">{tab === 'income' ? '💰' : '💸'}</div>
            <div className="fin-empty-title">
              {search || catFilter ? `No ${tab} match your filters`
                : `No ${tab} recorded for ${new Date(month+'-01').toLocaleDateString('en-US',{month:'long',year:'numeric'})}`}
            </div>
            {!search && !catFilter && (
              <button className="btn btn-primary btn-sm" style={{ marginTop:8, background: tab==='income'?'#16a34a':'#dc2626', borderColor: tab==='income'?'#16a34a':'#dc2626' }}
                onClick={() => openNew(tab === 'income' ? 'income' : 'expense')}>
                + {tab === 'income' ? 'Add Your First Income' : 'Add Your First Expense'}
              </button>
            )}
          </div>
        ) : (
          <>
            <table className="fin-table">
              <thead>
                <tr>
                  <th className="fin-th">Title</th>
                  <th className="fin-th">Category</th>
                  <th className="fin-th">Date</th>
                  {tab === 'expenses' && <th className="fin-th">Project</th>}
                  <th className="fin-th right">Amount</th>
                  <th className="fin-th right" style={{ width:80 }}></th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id} className="fin-tr">
                    <td className="fin-td">
                      <div style={{ fontWeight:'var(--weight-medium)', color:'var(--color-neutral-800)' }}>{r.title}</div>
                      {r.description && <div style={{ fontSize:11, color:'var(--color-neutral-400)', marginTop:1 }}>{r.description}</div>}
                    </td>
                    <td className="fin-td">
                      <span className="fin-cat-badge">{catLabels[r.category] || r.category}</span>
                    </td>
                    <td className="fin-td" style={{ color:'var(--color-neutral-500)' }}>{fmtDate(r.date)}</td>
                    {tab === 'expenses' && <td className="fin-td" style={{ fontSize:12, color:'var(--color-neutral-400)' }}>{r.project_title || '—'}</td>}
                    <td className={`fin-td right fin-amount-${tab === 'income' ? 'income' : 'expense'}`}>
                      {tab === 'income' ? '+' : '-'}{fmt$(r.amount)}
                    </td>
                    <td className="fin-td right">
                      <div className="fin-row-actions">
                        <button className="fin-icon-btn" title="Edit" onClick={() => openEdit(r, tab === 'income' ? 'income' : 'expense')}>✏️</button>
                        <button className="fin-icon-btn" title="Delete" onClick={() => handleDelete(r.id, tab === 'income' ? 'income' : 'expense')}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="fin-total-row">
              <span>{records.length} record{records.length !== 1 ? 's' : ''}</span>
              <span>Total: <strong className={tab==='income'?'fin-amount-income':'fin-amount-expense'}>{fmt$(tabTotal)}</strong></span>
            </div>
          </>
        )}
      </div>

      <TransactionFormModal isOpen={showForm} onClose={closeForm} onSave={handleSave}
        type={formType} initialData={editRec} />
    </div>
  );
}
