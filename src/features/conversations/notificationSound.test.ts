import { afterEach, describe, expect, it, vi } from 'vitest';
import { notificationIsFresh, readSoundPreference, saveSoundPreference, shouldPlayForMessage, soundPreferenceKey } from './notificationSound';

describe('message notification sound policy', () => {
  afterEach(() => { localStorage.clear(); vi.restoreAllMocks(); });
  it('requires opt-in per user and organization and retains disabled as default', () => {
    expect(readSoundPreference('a', 'org-1')).toBe(false);
    saveSoundPreference('a', 'org-1', true);
    expect(readSoundPreference('a', 'org-1')).toBe(true);
    expect(readSoundPreference('b', 'org-1')).toBe(false);
    expect(readSoundPreference('a', 'org-2')).toBe(false);
    saveSoundPreference('a', 'org-1', false);
    expect(readSoundPreference('a', 'org-1')).toBe(false);
    expect(soundPreferenceKey('a', 'org-1')).not.toBe(soundPreferenceKey('a', 'org-2'));
  });
  it('filters own, historical, optimistic and external outbounds', () => {
    const base = { id: 'message-1', senderUserId: 'agent-b', direction: 'INTERNAL' };
    expect(shouldPlayForMessage(base, 'agent-a')).toBe(true);
    expect(shouldPlayForMessage({ ...base, senderUserId: 'agent-a' }, 'agent-a')).toBe(false);
    expect(shouldPlayForMessage({ ...base, direction: 'OUTBOUND' }, 'agent-a')).toBe(false);
    expect(shouldPlayForMessage({ ...base, direction: 'INBOUND', historical: true }, 'agent-a')).toBe(false);
    expect(shouldPlayForMessage({ ...base, id: 'optimistic:test' }, 'agent-a')).toBe(false);
    expect(shouldPlayForMessage({ ...base, direction: 'INBOUND', senderUserId: null }, 'agent-a')).toBe(true);
  });
  it('does not replay sounds for historical or old reconnect events', () => {
    const mounted = Date.parse('2026-10-23T13:00:00Z');
    expect(notificationIsFresh('2026-10-23T12:00:00Z', mounted, mounted + 2000)).toBe(false);
    expect(notificationIsFresh('2026-10-23T13:00:01Z', mounted, mounted + 2000)).toBe(true);
    // A 10-minute-old queued event arriving after WebSocket recovery must stay silent.
    expect(notificationIsFresh('2026-10-23T13:00:01Z', mounted, mounted + 10 * 60_000)).toBe(false);
    expect(notificationIsFresh('2026-10-23T13:09:58Z', mounted, mounted + 10 * 60_000)).toBe(true);
    expect(notificationIsFresh('invalid', mounted)).toBe(false);
    expect(notificationIsFresh('2026-10-23T14:00:00Z', mounted, mounted + 2000)).toBe(false);
  });
});
