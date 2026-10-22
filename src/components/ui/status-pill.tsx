import type { HTMLAttributes, ReactNode } from 'react';

export function StatusPill({ tone = 'muted', children, className = '', ...props }: HTMLAttributes<HTMLSpanElement> & {
  tone?: 'muted' | 'success' | 'warning';
  children: ReactNode;
}) {
  return <span data-slot="status-pill" data-tone={tone} className={['ui-status-pill', className].filter(Boolean).join(' ')} {...props}>{children}</span>;
}
