import type { ReactNode } from 'react';
const shapes = {
  conversations: <><path d="M21 11a8 8 0 0 1-8 8H7l-5 3 2-6a8 8 0 1 1 17-5Z" /><path d="M8 9h8M8 13h5" /></>,
  contacts: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></>,
  files: <><path d="M14 2H5v20h14V7Z" /><path d="M14 2v5h5M8 12h8M8 16h6" /></>,
  team: <><circle cx="9" cy="8" r="3" /><path d="M2 21v-3a7 7 0 0 1 14 0v3M16 5a3 3 0 0 1 0 6M18 15a5 5 0 0 1 4 5" /></>,
  tags: <><path d="m3 3 9 0 9 9-9 9-9-9Z" /><circle cx="8" cy="8" r="1" /></>,
  settings: <><path d="m9 3-1 3-3 1 1 3-2 2 2 2-1 3 3 1 1 3h6l1-3 3-1-1-3 2-2-2-2 1-3-3-1-1-3Z" /><circle cx="12" cy="12" r="3" /></>,
  providers: <><path d="M8 2v5M16 2v5M6 7h12v3a6 6 0 0 1-12 0ZM12 16v6" /></>,
  logout: <><path d="M9 3H4v18h5M10 12h12M18 8l4 4-4 4" /></>,
  collapse: <><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M8 3v18m8-14-4 5 4 5" /></>,
  expand: <><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M8 3v18m4-14 4 5-4 5" /></>,
  chevron: <path d="m6 9 6 6 6-6" />,
  restore: <><path d="M3 10a9 9 0 1 1 1 8M3 3v7h7M12 7v5l3 2" /></>,
} satisfies Record<string, ReactNode>;
export type IconName = keyof typeof shapes;
export function Icon({ name }: { name: IconName }) {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{shapes[name]}</svg>;
}
