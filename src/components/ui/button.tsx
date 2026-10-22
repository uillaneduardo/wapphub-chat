import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'default' | 'outline' | 'ghost' | 'destructive';
export type ButtonSize = 'compact' | 'default' | 'touch' | 'icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children?: ReactNode;
}

/**
 * Dependency-free, token-backed starting primitive.
 * Matches the shadcn/ui data-slot and variant vocabulary; official shadcn
 * components can replace these internals after Tailwind/Preflight validation.
 */
export function Button({ variant = 'default', size = 'default', className = '', type = 'button', children, ...props }: ButtonProps) {
  return <button data-slot="button" data-variant={variant} data-size={size} className={['ui-button', className].filter(Boolean).join(' ')} type={type} {...props}>{children}</button>;
}
