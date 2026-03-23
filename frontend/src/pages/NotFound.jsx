import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--color-neutral-50)'
    }}>
      <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
        <div style={{ fontSize: 64, marginBottom: 'var(--space-4)', lineHeight: 1 }}>404</div>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-bold)', marginBottom: 'var(--space-2)' }}>Page not found</h1>
        <p style={{ color: 'var(--color-neutral-500)', marginBottom: 'var(--space-6)' }}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/dashboard" className="btn btn-primary">Return to Dashboard</Link>
      </div>
    </div>
  );
}
