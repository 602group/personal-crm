import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';

const AuthContext = createContext(null);

export const TOKEN_KEY = 'pos_access_token';
export const REFRESH_KEY = 'pos_refresh_token';
const USER_KEY = 'pos_user';

// Client-side permission map (mirrors backend/config/permissions.js)
const PERMISSIONS = {
  owner:  { users: 'CRUD', goals: 'CRUD', projects: 'CRUD', tasks: 'CRUD', notes: 'CRUD', calendar: 'CRUD', finance: 'CRUD', settings: 'CRUD', reports: 'CRUD' },
  admin:  { users: 'RU',   goals: 'CRUD', projects: 'CRUD', tasks: 'CRUD', notes: 'CRUD', calendar: 'CRUD', finance: 'CRUD', settings: 'RU',   reports: 'R' },
  member: { users: '',     goals: 'CRU',  projects: 'CRU',  tasks: 'CRUD', notes: 'CRUD', calendar: 'CRU',  finance: 'R',    settings: '',      reports: '' },
};

function checkPerm(role, module, operation) {
  const allowed = PERMISSIONS[role]?.[module] || '';
  return allowed.includes(operation);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
  });
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;
  const isOwner  = user?.role === 'owner';
  const isAdmin  = user?.role === 'admin';
  const isMember = user?.role === 'member';

  function hasPermission(module, operation) {
    return checkPerm(user?.role, module, operation);
  }

  function canManageUsers() {
    return user?.role === 'owner';
  }

  // Verify stored token on mount
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setIsLoading(false); return; }

    apiClient.get('/auth/me')
      .then(res => {
        setUser(res.data);
        localStorage.setItem(USER_KEY, JSON.stringify(res.data));
      })
      .catch(async () => {
        const refreshToken = localStorage.getItem(REFRESH_KEY);
        if (!refreshToken) { clearAuth(); return; }
        try {
          const res = await apiClient.post('/auth/refresh', { refreshToken });
          localStorage.setItem(TOKEN_KEY, res.data.accessToken);
          setUser(res.data.user);
          localStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
        } catch { clearAuth(); }
      })
      .finally(() => setIsLoading(false));
  }, []);

  function clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }

  const login = useCallback(async (email, password) => {
    const res = await apiClient.post('/auth/login', { email, password });
    const { accessToken, refreshToken, user: userData } = res.data;
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    try { await apiClient.post('/auth/logout', { refreshToken }); } catch { /* best effort */ }
    clearAuth();
  }, []);

  const updateUser = useCallback((updatedFields) => {
    setUser(prev => {
      const next = { ...prev, ...updatedFields };
      localStorage.setItem(USER_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider value={{
      user, isAuthenticated, isLoading,
      isOwner, isAdmin, isMember,
      hasPermission, canManageUsers,
      login, logout, updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export default AuthContext;
