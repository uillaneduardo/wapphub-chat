import type { TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> { density?: 'compact' | 'default' }

export function Textarea({ density = 'default', className = '', ...props }: TextareaProps) {
  return <textarea data-slot="textarea" data-density={density} className={['ui-textarea', className].filter(Boolean).join(' ')} {...props} />;
}
