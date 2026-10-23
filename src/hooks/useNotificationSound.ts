import { useCallback, useSyncExternalStore } from 'react';
import { notificationPreferenceEvent, readSoundPreference, saveSoundPreference, soundPreferenceKey } from '../features/conversations/notificationSound';

/** Presentation-only preference. Shared by Inbox and Meu perfil, not a server setting.
 * Listens to local changes and storage updates from other tabs.
 */
export function useNotificationSound(userId?: string, organizationId?: string) {
  const subscribe = useCallback((notify: () => void) => {
    if (!userId || !organizationId) return () => undefined;
    const key = soundPreferenceKey(userId, organizationId);
    const storage = (event: StorageEvent) => {
      if (event.key === key || event.key === null) notify();
    };
    window.addEventListener(notificationPreferenceEvent, notify);
    window.addEventListener('storage', storage);
    return () => {
      window.removeEventListener(notificationPreferenceEvent, notify);
      window.removeEventListener('storage', storage);
    };
  }, [userId, organizationId]);

  const snapshot = useCallback(
    () => readSoundPreference(userId ?? '', organizationId ?? ''),
    [userId, organizationId],
  );
  const enabled = useSyncExternalStore(subscribe, snapshot, () => false);
  const setEnabled = useCallback((next: boolean) => {
    if (userId && organizationId) saveSoundPreference(userId, organizationId, next);
  }, [userId, organizationId]);
  return [enabled, setEnabled] as const;
}
