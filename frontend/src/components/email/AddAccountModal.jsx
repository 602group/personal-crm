import { useState, useEffect } from 'react';
import { emailApi } from '../../api/email';

const PROVIDERS = [
  { id:'gmail',   label:'Gmail',   icon:'📧', hint:'Use an App Password (Google Account → Security → App Passwords)' },
  { id:'outlook', label:'Outlook', icon:'📮', hint:'Use your Outlook password or App Password if 2FA is enabled' },
  { id:'yahoo',   label:'Yahoo',   icon:'💌', hint:'Generate an App Password in Yahoo Account Security settings' },
  { id:'icloud',  label:'iCloud',  icon:'☁️', hint:'Use an App-Specific Password from appleid.apple.com' },
  { id:'aol',     label:'AOL',     icon:'📬', hint:'Enable IMAP in AOL settings and use your account password' },
  { id:'imap',    label:'Custom',  icon:'🔧', hint:'Enter your IMAP server details manually' },
];

const DEFAULTS = {
  gmail:   { imap_host:'imap.gmail.com',        imap_port:993 },
  outlook: { imap_host:'outlook.office365.com', imap_port:993 },
  yahoo:   { imap_host:'imap.mail.yahoo.com',   imap_port:993 },
  icloud:  { imap_host:'imap.mail.me.com',      imap_port:993 },
  aol:     { imap_host:'imap.aol.com',          imap_port:993 },
  hotmail: { imap_host:'outlook.office365.com', imap_port:993 },
  imap:    { imap_host:'', imap_port:993 },
};

export default function AddAccountModal({ isOpen, onClose, onAdded }) {
  const [step,     setStep]     = useState(1); // 1=provider, 2=credentials
  const [provider, setProvider] = useState('gmail');
  const [testing,  setTesting]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [tested,   setTested]   = useState(false);
  const [error,    setError]    = useState('');
  const [testMsg,  setTestMsg]  = useState('');
  const [form, setForm] = useState({
    name:'', email:'', username:'', password:'', imap_host:'', imap_port:993, imap_secure:1, color:'#6366f1',
  });

  useEffect(() => {
    if (!isOpen) { setStep(1); setTested(false); setError(''); setTestMsg(''); }
  }, [isOpen]);

  useEffect(() => {
    const d = DEFAULTS[provider] || DEFAULTS.imap;
    setForm(p => ({ ...p, imap_host: d.imap_host, imap_port: d.imap_port }));
    setTested(false); setError(''); setTestMsg('');
  }, [provider]);

  useEffect(() => {
    if (!isOpen) return;
    const h = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));
  const prov = PROVIDERS.find(p => p.id === provider) || PROVIDERS[0];

  async function handleTest() {
    if (!form.username || !form.password) { setError('Username/email and password are required to test.'); return; }
    setTesting(true); setError(''); setTestMsg('');
    try {
      const res = await emailApi.testAccount({
        provider, imap_host: form.imap_host, imap_port: form.imap_port,
        imap_secure: form.imap_secure, username: form.username, password: form.password,
      });
      setTestMsg(res.message || 'Connection successful!'); setTested(true);
    } catch (err) { setError(err.response?.data?.error || 'Connection failed.'); setTested(false); }
    finally { setTesting(false); }
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Account name is required.'); return; }
    if (!form.email.trim()) { setError('Email address is required.'); return; }
    if (!form.username.trim() || !form.password) { setError('Username and password are required.'); return; }
    setSaving(true); setError('');
    try {
      const res = await emailApi.addAccount({ ...form, provider });
      onAdded(res.account); onClose();
    } catch (err) { setError(err.response?.data?.error || 'Failed to add account.'); }
    finally { setSaving(false); }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg" role="dialog" aria-modal="true">
        <div className="modal-header">
          <h2 className="modal-title">Connect Email Account</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {error   && <div className="form-error-banner" style={{ marginBottom:12 }}>{error}</div>}
          {testMsg && <div className="settings-success" style={{ marginBottom:12 }}>✅ {testMsg}</div>}

          {/* Provider picker */}
          <div style={{ marginBottom:'var(--space-4)' }}>
            <label className="form-label">Provider</label>
            <div className="email-provider-grid">
              {PROVIDERS.map(p => (
                <button key={p.id} type="button"
                  className={`email-provider-btn${provider===p.id?' selected':''}`}
                  onClick={() => setProvider(p.id)}>
                  <span className="provider-icon">{p.icon}</span>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {prov.hint && (
            <div className="email-tip">
              💡 <strong>{prov.label}:</strong> {prov.hint}
            </div>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--space-3)' }}>
            <div className="form-group">
              <label className="form-label">Account Name <span className="required">*</span></label>
              <input className="form-input" placeholder="e.g. Work Gmail" value={form.name} onChange={e=>set('name',e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address <span className="required">*</span></label>
              <input className="form-input" type="email" placeholder="you@gmail.com" value={form.email} onChange={e=>set('email',e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Username / Email</label>
              <input className="form-input" placeholder="Usually your full email" value={form.username} onChange={e=>set('username',e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Password / App Password <span className="required">*</span></label>
              <input className="form-input" type="password" placeholder="●●●●●●●●●●●●" value={form.password} onChange={e=>set('password',e.target.value)} />
            </div>
            {provider === 'imap' && (
              <>
                <div className="form-group">
                  <label className="form-label">IMAP Host</label>
                  <input className="form-input" placeholder="imap.yourdomain.com" value={form.imap_host} onChange={e=>set('imap_host',e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Port</label>
                  <input className="form-input" type="number" value={form.imap_port} onChange={e=>set('imap_port',Number(e.target.value))} />
                </div>
              </>
            )}
            <div className="form-group">
              <label className="form-label">Accent Color</label>
              <input type="color" value={form.color} onChange={e=>set('color',e.target.value)}
                style={{ height:38, padding:2, borderRadius:8, border:'1px solid var(--color-neutral-200)', cursor:'pointer', width:'100%' }} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-outline" onClick={handleTest} disabled={testing} style={{ color:'var(--color-brand-600)' }}>
            {testing ? 'Testing…' : '🔌 Test Connection'}
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Connecting…' : '+ Connect Account'}
          </button>
        </div>
      </div>
    </div>
  );
}
