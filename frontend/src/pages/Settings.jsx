import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { profileApi } from '../api/profile';
import apiClient from '../api/client';

const TABS = [
  { id: 'profile',  label: 'Profile' },
  { id: 'security', label: 'Security' },
];

export default function Settings() {
  const { user, updateUser, logout } = useAuth();
  const [tab, setTab] = useState('profile');

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Settings</h2>
        <p className="page-subtitle">Manage your profile and account preferences</p>
      </div>

      {/* Tab bar */}
      <div className="settings-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`settings-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="settings-body">
        {tab === 'profile'  && <ProfileTab user={user} updateUser={updateUser} />}
        {tab === 'security' && <SecurityTab user={user} logout={logout} />}
      </div>
    </div>
  );
}

/* ── Profile Tab ── */
function ProfileTab({ user, updateUser }) {
  const [form, setForm] = useState({
    name: user?.name || '',
    avatar_url: user?.avatar_url || '',
    bio: user?.bio || '',
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError]   = useState('');

  const initials = (form.name || user?.name || 'A')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  async function handleSave(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required.'); return; }
    setSaving(true); setError(''); setSuccess('');
    try {
      const res = await profileApi.update({
        name: form.name.trim(),
        avatar_url: form.avatar_url.trim() || null,
        bio: form.bio.trim() || null,
      });
      updateUser(res.data);
      setSuccess('Profile saved successfully.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save profile.');
    } finally { setSaving(false); }
  }

  return (
    <form className="card settings-section" onSubmit={handleSave}>
      <div className="card-header">
        <div>
          <div className="card-title">Profile Information</div>
          <div className="card-subtitle">Update your name, avatar, and bio</div>
        </div>
      </div>
      <div className="card-body settings-form">
        {/* Avatar preview */}
        <div className="avatar-preview-row">
          <div className="avatar avatar-lg settings-avatar">
            {form.avatar_url
              ? <img src={form.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initials}
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label" htmlFor="avatar_url">Avatar URL</label>
            <input
              id="avatar_url"
              className="form-input"
              placeholder="https://example.com/photo.jpg"
              value={form.avatar_url}
              onChange={e => setForm(p => ({ ...p, avatar_url: e.target.value }))}
            />
            <span className="form-hint">Paste a public image URL, or leave blank to use initials</span>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="name">Display Name</label>
          <input
            id="name"
            className={`form-input ${error && !form.name.trim() ? 'error' : ''}`}
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="form-input" value={user?.email || ''} disabled
            style={{ background: 'var(--color-neutral-50)', cursor: 'not-allowed' }} />
          <span className="form-hint">Email changes require contacting an owner.</span>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="bio">Bio</label>
          <textarea
            id="bio"
            className="form-input"
            rows={3}
            placeholder="A short bio about yourself..."
            value={form.bio}
            onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
            style={{ resize: 'vertical' }}
          />
        </div>

        <div className="settings-read-only">
          <span className="form-label">Role</span>
          <RoleBadge role={user?.role} />
        </div>
        <div className="settings-read-only">
          <span className="form-label">Member since</span>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-neutral-600)' }}>
            {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}
          </span>
        </div>
        <div className="settings-read-only">
          <span className="form-label">Last login</span>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-neutral-600)' }}>
            {user?.last_login_at ? new Date(user.last_login_at).toLocaleString() : 'N/A'}
          </span>
        </div>

        {success && <div className="settings-success">{success}</div>}
        {error   && <div className="settings-error">{error}</div>}
      </div>
      <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save Profile'}
        </button>
      </div>
    </form>
  );
}

/* ── Security Tab ── */
function SecurityTab({ user, logout }) {
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError]   = useState('');

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState(user?.email || '');
  const [resetResult, setResetResult] = useState(null);
  const [forgotLoading, setForgotLoading] = useState(false);

  async function handleChangePassword(e) {
    e.preventDefault();
    if (!pwForm.current_password || !pwForm.new_password || !pwForm.confirm) {
      setError('All fields are required.'); return;
    }
    if (pwForm.new_password !== pwForm.confirm) {
      setError('New passwords do not match.'); return;
    }
    if (pwForm.new_password.length < 8) {
      setError('New password must be at least 8 characters.'); return;
    }
    setSaving(true); setError(''); setSuccess('');
    try {
      await profileApi.changePassword({
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
      });
      setSuccess('Password changed. You will be logged out.');
      setTimeout(logout, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change password.');
    } finally { setSaving(false); }
  }

  async function handleForgotPassword(e) {
    e.preventDefault();
    setForgotLoading(true); setResetResult(null);
    try {
      const res = await apiClient.post('/auth/forgot-password', { email: forgotEmail });
      setResetResult(res.data);
    } catch (err) {
      setResetResult({ error: err.response?.data?.error || 'Request failed.' });
    } finally { setForgotLoading(false); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Change password */}
      <form className="card settings-section" onSubmit={handleChangePassword}>
        <div className="card-header">
          <div>
            <div className="card-title">Change Password</div>
            <div className="card-subtitle">All active sessions will be invalidated on change</div>
          </div>
        </div>
        <div className="card-body settings-form">
          <div className="form-group">
            <label className="form-label" htmlFor="current_password">Current Password</label>
            <input id="current_password" type="password" className="form-input"
              value={pwForm.current_password}
              onChange={e => setPwForm(p => ({ ...p, current_password: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="new_password">New Password</label>
            <input id="new_password" type="password" className="form-input"
              value={pwForm.new_password}
              onChange={e => setPwForm(p => ({ ...p, new_password: e.target.value }))} />
            <span className="form-hint">Minimum 8 characters</span>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="confirm">Confirm New Password</label>
            <input id="confirm" type="password" className="form-input"
              value={pwForm.confirm}
              onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} />
          </div>
          {success && <div className="settings-success">{success}</div>}
          {error   && <div className="settings-error">{error}</div>}
        </div>
        <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Updating…' : 'Update Password'}
          </button>
        </div>
      </form>

      {/* Password reset token generator */}
      <div className="card settings-section">
        <div className="card-header">
          <div>
            <div className="card-title">Password Reset</div>
            <div className="card-subtitle">Generate a reset token for any account email</div>
          </div>
        </div>
        <form className="card-body settings-form" onSubmit={handleForgotPassword}>
          <div className="form-group">
            <label className="form-label" htmlFor="reset_email">Email Address</label>
            <input id="reset_email" type="email" className="form-input"
              value={forgotEmail}
              onChange={e => setForgotEmail(e.target.value)} />
          </div>
          {resetResult && !resetResult.error && (
            <div className="settings-success" style={{ fontFamily: 'var(--font-mono)', wordBreak: 'break-all', fontSize: 'var(--text-xs)' }}>
              <strong>Reset Token:</strong> {resetResult.resetToken}<br />
              <span style={{ opacity: 0.8 }}>Expires: {resetResult.expiresAt}</span>
            </div>
          )}
          {resetResult?.error && <div className="settings-error">{resetResult.error}</div>}
          <div style={{ display: 'flex' }}>
            <button type="submit" className="btn btn-secondary" disabled={forgotLoading}>
              {forgotLoading ? 'Generating…' : 'Generate Reset Token'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function RoleBadge({ role }) {
  const styles = {
    owner:  { background: 'rgba(167,139,250,0.15)', color: '#7c3aed' },
    admin:  { background: 'var(--color-brand-100)',  color: 'var(--color-brand-700)' },
    member: { background: 'var(--color-neutral-100)', color: 'var(--color-neutral-600)' },
  };
  return (
    <span className="badge" style={styles[role] || styles.member}>
      {role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Member'}
    </span>
  );
}
