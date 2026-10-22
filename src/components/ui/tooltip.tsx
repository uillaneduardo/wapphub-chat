import { useId } from 'react';
import type { ReactElement, ReactNode } from 'react';

/**
 * Lightweight presentational tooltip for the CSS transition.
 * Trigger must be an accessible focusable element with its own aria-label.
 * Does not implement Radix focus management; replace with official shadcn
 * Tooltip when Radix/Tailwind are introduced.
 */
export function Tooltip({ label, children }: { label: string; children: ReactElement; }) {
  const id = useId();
  return <span className="ui-tooltip" data-slot="tooltip">
    <span className="ui-tooltip-trigger" aria-describedby={id}>{children}</span>
    <span className="ui-tooltip-content" id={id} role="tooltip">{label}</span>
  </span>;
}
export function TooltipText({ children }: { children: ReactNode }) {
  return <span className="ui-tooltip-inline">{children}</span>;
}
