import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { usersApi } from '../api/users';
import { RoleBadge } from './Settings';

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState(null);

  const loadUsers = useCallback(async () => {
    try {
      const res = await usersApi.list();
      setUsers(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
          <div>
            <h2 className="page-title">Users</h2>
            <p className="page-subtitle">Manage accounts, roles, and access</p>
          </div>
          {currentUser?.role === 'owner' && (
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              <PlusIcon /> New User
            </button>
          )}
        </div>
      </div>

      {error && <div className="settings-error" style={{ marginBottom: 'var(--space-6)' }}>{error}</div>}

      <div className="card">
        {loading ? (
          <div style={{ padding: 'var(--space-16)', display: 'flex', justifyContent: 'center' }}>
            <div className="spinner" />
          </div>
        ) : users.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <div className="empty-state-title">No users found</div>
            <div className="empty-state-desc">Create the first user to get started.</div>
          </div>
        ) : (
          <div className="users-table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last Login</th>
                  <th>Member Since</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <UserRow
                    key={u.id}
                    user={u}
                    currentUser={currentUser}
                    onEdit={() => setEditUser(u)}
                    onToggle={async () => {
                      try {
                        if (u.is_active) await usersApi.deactivate(u.id);
                        else await usersApi.activate(u.id);
                        await loadUsers();
                      } catch (err) {
                        setError(err.response?.data?.error || 'Action failed');
                      }
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={async () => { await loadUsers(); setShowCreate(false); }}
        />
      )}
      {editUser && (
        <EditUserModal
          user={editUser}
          currentUser={currentUser}
          onClose={() => setEditUser(null)}
          onSaved={async () => { await loadUsers(); setEditUser(null); }}
        />
      )}
    </div>
  );
}

/* ── User Row ── */
function UserRow({ user, currentUser, onEdit, onToggle }) {
  const initials = user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const isMe = user.id === currentUser?.id;
  const canEdit = currentUser?.role === 'owner' || currentUser?.role === 'admin';
  const canDeactivate = currentUser?.role === 'owner' && !isMe;

  return (
    <tr className={!user.is_active ? 'row-inactive' : ''}>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div className="avatar avatar-sm">
            {user.avatar_url
              ? <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initials}
          </div>
          <div>
            <div style={{ fontWeight: 'var(--weight-medium)', color: 'var(--color-neutral-900)', fontSize: 'var(--text-sm)' }}>
              {user.name} {isMe && <span className="badge badge-brand" style={{ fontSize: 10 }}>You</span>}
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-neutral-500)' }}>{user.email}</div>
          </div>
        </div>
      </td>
      <td><RoleBadge role={user.role} /></td>
      <td>
        <span className={`badge ${user.is_active ? 'badge-success' : 'badge-default'}`}>
          {user.is_active ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td style={{ fontSize: 'var(--text-xs)', color: 'var(--color-neutral-500)' }}>
        {user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : 'Never'}
      </td>
      <td style={{ fontSize: 'var(--text-xs)', color: 'var(--color-neutral-500)' }}>
        {new Date(user.created_at).toLocaleDateString()}
      </td>
      <td>
        <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
          {canEdit && (
            <button className="btn btn-ghost btn-sm" onClick={onEdit}>Edit</button>
          )}
          {canDeactivate && (
            <button
              className={`btn btn-sm ${user.is_active ? 'btn-ghost' : 'btn-secondary'}`}
              style={user.is_active ? { color: 'var(--color-danger)' } : {}}
              onClick={onToggle}
            >
              {user.is_active ? 'Deactivate' : 'Activate'}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

/* ── Create User Modal ── */
function CreateUserModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'member' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setError('All fields are required.'); return;
    }
    setSaving(true); setError('');
    try {
      await usersApi.create(form);
      onCreated();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create user.');
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)' }}>Create New User</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><CloseIcon /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input className="form-input" type="email" value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
              <span className="form-hint">Minimum 8 characters</span>
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="form-input" value={form.role}
                onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                <option value="member">Member</option>
                <option value="admin">Admin</option>
                <option value="owner">Owner</option>
              </select>
            </div>
            {error && <div className="settings-error">{error}</div>}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Creating…' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Edit User Modal ── */
function EditUserModal({ user, currentUser, onClose, onSaved }) {
  const [form, setForm] = useState({ name: user.name, role: user.role, avatar_url: user.avatar_url || '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const canChangeRole = currentUser?.role === 'owner';

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required.'); return; }
    setSaving(true); setError('');
    try {
      await usersApi.update(user.id, {
        name: form.name.trim(),
        role: canChangeRole ? form.role : undefined,
        avatar_url: form.avatar_url.trim() || null,
      });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update user.');
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)' }}>Edit User</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><CloseIcon /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" value={user.email} disabled
                style={{ background: 'var(--color-neutral-50)', cursor: 'not-allowed' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Avatar URL</label>
              <input className="form-input" placeholder="https://..." value={form.avatar_url}
                onChange={e => setForm(p => ({ ...p, avatar_url: e.target.value }))} />
            </div>
            {canChangeRole && (
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-input" value={form.role}
                  onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                  <option value="owner">Owner</option>
                </select>
              </div>
            )}
            {error && <div className="settings-error">{error}</div>}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}
