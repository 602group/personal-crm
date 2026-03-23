import { useState, useEffect, useCallback } from 'react';
import { emailApi }       from '../api/email';
import AddAccountModal    from '../components/email/AddAccountModal';
import '../styles/email.css';

function timeShort(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString('en-US',{ hour:'numeric', minute:'2-digit' });
  const diff = (now - d) / 86400000;
  if (diff < 7) return d.toLocaleDateString('en-US',{ weekday:'short' });
  return d.toLocaleDateString('en-US',{ month:'short', day:'numeric' });
}
function fmtFull(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return d.toLocaleString('en-US',{ weekday:'long', month:'long', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit' });
}
function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
}

export default function Email() {
  const [accounts,    setAccounts]    = useState([]);
  const [messages,    setMessages]    = useState([]);
  const [selected,    setSelected]    = useState(null); // message object
  const [activeAcct,  setActiveAcct]  = useState(null); // account id filter
  const [folder,      setFolder]      = useState('INBOX');
  const [search,      setSearch]      = useState('');
  const [unreadOnly,  setUnreadOnly]  = useState(false);
  const [starredOnly, setStarredOnly] = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [msgLoading,  setMsgLoading]  = useState(false);
  const [showAdd,     setShowAdd]     = useState(false);
  const [syncing,     setSyncing]     = useState(null);
  const [total,       setTotal]       = useState(0);

  const loadAccounts = useCallback(async () => {
    try { const d = await emailApi.listAccounts(); setAccounts(d.accounts || []); }
    catch { setAccounts([]); }
  }, []);

  const loadMessages = useCallback(async () => {
    setMsgLoading(true);
    try {
      const params = { folder, limit:100 };
      if (activeAcct)  params.account_id = activeAcct;
      if (search)      params.search     = search;
      if (unreadOnly)  params.is_read    = 0;
      if (starredOnly) params.is_starred = 1;
      const d = await emailApi.listMessages(params);
      setMessages(d.messages || []); setTotal(d.total || 0);
    } catch { setMessages([]); }
    finally { setMsgLoading(false); }
  }, [activeAcct, folder, search, unreadOnly, starredOnly]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadAccounts(), loadMessages()]).finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (!loading) loadMessages(); }, [activeAcct, folder, search, unreadOnly, starredOnly]);

  async function handleSync(acctId) {
    setSyncing(acctId);
    try { await emailApi.syncAccount(acctId); }
    catch { /* error shown on account status */ }
    // Poll for completion
    let tries = 0;
    const poll = setInterval(async () => {
      tries++;
      await loadAccounts();
      const acct = (await emailApi.listAccounts()).accounts.find(a => a.id === acctId);
      if (!acct || acct.status !== 'syncing' || tries > 30) {
        clearInterval(poll); setSyncing(null); loadMessages();
      }
    }, 2000);
  }

  async function handleSelect(msg) {
    setSelected(msg);
    if (!msg.is_read) {
      await emailApi.markRead(msg.id).catch(()=>{});
      setMessages(p => p.map(m => m.id===msg.id ? {...m, is_read:1} : m));
      setAccounts(p => p.map(a => a.id===msg.account_id ? {...a, unread_count:Math.max(0,(a.unread_count||1)-1)} : a));
    }
  }

  async function toggleStar(msg, e) {
    e.stopPropagation();
    const res = await emailApi.toggleStar(msg.id).catch(()=>null);
    if (res) {
      setMessages(p => p.map(m => m.id===msg.id ? {...m, is_starred: res.is_starred?1:0} : m));
      if (selected?.id === msg.id) setSelected(p => ({...p, is_starred: res.is_starred?1:0}));
    }
  }

  async function deleteMsg(msg) {
    if (!window.confirm('Remove this message from the dashboard?')) return;
    await emailApi.deleteMessage(msg.id).catch(()=>{});
    setMessages(p => p.filter(m => m.id!==msg.id));
    if (selected?.id === msg.id) setSelected(null);
  }

  const totalUnread = accounts.reduce((s,a) => s+(a.unread_count||0), 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Email{totalUnread>0 && <span className="notif-badge" style={{ marginLeft:10, verticalAlign:'middle' }}>{totalUnread}</span>}</h2>
          <p className="page-subtitle">All your inboxes in one place</p>
        </div>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height:480, borderRadius:16 }} />
      ) : accounts.length === 0 ? (
        /* ── No accounts yet ── */
        <div className="email-empty" style={{ background:'var(--color-neutral-0)', border:'1px solid var(--color-neutral-150)', borderRadius:'var(--radius-xl)', padding:'80px 40px' }}>
          <div className="email-empty-icon">📬</div>
          <div className="email-empty-title" style={{ fontSize:'var(--text-lg)' }}>Connect your first email account</div>
          <div className="email-empty-desc">
            Link Gmail, Outlook, Yahoo, iCloud, or any IMAP inbox and see all your email in one unified view.
          </div>
          <button className="btn btn-primary" style={{ marginTop:12 }} onClick={() => setShowAdd(true)}>
            + Connect Email Account
          </button>
        </div>
      ) : (
        <div className="email-shell">
          {/* ── Sidebar ── */}
          <div className="email-sidebar">
            <div className="email-sidebar-top">
              <button className="email-compose-btn" onClick={() => setShowAdd(true)}>+ Add Account</button>
            </div>

            <div className="email-sidebar-section">
              <div className="email-sidebar-label">Folders</div>
              {[
                { id:'INBOX',   label:'Inbox',   icon:'📥' },
                { id:'starred', label:'Starred', icon:'⭐', special:'starred' },
                { id:'unread',  label:'Unread',  icon:'🔵', special:'unread' },
              ].map(f => (
                <button key={f.id} className={`email-folder-btn${
                  f.special==='starred' ? (starredOnly?' active':'')
                    : f.special==='unread' ? (unreadOnly?' active':'')
                    : folder===f.id && !starredOnly && !unreadOnly ? ' active' : ''
                }`}
                  onClick={() => {
                    if (f.special==='starred') { setStarredOnly(true); setUnreadOnly(false); }
                    else if (f.special==='unread') { setUnreadOnly(true); setStarredOnly(false); }
                    else { setFolder(f.id); setStarredOnly(false); setUnreadOnly(false); }
                  }}>
                  {f.icon} {f.label}
                  {f.special==='unread' && totalUnread>0 && <span className="email-folder-count">{totalUnread}</span>}
                </button>
              ))}
            </div>

            <div className="email-sidebar-section" style={{ flex:1, overflowY:'auto' }}>
              <div className="email-sidebar-label">Accounts</div>
              <button className={`email-acct-item${!activeAcct?' active':''}`} onClick={() => setActiveAcct(null)}>
                <div className="email-acct-dot" style={{ background:'var(--color-neutral-400)' }} />
                <span className="email-acct-name">All Inboxes</span>
                {totalUnread>0 && <span className="email-acct-unread">{totalUnread}</span>}
              </button>
              {accounts.map(a => (
                <div key={a.id} style={{ position:'relative' }}>
                  <button className={`email-acct-item${activeAcct===a.id?' active':''}`} onClick={() => setActiveAcct(a.id)}>
                    <div className="email-acct-dot" style={{ background: a.color }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div className="email-acct-name">{a.name}</div>
                      <div style={{ fontSize:10, color:'var(--color-neutral-400)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.email}</div>
                    </div>
                    {(a.unread_count||0)>0 && <span className="email-acct-unread">{a.unread_count}</span>}
                  </button>
                  {a.status==='error' && <div className="email-status-error" style={{ paddingLeft:28, paddingBottom:4 }}>⚠ {(a.error_message||'').slice(0,40)}…</div>}
                  {a.status==='syncing' && <div className="email-status-syncing" style={{ paddingLeft:28, paddingBottom:4 }}>⟳ Syncing…</div>}
                </div>
              ))}
            </div>
            <div className="email-sidebar-bottom">
              {accounts.map(a => (
                <button key={a.id} className="email-add-acct-btn" disabled={syncing===a.id}
                  onClick={() => handleSync(a.id)} title={`Re-sync ${a.name}`}>
                  {syncing===a.id ? '⟳ Syncing…' : `⟳ ${a.name}`}
                </button>
              ))}
            </div>
          </div>

          {/* ── Message list ── */}
          <div className="email-list-pane">
            <div className="email-list-toolbar">
              <div className="email-search-wrap">
                <span className="email-search-icon">🔍</span>
                <input className="email-search-input" placeholder="Search messages…"
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            <div className="email-list-scroll">
              {msgLoading ? (
                <div style={{ padding:'var(--space-4)', display:'flex', flexDirection:'column', gap:8 }}>
                  {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height:68, borderRadius:8 }} />)}
                </div>
              ) : messages.length === 0 ? (
                <div className="email-empty">
                  <div className="email-empty-icon">📭</div>
                  <div className="email-empty-title">{search ? 'No messages match your search' : 'No messages in this folder'}</div>
                  <div className="email-empty-desc">
                    {!search && 'Try syncing your account to fetch new messages.'}
                  </div>
                </div>
              ) : messages.map(msg => (
                <div key={msg.id}
                  className={`email-msg-row${selected?.id===msg.id?' active':''}${!msg.is_read?' unread':''}`}
                  onClick={() => handleSelect(msg)}>
                  <div className="email-msg-from-row">
                    <div className="email-msg-from">{msg.from_name || msg.from_address}</div>
                    <div className="email-msg-date">{timeShort(msg.date)}</div>
                  </div>
                  <div className="email-msg-subject">{msg.subject}</div>
                  <div className="email-msg-preview">{msg.body_preview}</div>
                  <div className="email-msg-meta">
                    {!msg.is_read && <div className="email-unread-dot" />}
                    <span className="email-msg-acct-tag" style={{ background:`${msg.account_color}18`, color: msg.account_color }}>{msg.account_name}</span>
                  </div>
                  <span className="email-star" onClick={e => toggleStar(msg, e)} title="Star">
                    {msg.is_starred ? '⭐' : '☆'}
                  </span>
                </div>
              ))}
            </div>
            {messages.length > 0 && <div className="email-list-count">{messages.length} message{messages.length!==1?'s':''}</div>}
          </div>

          {/* ── Detail pane ── */}
          <div className="email-detail-pane">
            {!selected ? (
              <div className="email-no-select">
                <div className="email-no-select-icon">✉️</div>
                <div className="email-no-select-title">Select a message to read it</div>
              </div>
            ) : (
              <div className="email-detail-scroll">
                <div className="email-detail-actions">
                  <button className="btn btn-outline btn-sm" onClick={() => toggleStar(selected, {stopPropagation:()=>{}})}>
                    {selected.is_starred ? '⭐ Unstar' : '☆ Star'}
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={async () => {
                    await (selected.is_read ? emailApi.markUnread(selected.id) : emailApi.markRead(selected.id)).catch(()=>{});
                    setMessages(p => p.map(m => m.id===selected.id ? {...m, is_read: selected.is_read?0:1} : m));
                    setSelected(p => ({...p, is_read: p.is_read?0:1}));
                  }}>
                    {selected.is_read ? '🔵 Mark Unread' : '✅ Mark Read'}
                  </button>
                  <button className="btn btn-outline btn-sm" style={{ color:'var(--color-danger)', borderColor:'currentColor', marginLeft:'auto' }}
                    onClick={() => deleteMsg(selected)}>
                    🗑 Remove
                  </button>
                </div>
                <div className="email-detail-subject">{selected.subject}</div>
                <div className="email-detail-meta">
                  <div className="email-detail-avatar">{initials(selected.from_name)}</div>
                  <div style={{ flex:1 }}>
                    <div className="email-detail-from-name">{selected.from_name || selected.from_address}</div>
                    <div className="email-detail-from-addr">{selected.from_address}</div>
                    <div style={{ fontSize:11, color:'var(--color-neutral-400)', marginTop:2 }}>
                      To: {(() => { try { return JSON.parse(selected.to_addresses||(selected.to_addresses)||'[]').join(', '); } catch { return selected.to_addresses||''; } })()}
                    </div>
                  </div>
                  <div className="email-detail-date">{fmtFull(selected.date)}</div>
                </div>
                <div className="email-detail-body">{selected.body_text || selected.body_preview || '(no content)'}</div>
              </div>
            )}
          </div>
        </div>
      )}

      <AddAccountModal isOpen={showAdd} onClose={() => setShowAdd(false)}
        onAdded={acct => { setAccounts(p => [...p, acct]); setShowAdd(false); }} />
    </div>
  );
}
