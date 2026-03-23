/**
 * EmptyState — consistent empty state component for all modules.
 * Props:
 *   icon:    emoji or react node
 *   title:   string
 *   desc:    string
 *   action:  ReactNode (optional CTA button)
 */
export default function EmptyState({ icon = '📭', title, desc, action }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      {title && <div className="empty-state-title">{title}</div>}
      {desc  && <div className="empty-state-desc">{desc}</div>}
      {action && <div style={{ marginTop: 'var(--space-4)' }}>{action}</div>}
    </div>
  );
}
