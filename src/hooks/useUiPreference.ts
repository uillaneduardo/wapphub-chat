import { useCallback, useSyncExternalStore } from 'react';

export type SendShortcut = 'enter' | 'shift-enter';
interface Preferences { sidebarCollapsed: boolean; contextWidth: number; sendShortcut: SendShortcut }
export const DEFAULT_CONTEXT_WIDTH = 300;
const defaults: Preferences = { sidebarCollapsed: false, contextWidth: DEFAULT_CONTEXT_WIDTH, sendShortcut: 'enter' };
const eventName = 'wapphub:ui-preference';
const memory = new Map<string, Preferences>();
export const preferenceKey = (userId: string) => `wapphub:ui:v1:${encodeURIComponent(userId)}`;
function read(userId?: string): Preferences {
  if (!userId) return defaults;
  if (memory.has(userId)) return memory.get(userId)!;
  try {
    const raw = localStorage.getItem(preferenceKey(userId));
    if (!raw) return memory.get(userId) ?? defaults;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return defaults;
    const fields = value as Partial<Preferences>;
    return { sidebarCollapsed: fields.sidebarCollapsed === true, contextWidth: typeof fields.contextWidth === 'number' && Number.isFinite(fields.contextWidth) ? Math.min(480, Math.max(240, fields.contextWidth)) : DEFAULT_CONTEXT_WIDTH, sendShortcut: fields.sendShortcut === 'shift-enter' ? 'shift-enter' : 'enter' };
  } catch { return memory.get(userId) ?? defaults; }
}

/** Account-scoped cosmetic preferences only. No session data, drafts, permissions or tenant data. */
export function useUiPreference<K extends keyof Preferences>(userId: string | undefined, name: K) {
  const subscribe = useCallback((notify: () => void) => {
    const storage = (event: StorageEvent) => { if (userId && (event.key === preferenceKey(userId) || event.key === null)) { memory.delete(userId); notify(); } };
    window.addEventListener(eventName, notify); window.addEventListener('storage', storage);
    return () => { window.removeEventListener(eventName, notify); window.removeEventListener('storage', storage); };
  }, [userId]);
  const snapshot = useCallback(() => read(userId)[name], [userId, name]);
  const value = useSyncExternalStore(subscribe, snapshot, () => defaults[name]);
  const setValue = useCallback((next: Preferences[K]) => {
    if (!userId) return;
    const updated = { ...read(userId), [name]: next };
    try { localStorage.setItem(preferenceKey(userId), JSON.stringify(updated)); memory.delete(userId); }
    catch { memory.set(userId, updated); }
    window.dispatchEvent(new Event(eventName));
  }, [userId, name]);
  return [value, setValue] as const;
}
