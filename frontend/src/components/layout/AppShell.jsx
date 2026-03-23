import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import '../../styles/layout.css';

export default function AppShell({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();

  // Auto-collapse on narrow screens
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)');
    setSidebarCollapsed(mq.matches);
    const handler = e => setSidebarCollapsed(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Derive page title from path
  const pageTitle = getPageTitle(location.pathname);

  return (
    <div className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(p => !p)} />
      <div className="app-main">
        <Topbar pageTitle={pageTitle} onMenuToggle={() => setSidebarCollapsed(p => !p)} />
        <main className="app-content">
          <div className="content-inner">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function getPageTitle(pathname) {
  const segment = pathname.replace(/^\//, '').split('/')[0];
  const map = {
    '':          'Dashboard',
    dashboard:   'Dashboard',
    goals:       'Goals',
    projects:    'Projects',
    tasks:       'Tasks',
    notes:       'Notes',
    calendar:    'Calendar',
    finance:     'Finance',
    search:      'Search',
    settings:    'Settings',
    users:       'Users',
  };
  return map[segment] || 'Personal OS';
}
