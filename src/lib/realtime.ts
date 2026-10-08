export interface RealtimeEvent<T = unknown> { id: string; type: string; data: T }
export interface RealtimeOptions { url: string; lastEventId?: string; onEvent: (event: RealtimeEvent) => void; onState?: (state: 'connecting' | 'open' | 'reconnecting' | 'closed') => void; WebSocketImpl?: typeof WebSocket; random?: () => number; setTimer?: typeof setTimeout; clearTimer?: typeof clearTimeout }

export class RealtimeClient {
  private socket?: WebSocket;
  private timer?: ReturnType<typeof setTimeout>;
  private attempts = 0;
  private closed = false;
  private checkpoint?: string;
  private readonly seen = new Set<string>();
  private readonly Socket: typeof WebSocket;
  private readonly random: () => number;
  private readonly setTimer: typeof setTimeout;
  private readonly clearTimer: typeof clearTimeout;
  constructor(private readonly options: RealtimeOptions) {
    this.checkpoint = options.lastEventId; this.Socket = options.WebSocketImpl ?? WebSocket; this.random = options.random ?? Math.random;
    this.setTimer = options.setTimer ?? setTimeout; this.clearTimer = options.clearTimer ?? clearTimeout;
  }
  get lastEventId(): string | undefined { return this.checkpoint; }
  connect(): void { if (this.closed) return; this.options.onState?.(this.attempts ? 'reconnecting' : 'connecting');
    const url = new URL(this.options.url); if (this.checkpoint) url.searchParams.set('lastEventId', this.checkpoint);
    const socket = this.socket = new this.Socket(url.toString());
    socket.onopen = () => { this.attempts = 0; this.options.onState?.('open'); };
    socket.onmessage = (message) => { try { const event = JSON.parse(String(message.data)) as RealtimeEvent; if (!event.id || this.seen.has(event.id)) return; this.seen.add(event.id); this.checkpoint = event.id; this.options.onEvent(event); } catch { /* Ignore malformed frames. */ } };
    socket.onclose = () => { if (!this.closed) this.scheduleReconnect(); };
    socket.onerror = () => socket.close();
  }
  private scheduleReconnect(): void {
    this.attempts += 1; this.options.onState?.('reconnecting');
    const base = Math.min(30_000, 500 * 2 ** Math.min(this.attempts - 1, 6));
    this.timer = this.setTimer(() => this.connect(), Math.round(base * (0.8 + this.random() * 0.4)));
  }
  close(): void { this.closed = true; if (this.timer) this.clearTimer(this.timer); this.socket?.close(); this.options.onState?.('closed'); }
}
