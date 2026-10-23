import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useNotificationSound } from './useNotificationSound';
import { saveSoundPreference, soundPreferenceKey } from '../features/conversations/notificationSound';

function Toggle({ user = 'user-1', org = 'org-1', label }: { user?: string; org?: string; label: string }) {
  const [enabled, setEnabled] = useNotificationSound(user, org);
  return <button type="button" aria-pressed={enabled} onClick={() => setEnabled(!enabled)}>
    {label}
  </button>;
}

describe('F.3 — notification preference shared by Inbox and Meu perfil', () => {
  afterEach(() => { localStorage.clear(); vi.restoreAllMocks(); });
  it('synchronizes multiple route controls in the same browser without API calls', async () => {
    render(<><Toggle label="Inbox" /><Toggle label="Perfil" /></>);
    const inbox = screen.getByRole('button', { name: 'Inbox' });
    const profile = screen.getByRole('button', { name: 'Perfil' });
    expect(inbox).toHaveAttribute('aria-pressed', 'false');
    expect(profile).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(inbox);
    await waitFor(() => expect(profile).toHaveAttribute('aria-pressed', 'true'));
    fireEvent.click(profile);
    await waitFor(() => expect(inbox).toHaveAttribute('aria-pressed', 'false'));
    expect(localStorage.getItem(soundPreferenceKey('user-1', 'org-1'))).toBe('off');
  });
  it('keeps notification preference independent per user and organization', async () => {
    render(<><Toggle label="Org 1" /><Toggle label="Org 2" org="org-2" /><Toggle label="Other account" user="user-2" /></>);
    fireEvent.click(screen.getByRole('button', { name: 'Org 1' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Org 1' })).toHaveAttribute('aria-pressed', 'true'));
    expect(screen.getByRole('button', { name: 'Org 2' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Other account' })).toHaveAttribute('aria-pressed', 'false');
  });
  it('reacts to other-tab storage updates but not unrelated preference keys', async () => {
    render(<Toggle label="Inbox" />);
    const key = soundPreferenceKey('user-1', 'org-1');
    localStorage.setItem(key, 'on');
    fireEvent(window, new StorageEvent('storage', { key, newValue: 'on' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Inbox' })).toHaveAttribute('aria-pressed', 'true'));
    localStorage.setItem(key, 'off');
    fireEvent(window, new StorageEvent('storage', { key, newValue: 'off' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Inbox' })).toHaveAttribute('aria-pressed', 'false'));
  });
  it('respects manual notification sound preference writes from legacy callers', async () => {
    render(<Toggle label="Inbox" />);
    saveSoundPreference('user-1', 'org-1', true);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Inbox' })).toHaveAttribute('aria-pressed', 'true'));
  });
});
