import { Link } from 'react-router-dom';

export default function AccessDenied() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', textAlign: 'center', minHeight: '60vh',
      padding: 'var(--space-8)', gap: 'var(--space-5)'
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 'var(--radius-xl)',
        background: 'var(--color-danger-light)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontSize: 28
      }}>
        🔒
      </div>
      <div>
        <div style={{
          fontSize: '3rem', fontWeight: 'var(--weight-bold)',
          color: 'var(--color-neutral-300)', lineHeight: 1, marginBottom: 'var(--space-2)'
        }}>403</div>
        <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-bold)', marginBottom: 'var(--space-2)' }}>
          Access Denied
        </h2>
        <p style={{ color: 'var(--color-neutral-500)', fontSize: 'var(--text-sm)', maxWidth: 320 }}>
          You don&apos;t have permission to view this page. Contact an owner if you believe this is an error.
        </p>
      </div>
      <Link to="/dashboard" className="btn btn-secondary">Return to Dashboard</Link>
    </div>
  );
}
