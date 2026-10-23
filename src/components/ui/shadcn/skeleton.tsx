import * as React from 'react';
import { cn } from '@/lib/utils';

/** shadcn-compatible skeleton primitive; visual-only and excluded from accessibility tree. */
export function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="shadcn-skeleton" aria-hidden="true"
    className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />;
}
