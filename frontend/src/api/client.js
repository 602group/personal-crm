import axios from 'axios';
import { TOKEN_KEY, REFRESH_KEY } from '../context/AuthContext';

// In production (Netlify), VITE_API_URL points to your Render backend.
// In local dev it falls back to localhost.
const apiClient = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Attach access token to every request
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 — only hard-redirect when we have no refresh token remaining
// and we are NOT on an auth endpoint itself (prevents interceptor fighting AuthContext)
apiClient.interceptors.response.use(
  res => res,
  err => {
    const url = err.config?.url || '';
    const isAuthRoute = url.includes('/auth/');

    if (err.response?.status === 401 && !isAuthRoute) {
      const refreshToken = localStorage.getItem(REFRESH_KEY);
      if (!refreshToken) {
        // No refresh token — clear storage and send to login
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_KEY);
        localStorage.removeItem('pos_user');
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
      // If there IS a refresh token, let AuthContext handle the refresh — don't redirect
    }
    return Promise.reject(err);
  }
);

export default apiClient;

