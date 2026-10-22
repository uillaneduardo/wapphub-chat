import type { HTMLAttributes } from 'react';

interface SeparatorProps extends HTMLAttributes<HTMLSpanElement> { orientation?: 'horizontal' | 'vertical'; decorative?: boolean }

export function Separator({ orientation = 'horizontal', decorative = true, className = '', ...props }: SeparatorProps) {
  return <span data-slot="separator" data-orientation={orientation} className={['ui-separator', className].filter(Boolean).join(' ')} role={decorative ? 'none' : 'separator'} {...(!decorative ? { 'aria-orientation': orientation } : {})} {...props} />;
}
