import * as React from 'react';
import { cn } from '@/lib/utils';

/** shadcn Input with token-based neutral appearance and compact variant. */
export function Input({ className, type = 'text', density = 'default', ...props }: React.ComponentProps<'input'> & {
  density?: 'default' | 'compact';
}) {
  return <input data-slot="shadcn-input" data-density={density} type={type}
    className={cn(
      'flex h-9 w-full min-w-0 rounded-md border border-input bg-card px-3 py-1.5 text-sm text-foreground shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 read-only:bg-muted',
      density === 'compact' && 'h-8 px-2.5 text-xs',
      className,
    )}
    {...props}
  />;
}
