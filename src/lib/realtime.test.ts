import { afterEach, describe, expect, it, vi } from 'vitest';
import { RealtimeClient } from './realtime';

class FakeSocket {
  static instances: FakeSocket[] = []; onopen: (() => void) | null = null; onclose: (() => void) | null = null; onerror: (() => void) | null = null; onmessage: ((event: { data: string }) => void) | null = null;
  url: string; close = vi.fn(() => this.onclose?.());
  constructor(url: string) { this.url = url; FakeSocket.instances.push(this); }
}
describe('RealtimeClient', () => {
  afterEach(() => { FakeSocket.instances = []; vi.useRealTimers(); });
  it('reconnects with backoff and resumes from last event checkpoint', () => {
    vi.useFakeTimers(); const events = vi.fn(); const client = new RealtimeClient({ url: 'wss://example.test/events', onEvent: events, WebSocketImpl: FakeSocket as unknown as typeof WebSocket, random: () => 0.5 });
    client.connect(); const first = FakeSocket.instances[0]!; first.onopen?.(); first.onmessage?.({ data: JSON.stringify({ id: 'evt-1', type: 'message', data: {} }) });
    first.onmessage?.({ data: JSON.stringify({ id: 'evt-1', type: 'message', data: {} }) }); expect(events).toHaveBeenCalledTimes(1); expect(client.lastEventId).toBe('evt-1');
    first.onclose?.(); expect(FakeSocket.instances).toHaveLength(1); vi.advanceTimersByTime(500); expect(FakeSocket.instances).toHaveLength(2);
    expect(new URL(FakeSocket.instances[1]!.url).searchParams.get('lastEventId')).toBe('evt-1'); client.close();
  });
});
