import type { ReactNode } from 'react';

export function PageHeader({ eyebrow, title, description, icon, actions, className = '' }: {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return <header className={['ui-page-header', className].filter(Boolean).join(' ')}>
    <div className="ui-page-header-content">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1>{icon && <span className="ui-page-header-icon" aria-hidden="true">{icon}</span>}{title}</h1>
      {description && <p className="ui-page-description">{description}</p>}
    </div>
    {actions && <div className="ui-page-header-actions">{actions}</div>}
  </header>;
}
