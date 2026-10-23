import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Compact shadcn-style native select; retains option.disabled, keyboard and form semantics. */
export function NativeSelect({ className, wrapperClassName, density = 'default', children, ...props }:
  React.ComponentProps<'select'> & { wrapperClassName?: string; density?: 'default' | 'compact' }) {
  return <span data-slot="shadcn-native-select-wrapper" className={cn('relative inline-flex w-full min-w-0', wrapperClassName)}>
    <select data-slot="shadcn-native-select" data-density={density}
      className={cn(
        'flex w-full min-w-0 appearance-none rounded-md border border-input bg-card text-foreground shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-60',
        density === 'compact' ? 'h-9 px-3 py-1.5 pr-9 text-xs' : 'h-10 px-3 py-2 pr-9 text-sm',
        className,
      )} {...props}>{children}</select>
    <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
  </span>;
}
