/**
 * PageHeader — shared page header component used by every module page.
 * Props:
 *   title:    string   (required)
 *   subtitle: string   (optional)
 *   actions:  ReactNode (optional — right-side action buttons)
 *   breadcrumbs: Array<{label, to}> (optional)
 */
import { Link } from 'react-router-dom';

export default function PageHeader({ title, subtitle, actions, breadcrumbs }) {
  return (
    <div className="page-header">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="breadcrumb" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              {i > 0 && <span className="breadcrumb-sep">/</span>}
              {crumb.to
                ? <Link to={crumb.to}>{crumb.label}</Link>
                : <span className="breadcrumb-current">{crumb.label}</span>}
            </span>
          ))}
        </nav>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
        <div>
          <h2 className="page-title">{title}</h2>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="page-actions">{actions}</div>}
      </div>
    </div>
  );
}
