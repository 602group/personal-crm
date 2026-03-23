export default function StubPage({ title, description, icon, features = [] }) {
  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">{title}</h2>
        <p className="page-subtitle">{description}</p>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="empty-state">
            <div className="empty-state-icon" style={{ width: 72, height: 72, borderRadius: 'var(--radius-xl)', fontSize: 32, background: 'var(--color-brand-50)' }}>
              {icon}
            </div>
            <div>
              <div className="empty-state-title">{title} is coming soon</div>
              <p className="empty-state-desc">
                This module is part of the roadmap and will be built in an upcoming phase.
              </p>
            </div>

            {features.length > 0 && (
              <div style={{ width: '100%', maxWidth: 360 }}>
                <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--color-neutral-700)', marginBottom: 'var(--space-3)', textAlign: 'left' }}>
                  What's planned:
                </p>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', textAlign: 'left' }}>
                  {features.map((f, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-sm)', color: 'var(--color-neutral-600)' }}>
                      <span style={{ color: 'var(--color-brand-500)', fontWeight: '600', flexShrink: 0 }}>→</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="badge badge-default" style={{ padding: '6px 16px', fontSize: 'var(--text-sm)' }}>
              In Roadmap
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
