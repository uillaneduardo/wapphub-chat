import { useState } from 'react';
import type { HTMLAttributes, ImgHTMLAttributes } from 'react';

/** Uses name-based initials until a tenant-authorized image URL exists in Core. */
export function avatarInitials(name: string): string {
  const words = name.trim().split(/\s+/u).filter(Boolean);
  if (!words.length) return '?';
  const first = Array.from(words[0] ?? '')[0] ?? '?';
  const last = words.length > 1 ? Array.from(words.at(-1) ?? '')[0] ?? '' : '';
  return (first + last).toLocaleUpperCase('pt-BR');
}

interface AvatarProps extends HTMLAttributes<HTMLSpanElement> { size?: 'compact' | 'default' | 'large' }
export function Avatar({ size = 'default', className = '', children, ...props }: AvatarProps) {
  return <span data-slot="avatar" data-size={size} className={['ui-avatar', className].filter(Boolean).join(' ')} {...props}>{children}</span>;
}
export function AvatarFallback({ className = '', children, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span data-slot="avatar-fallback" className={['ui-avatar-fallback', className].filter(Boolean).join(' ')} {...props}>{children}</span>;
}
export function AvatarImage({ alt, src, className = '', ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  return <img data-slot="avatar-image" className={['ui-avatar-image', className].filter(Boolean).join(' ')} alt={alt ?? ''} src={src} onError={() => setFailed(true)} {...props} />;
}
export function ContactAvatar({ name, large = false, className = '' }: { name: string; large?: boolean; className?: string }) {
  return <Avatar className={['contact-avatar', large ? 'large' : '', className].filter(Boolean).join(' ')} size={large ? 'large' : 'default'} aria-hidden="true"><AvatarFallback>{avatarInitials(name)}</AvatarFallback></Avatar>;
}
