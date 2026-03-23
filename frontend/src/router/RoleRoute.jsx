import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AccessDenied from '../pages/AccessDenied';

/**
 * RoleRoute — wraps a group of routes and enforces role-based access.
 * Props:
 *   allowedRoles: string[]  — e.g. ['owner', 'admin']
 *   redirectUnauth: bool    — if true, redirect to /login when not authenticated
 */
export default function RoleRoute({ allowedRoles = [], redirectUnauth = true }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return redirectUnauth ? <Navigate to="/login" replace /> : <AccessDenied />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return <AccessDenied />;
  }

  return <Outlet />;
}
