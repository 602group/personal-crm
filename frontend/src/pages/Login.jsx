import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import '../styles/login.css';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm]       = useState({ email: '', password: '' });
  const [error, setError]     = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Forgot password state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotResult, setForgotResult] = useState(null);
  const [forgotLoading, setForgotLoading] = useState(false);

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.email || !form.password) { setError('Please enter your email and password.'); return; }
    setIsLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally { setIsLoading(false); }
  }

  async function handleForgot(e) {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotLoading(true); setForgotResult(null);
    try {
      const res = await apiClient.post('/auth/forgot-password', { email: forgotEmail });
      setForgotResult(res.data);
    } catch (err) {
      setForgotResult({ error: err.response?.data?.error || 'Request failed.' });
    } finally { setForgotLoading(false); }
  }

  if (showForgot) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-brand">
            <div className="login-brand-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="4"/><path d="M9 9h6M9 12h6M9 15h4"/>
              </svg>
            </div>
            <div>
              <h1 className="login-brand-name">Personal OS</h1>
              <p className="login-brand-tagline">Password Reset</p>
            </div>
          </div>
          <div className="login-divider" />
          <div className="login-body">
            <div className="login-header">
              <h2 className="login-title">Reset Password</h2>
              <p className="login-subtitle">Enter your email to generate a reset token</p>
            </div>
            <form className="login-form" onSubmit={handleForgot}>
              <div className="form-group">
                <label className="form-label" htmlFor="forgot_email">Email address</label>
                <input id="forgot_email" type="email" className="form-input"
                  placeholder="you@example.com"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  autoFocus />
              </div>
              {forgotResult && !forgotResult.error && (
                <div style={{
                  background: 'var(--color-success-light)', border: '1px solid rgba(16,185,129,0.2)',
                  borderRadius: 'var(--radius-md)', padding: 'var(--space-4)',
                  fontSize: 'var(--text-xs)', color: 'var(--color-success-dark)'
                }}>
                  <div style={{ fontWeight: 'var(--weight-semibold)', marginBottom: 8 }}>Reset token generated:</div>
                  <div style={{ fontFamily: 'var(--font-mono)', wordBreak: 'break-all', marginBottom: 6 }}>
                    {forgotResult.resetToken}
                  </div>
                  <div style={{ opacity: 0.8 }}>Expires: {forgotResult.expiresAt?.replace('T', ' ').replace('.000Z', ' UTC')}</div>
                  <div style={{ marginTop: 8, opacity: 0.8 }}>Use this token under Settings → Security → Password Reset, or via the API.</div>
                </div>
              )}
              {forgotResult?.error && (
                <div className="login-error"><span>{forgotResult.error}</span></div>
              )}
              <button type="submit" className="btn btn-primary btn-lg login-submit" disabled={forgotLoading}>
                {forgotLoading ? 'Generating…' : 'Generate Reset Token'}
              </button>
              <button type="button" className="btn btn-ghost" style={{ textAlign: 'center' }}
                onClick={() => { setShowForgot(false); setForgotResult(null); setForgotEmail(''); }}>
                ← Back to sign in
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-brand-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="4"/><path d="M9 9h6M9 12h6M9 15h4"/>
            </svg>
          </div>
          <div>
            <h1 className="login-brand-name">Personal OS</h1>
            <p className="login-brand-tagline">Command Center</p>
          </div>
        </div>
        <div className="login-divider" />
        <div className="login-body">
          <div className="login-header">
            <h2 className="login-title">Welcome back</h2>
            <p className="login-subtitle">Sign in to access your dashboard</p>
          </div>
          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email address</label>
              <input id="email" name="email" type="email"
                className={`form-input ${error ? 'error' : ''}`}
                placeholder="you@example.com"
                value={form.email} onChange={handleChange}
                autoComplete="email" autoFocus />
            </div>
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" htmlFor="password">Password</label>
                <button type="button" className="login-forgot-link"
                  onClick={() => { setShowForgot(true); setForgotEmail(form.email); }}>
                  Forgot password?
                </button>
              </div>
              <input id="password" name="password" type="password"
                className={`form-input ${error ? 'error' : ''}`}
                placeholder="••••••••"
                value={form.password} onChange={handleChange}
                autoComplete="current-password" />
            </div>
            {error && (
              <div className="login-error">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>{error}</span>
              </div>
            )}
            <button type="submit" className="btn btn-primary btn-lg login-submit" disabled={isLoading}>
              {isLoading
                ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /><span>Signing in…</span></>
                : 'Sign in'}
            </button>
          </form>
        </div>
        <div className="login-footer">
          <span className="login-footer-text">Secure admin access only</span>
        </div>
      </div>
    </div>
  );
}
