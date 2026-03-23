import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import QuickActionModal from '../ui/QuickActionModal';
import NotificationPanel, { useUnreadCount } from '../ui/NotificationPanel';

export default function Topbar({ pageTitle, onMenuToggle }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [userMenuOpen,   setUserMenuOpen]   = useState(false);
  const [quickActionOpen, setQuickActionOpen] = useState(false);
  const [notifOpen,       setNotifOpen]       = useState(false);
  const unreadCount = useUnreadCount();

  const userMenuRef  = useRef(null);
  const notifRef     = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
      if (notifRef.current    && !notifRef.current.contains(e.target))    setNotifOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function handleLogout() {
    setUserMenuOpen(false);
    await logout();
    navigate('/login');
  }

  // Avatar initials / image
  const initials = user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'A';

  return (
    <>
      <header className="topbar">
        <div className="topbar-left">
          <button
            className="btn btn-ghost btn-icon topbar-menu-btn"
            onClick={onMenuToggle}
            aria-label="Toggle sidebar"
          >
            <MenuIcon />
          </button>
          <h1 className="topbar-title">{pageTitle}</h1>
        </div>

        <div className="topbar-right">
          {/* Quick Action button */}
          <button
            className="btn btn-primary btn-sm topbar-add-btn"
            onClick={() => setQuickActionOpen(true)}
            aria-label="Quick action"
          >
            <PlusIcon />
            <span>New</span>
          </button>

          {/* Notification bell */}
          <div ref={notifRef} style={{ position: 'relative' }}>
            <div className="topbar-bell-wrap">
              <button
                className={`btn btn-ghost btn-icon topbar-icon-btn ${notifOpen ? 'active' : ''}`}
                aria-label="Notifications"
                onClick={() => setNotifOpen(p => !p)}
              >
                <BellIcon />
              </button>
              {unreadCount > 0 && (
                <div className="topbar-bell-badge">{unreadCount > 9 ? '9+' : unreadCount}</div>
              )}
            </div>
            {notifOpen && <NotificationPanel onClose={() => setNotifOpen(false)} />}
          </div>

          {/* User menu */}
          <div ref={userMenuRef} className="topbar-user-wrap">
            <button
              className={`topbar-user ${userMenuOpen ? 'open' : ''}`}
              onClick={() => setUserMenuOpen(p => !p)}
              aria-label="User menu"
              aria-expanded={userMenuOpen}
            >
              <div className="avatar avatar-sm">
                {user?.avatar_url
                  ? <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : initials}
              </div>
              <div className="topbar-user-info">
                <span className="topbar-user-name">{user?.name}</span>
                <span className="topbar-user-role">{user?.role}</span>
              </div>
              <ChevronIcon open={userMenuOpen} />
            </button>

            {userMenuOpen && (
              <div className="user-dropdown">
                <div className="user-dropdown-header">
                  <div className="avatar avatar-md user-dropdown-avatar">
                    {user?.avatar_url
                      ? <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : initials}
                  </div>
                  <div>
                    <div className="user-dropdown-name">{user?.name}</div>
                    <div className="user-dropdown-email">{user?.email}</div>
                  </div>
                </div>
                <div className="user-dropdown-divider" />
                <button className="user-dropdown-item" onClick={() => { setUserMenuOpen(false); navigate('/settings'); }}>
                  <ProfileIcon /> Profile Settings
                </button>
                {(user?.role === 'owner' || user?.role === 'admin') && (
                  <button className="user-dropdown-item" onClick={() => { setUserMenuOpen(false); navigate('/users'); }}>
                    <UsersIcon /> User Management
                  </button>
                )}
                <div className="user-dropdown-divider" />
                <button className="user-dropdown-item user-dropdown-danger" onClick={handleLogout}>
                  <LogoutIcon /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Quick Action Modal */}
      {quickActionOpen && (
        <QuickActionModal onClose={() => setQuickActionOpen(false)} />
      )}
    </>
  );
}

/* ── Icons ── */
function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}
function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
    </svg>
  );
}
function ChevronIcon({ open }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}
function ProfileIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
    </svg>
  );
}
function LogoutIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );
}
