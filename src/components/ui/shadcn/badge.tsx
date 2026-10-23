import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const badgeVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-1 rounded-full border px-2 py-0.5 text-[11px] leading-5 font-medium whitespace-nowrap',
  { variants: { variant: {
    default: 'border-transparent bg-primary text-primary-foreground',
    secondary: 'border-border bg-muted text-muted-foreground',
    outline: 'border-border bg-card text-foreground',
    success: 'border-border bg-muted text-foreground',
  } }, defaultVariants: { variant: 'secondary' } },
);

export function Badge({ className, variant, ...props }: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="shadcn-badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}
