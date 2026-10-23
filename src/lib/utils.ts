import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** shadcn class utility; organization colors remain CSS tokens. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
