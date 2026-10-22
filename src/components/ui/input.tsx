import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> { density?: 'compact' | 'default' }

export function Input({ density = 'default', className = '', type = 'text', ...props }: InputProps) {
  return <input data-slot="input" data-density={density} type={type} className={['ui-input', className].filter(Boolean).join(' ')} {...props} />;
}
