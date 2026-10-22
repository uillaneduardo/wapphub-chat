import { cloneElement, useId } from 'react';
import type { ReactElement } from 'react';

/**
 * Temporary native presentational tooltip for the CSS transition.
 * The trigger remains the actual focusable, accessible child.
 * Official Radix/shadcn tooltip replaces this after Tailwind isolation.
 */
export function Tooltip({ label, children }: { label: string; children: ReactElement<{ 'aria-describedby'?: string }> }) {
  const id = useId();
  const describedBy = [children.props['aria-describedby'], id].filter(Boolean).join(' ');
  return <span className="ui-tooltip" data-slot="tooltip">
    <span className="ui-tooltip-trigger">{cloneElement(children, { 'aria-describedby': describedBy })}</span>
    <span className="ui-tooltip-content" id={id} role="tooltip">{label}</span>
  </span>;
}
