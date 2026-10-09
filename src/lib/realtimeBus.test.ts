import { describe, expect, it } from 'vitest';
import { realtimeBus } from './realtimeBus';
import type { ChatEvent } from '../types/chat';

const event: ChatEvent = { version: 1, eventId: '1', organizationId: 'org-1', type: 'message.created', entityId: 'm-1', occurredAt: '2026-10-08T00:00:00Z', payload: { resourceId: 'm-1', conversationId: 'c-1' } };

describe('realtime consumer acknowledgement', () => {
  it('waits for the authorized REST refresh before acknowledging delivery', async () => {
    let finish!: () => void;
    const request = new Promise<void>((resolve) => { finish = resolve; });
    const unsubscribe = realtimeBus.subscribe(() => request);
    let acknowledged = false;
    const delivery = Promise.resolve(realtimeBus.emit(event)).then(() => { acknowledged = true; });
    await Promise.resolve();
    const beforeREST = acknowledged;
    finish(); await delivery; unsubscribe();
    expect(beforeREST).toBe(false);
    expect(acknowledged).toBe(true);
  });
  it('propagates REST failure instead of acknowledging a failed update', async () => {
    const unsubscribe = realtimeBus.subscribe(() => Promise.reject(new Error('REST 500')));
    try { await expect(Promise.resolve(realtimeBus.emit(event))).rejects.toThrow('REST 500'); }
    finally { unsubscribe(); }
  });
});

import { vi } from 'vitest';

describe('P1 projection lifecycle', () => {
  it('cancels an unmounted projection without allowing its old request to apply', async () => {
    let finish!: () => void; let applied = false; let requestSignal!: AbortSignal;
    const unsubscribe = realtimeBus.subscribe(async (_event, signal) => { requestSignal = signal; await new Promise<void>((resolve) => { finish = resolve; }); if (!signal.aborted) applied = true; });
    const pending = realtimeBus.emit(event); for (let i = 0; i < 8; i += 1) await Promise.resolve();
    unsubscribe(); await pending; expect(requestSignal.aborted).toBe(true); finish(); await Promise.resolve(); expect(applied).toBe(false);
    await expect(realtimeBus.emit(event)).resolves.toBeUndefined();
  });
  it('ignores foreign tenants and reconciles only the active tenant', async () => {
    const receive = vi.fn(); const reconcile = vi.fn();
    const unsubscribe = realtimeBus.subscribe(receive, { organizationId: 'org-2', reconcile });
    await realtimeBus.emit(event); await realtimeBus.reconcile('org-1'); expect(receive).not.toHaveBeenCalled(); expect(reconcile).not.toHaveBeenCalled();
    await realtimeBus.reconcile('org-2'); expect(reconcile).toHaveBeenCalledTimes(1); unsubscribe();
  });
  it('times out hung REST work, aborts it, and permits a later retry', async () => {
    vi.useFakeTimers(); let signal!: AbortSignal;
    const unsubscribe = realtimeBus.subscribe((_event, current) => { signal = current; return new Promise<void>(() => undefined); });
    const pending = realtimeBus.emit(event); const rejected = expect(pending).rejects.toThrow('Realtime REST timeout');
    await vi.advanceTimersByTimeAsync(10_000); await rejected; expect(signal.aborted).toBe(true); unsubscribe();
    const receive = vi.fn(); const stop = realtimeBus.subscribe(receive); await realtimeBus.emit(event); expect(receive).toHaveBeenCalledTimes(1); stop(); vi.useRealTimers();
  });
});
