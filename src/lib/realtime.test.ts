import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRealtimeUrl, RealtimeClient } from './realtime';

class FakeSocket {
  static instances: FakeSocket[] = []; onopen: (() => void) | null = null; onclose: (() => void) | null = null; onerror: (() => void) | null = null; onmessage: ((event: { data: string }) => void) | null = null;
  url: string; close = vi.fn(() => this.onclose?.());
  constructor(url: string) { this.url = url; FakeSocket.instances.push(this); }
}
const event = (eventId: string) => ({ version: 1, eventId, organizationId: 'org-1', type: 'message.created', entityId: 'message-1', occurredAt: '2026-10-08T00:00:00.000Z', payload: { resourceId: 'message-1', conversationId: 'conversation-1' } });
const flushQueue = async () => { for (let i = 0; i < 32; i += 1) await Promise.resolve(); };

describe('RealtimeClient', () => {
  afterEach(() => { FakeSocket.instances = []; vi.useRealTimers(); });
  it('invalidates pending reconciliation on a permission revision without logging out or retrying stale authority', async () => {
    vi.useFakeTimers(); const changed = vi.fn(), expired = vi.fn(); let signal!: AbortSignal;
    const client = new RealtimeClient({ url: createRealtimeUrl('https://api.wapphub.com.br'), organizationId: 'org-1', onEvent: vi.fn(), onReconcile: (current) => { signal = current; return new Promise(() => {}); }, onPermissionsChanged: changed, onUnauthorized: expired, WebSocketImpl: FakeSocket as unknown as typeof WebSocket });
    client.connect(); const socket = FakeSocket.instances[0]!;
    socket.onmessage?.({ data: JSON.stringify({ version: 1, type: 'sync.checkpoint', lastEventId: '0', hasMore: false }) }); await flushQueue();
    (socket.onclose as unknown as (event: { code: number }) => void)({ code: 4003 });
    expect(signal.aborted).toBe(true); expect(changed).toHaveBeenCalledOnce(); expect(expired).not.toHaveBeenCalled(); vi.advanceTimersByTime(60_000); expect(FakeSocket.instances).toHaveLength(1);
  });
  it('builds the Core websocket URL and reconnects from a confirmed checkpoint', async () => {
    expect(createRealtimeUrl('https://api.wapphub.com.br', '12')).toBe('wss://api.wapphub.com.br/api/v1/realtime?lastEventId=12');
    vi.useFakeTimers(); const events = vi.fn(); const checkpoint = vi.fn(); const stored = new Map([['org-1', '40']]); const checkpointStore = { get: (orgId: string) => stored.get(orgId) ?? null, set: (orgId: string, eventId: string) => { stored.set(orgId, eventId); } }; const client = new RealtimeClient({ url: createRealtimeUrl('https://api.wapphub.com.br'), organizationId: 'org-1', checkpointStore, onEvent: events, onCheckpoint: checkpoint, WebSocketImpl: FakeSocket as unknown as typeof WebSocket, random: () => 0.5 });
    client.connect(); const first = FakeSocket.instances[0]!; expect(new URL(first.url).searchParams.get('lastEventId')).toBe('40'); first.onopen?.(); first.onmessage?.({ data: JSON.stringify(event('41')) });
    first.onmessage?.({ data: JSON.stringify(event('41')) });
    first.onmessage?.({ data: JSON.stringify({ version: 1, type: 'sync.checkpoint', lastEventId: '42', hasMore: false }) });
    await flushQueue();
    expect(events).toHaveBeenCalledTimes(1); expect(checkpoint).toHaveBeenCalledWith({ version: 1, type: 'sync.checkpoint', lastEventId: '42', hasMore: false }); expect(client.lastEventId).toBe('42'); expect(stored.get('org-1')).toBe('42');
    first.onclose?.(); expect(FakeSocket.instances).toHaveLength(1); vi.advanceTimersByTime(500); expect(FakeSocket.instances).toHaveLength(2);
    expect(new URL(FakeSocket.instances[1]!.url).searchParams.get('lastEventId')).toBe('42'); client.close();
  });
  it('does not deliver events from another organization', async () => {
    const events = vi.fn(); const client = new RealtimeClient({ url: 'wss://example.test/api/v1/realtime', organizationId: 'org-1', onEvent: events, WebSocketImpl: FakeSocket as unknown as typeof WebSocket });
    client.connect(); FakeSocket.instances[0]!.onmessage?.({ data: JSON.stringify({ ...event('1'), organizationId: 'org-2' }) }); await flushQueue();
    expect(events).not.toHaveBeenCalled(); client.close();
  });
});

describe('P1 conservative checkpoint and recovery', () => {
  afterEach(() => { FakeSocket.instances = []; sessionStorage.clear(); vi.useRealTimers(); });
  const checkpointFrame = (id = '1') => ({ version: 1, type: 'sync.checkpoint', lastEventId: id, hasMore: false });
  function setup(onEvent: (event: import('../types/chat').ChatEvent, signal: AbortSignal) => void | Promise<void>, extra: Partial<import('./realtime').RealtimeOptions> = {}) {
    vi.useFakeTimers();
    const set = vi.fn();
    const states = vi.fn();
    const client = new RealtimeClient({ url: 'wss://local.test/api/v1/realtime', organizationId: 'org-1', lastEventId: '0', onEvent, checkpointStore: { get: () => null, set }, WebSocketImpl: FakeSocket as unknown as typeof WebSocket, onState: states, random: () => 0.5, ...extra });
    client.connect();
    const send = (frame: unknown, socket = FakeSocket.instances.at(-1)!) => socket.onmessage?.({ data: JSON.stringify(frame) });
    return { client, send, set, states };
  }
  it('confirms only after REST and final reconciliation are completed', async () => {
    let resolve!: () => void;
    const rest = new Promise<void>((done) => { resolve = done; });
    const reconcile = vi.fn();
    const { client, send, set } = setup(() => rest, { onReconcile: reconcile });
    send(event('1')); send(checkpointFrame()); await flushQueue();
    expect(client.lastEventId).toBe('0'); expect(set).not.toHaveBeenCalled();
    resolve(); await flushQueue();
    expect(client.lastEventId).toBe('1'); expect(reconcile).toHaveBeenCalledTimes(1); client.close();
  });
  it.each(['REST 500', 'REST timeout'])('replays pending work after %s and recovers on the next attempt', async (failure) => {
    const refresh = vi.fn().mockRejectedValueOnce(new Error(failure)).mockResolvedValue(undefined);
    const { client, send, set } = setup(refresh);
    send(event('1')); send(checkpointFrame()); await flushQueue();
    expect(set).not.toHaveBeenCalled(); expect(client.lastEventId).toBe('0');
    vi.advanceTimersByTime(500); expect(new URL(FakeSocket.instances.at(-1)!.url).searchParams.get('lastEventId')).toBe('0');
    send(event('1')); send(checkpointFrame()); await flushQueue();
    expect(refresh).toHaveBeenCalledTimes(2); expect(client.lastEventId).toBe('1'); client.close();
  });
  it('discards an in-flight update on disconnection and ignores late old-socket frames', async () => {
    let resolve!: () => void;
    let previousSignal!: AbortSignal;
    const refresh = vi.fn((_event, signal: AbortSignal) => { previousSignal = signal; return new Promise<void>((done) => { resolve = done; }); });
    const { client, send, set } = setup(refresh);
    const old = FakeSocket.instances[0]!;
    send(event('1')); send(checkpointFrame()); await flushQueue();
    old.onclose?.(); expect(previousSignal.aborted).toBe(true);
    resolve(); await flushQueue(); expect(set).not.toHaveBeenCalled();
    vi.advanceTimersByTime(500); send(event('2'), old); await flushQueue(); expect(refresh).toHaveBeenCalledTimes(1);
    refresh.mockResolvedValue(undefined); send(event('1')); send(checkpointFrame()); await flushQueue();
    expect(client.lastEventId).toBe('1'); client.close();
  });
  it('deduplicates, serializes rapid/out-of-order invalidations and never regresses the cursor', async () => {
    const applied: string[] = []; let resolve!: () => void;
    const { client, send } = setup(async (current) => { if (current.eventId === '3') await new Promise<void>((done) => { resolve = done; }); applied.push(current.eventId); });
    send(event('3')); send(event('2')); send(event('3')); send(event('1')); send(checkpointFrame('3')); await flushQueue();
    expect(applied).toEqual([]); resolve(); await flushQueue();
    expect(applied).toEqual(['3', '2', '1']); expect(client.lastEventId).toBe('3');
    send(checkpointFrame('2')); send(event('1')); await flushQueue(); expect(client.lastEventId).toBe('3'); expect(applied).toHaveLength(3); client.close();
  });
  it('does not commit a page whose REST resync failed, even when no visible events were delivered', async () => {
    const reconcile = vi.fn().mockRejectedValueOnce(new Error('REST 500')).mockResolvedValue(undefined);
    const { client, send } = setup(vi.fn(), { onReconcile: reconcile });
    send(checkpointFrame('9')); await flushQueue(); expect(client.lastEventId).toBe('0');
    vi.advanceTimersByTime(500); send(checkpointFrame('9')); await flushQueue(); expect(client.lastEventId).toBe('9'); client.close();
  });
  it('cancels queued work and cursor writes on logout/context teardown', async () => {
    const refresh = vi.fn(); const { client, send, set } = setup(refresh);
    send(event('1')); send(checkpointFrame()); client.close(); await flushQueue();
    expect(refresh).not.toHaveBeenCalled(); expect(set).not.toHaveBeenCalled();
    vi.advanceTimersByTime(60_000); expect(FakeSocket.instances).toHaveLength(1);
  });
  it('backs off increasingly and pauses after eight unsuccessful recoveries; explicit retry resumes', async () => {
    const { client, send, states } = setup(() => Promise.reject(new Error('REST 500')));
    for (let i = 0; i < 9; i += 1) { send(event('1')); await flushQueue(); if (i < 8) vi.advanceTimersByTime(Math.min(30_000, 500 * 2 ** Math.min(i, 6))); }
    expect(states).toHaveBeenLastCalledWith('stale'); const total = FakeSocket.instances.length;
    vi.advanceTimersByTime(120_000); expect(FakeSocket.instances).toHaveLength(total);
    client.retry(); expect(FakeSocket.instances).toHaveLength(total + 1); client.close();
  });
  it('stops and expires the local session after a REST 401', async () => {
    const unauthorized = vi.fn(); const { client, send, set } = setup(() => Promise.reject({ status: 401 }), { onUnauthorized: unauthorized });
    send(event('1')); send(checkpointFrame()); await flushQueue();
    expect(unauthorized).toHaveBeenCalledTimes(1); expect(set).not.toHaveBeenCalled(); vi.advanceTimersByTime(60_000); expect(FakeSocket.instances).toHaveLength(1); client.close();
  });
});

import { createAccountCheckpointStore } from './realtime';
describe('P1 account/tab checkpoint scope', () => {
  afterEach(() => { sessionStorage.clear(); localStorage.clear(); });
  it('does not share cursors between accounts/organizations and ignores legacy receive-only cursors', () => {
    localStorage.setItem('wapphub-chat:realtime:lastEventId:org-1', '999');
    const first = createAccountCheckpointStore('user-1'); const second = createAccountCheckpointStore('user-2');
    expect(first.get('org-1')).toBeNull(); first.set('org-1', '9007199254740993');
    expect(first.get('org-1')).toBe('9007199254740993'); expect(first.get('org-2')).toBeNull(); expect(second.get('org-1')).toBeNull();
    first.set('org-1', 'invalid'); expect(first.get('org-1')).toBe('9007199254740993');
  });
});

describe('P1 replay pressure and policy close', () => {
  afterEach(() => { FakeSocket.instances = []; sessionStorage.clear(); vi.useRealTimers(); });
  it('drains a bounded burst before reconnecting, preserving progress in a large replay', async () => {
    vi.useFakeTimers(); const refresh = vi.fn();
    const client = new RealtimeClient({ url: 'ws://local.test', organizationId: 'org-1', lastEventId: '0', onEvent: refresh, checkpointStore: { get: () => null, set: vi.fn() }, WebSocketImpl: FakeSocket as unknown as typeof WebSocket, random: () => 0.5 });
    client.connect(); const socket = FakeSocket.instances[0]!;
    for (let i = 1; i <= 400; i += 1) {
      socket.onmessage?.({ data: JSON.stringify(event(String(i))) });
      if (i % 100 === 0) socket.onmessage?.({ data: JSON.stringify({ version: 1, type: 'sync.checkpoint', lastEventId: String(i), hasMore: i < 400 }) });
    }
    for (let i = 0; i < 2048; i += 1) await Promise.resolve();
    expect(client.lastEventId).toBe('200'); expect(refresh).toHaveBeenCalledTimes(254); expect(socket.close).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(500); expect(new URL(FakeSocket.instances[1]!.url).searchParams.get('lastEventId')).toBe('200'); client.close();
  });
  it('expires the local context on a policy close rather than replaying in an invalid session', () => {
    vi.useFakeTimers(); const expired = vi.fn();
    const client = new RealtimeClient({ url: 'ws://local.test', organizationId: 'org-1', onEvent: vi.fn(), onUnauthorized: expired, WebSocketImpl: FakeSocket as unknown as typeof WebSocket });
    client.connect(); const close = FakeSocket.instances[0]!.onclose as unknown as (event: { code: number }) => void;
    close({ code: 1008 }); expect(expired).toHaveBeenCalledTimes(1); vi.advanceTimersByTime(60_000); expect(FakeSocket.instances).toHaveLength(1);
  });
});
