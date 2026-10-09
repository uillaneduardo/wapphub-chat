import type { ReactNode } from 'react';
const shapes = {
  restore: <><path d="M3 10a9 9 0 1 1 1 8M3 3v7h7M12 7v5l3 2" /></>,
} satisfies Record<string, ReactNode>;
export type IconName = keyof typeof shapes;
export function Icon({ name }: { name: IconName }) {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{shapes[name]}</svg>;
}
