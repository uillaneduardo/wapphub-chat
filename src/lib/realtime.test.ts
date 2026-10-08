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
