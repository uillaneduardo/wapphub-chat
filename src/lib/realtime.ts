import type { ChatEvent, SyncCheckpoint } from '../types/chat';

export type RealtimeFrame = ChatEvent | SyncCheckpoint;
export interface RealtimeOptions {
  url: string;
  organizationId: string;
  lastEventId?: string;
  checkpointStore?: { get: (organizationId: string) => string | null; set: (organizationId: string, eventId: string) => void };
  onEvent: (event: ChatEvent) => void | Promise<void>;
  onCheckpoint?: (checkpoint: SyncCheckpoint) => void | Promise<void>;
  onState?: (state: 'connecting' | 'open' | 'reconnecting' | 'closed') => void;
  WebSocketImpl?: typeof WebSocket;
  random?: () => number;
  setTimer?: typeof setTimeout;
  clearTimer?: typeof clearTimeout;
}

const checkpointKey = (organizationId: string) => `wapphub-chat:realtime:lastEventId:${organizationId}`;
export const realtimeCheckpointStore = {
  get(organizationId: string): string | null {
    try { const value = globalThis.localStorage?.getItem(checkpointKey(organizationId)) ?? null; return value && /^(0|[1-9]\d{0,18})$/.test(value) ? value : null; } catch { return null; }
  },
  set(organizationId: string, eventId: string): void {
    if (!/^(0|[1-9]\d{0,18})$/.test(eventId)) return;
    try { globalThis.localStorage?.setItem(checkpointKey(organizationId), eventId); } catch { /* Storage can be unavailable; keep the live checkpoint in memory. */ }
  },
};

export function createRealtimeUrl(apiBaseUrl: string, lastEventId = '0'): string {
  const url = new URL('/api/v1/realtime', apiBaseUrl);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.searchParams.set('lastEventId', lastEventId);
  return url.toString();
}

function isCheckpoint(frame: unknown): frame is SyncCheckpoint {
  return typeof frame === 'object' && frame !== null && 'type' in frame && frame.type === 'sync.checkpoint' && 'version' in frame && frame.version === 1 && 'lastEventId' in frame && typeof frame.lastEventId === 'string' && /^(0|[1-9]\d{0,18})$/.test(frame.lastEventId) && 'hasMore' in frame && typeof frame.hasMore === 'boolean';
}
function isChatEvent(frame: unknown): frame is ChatEvent {
  const eventTypes = ['conversation.created', 'conversation.updated', 'conversation.archived', 'conversation.assigned', 'conversation.transferred', 'message.created', 'message.updated', 'note.created', 'tag.created', 'tag.updated', 'tag.deleted', 'conversation.tag.added', 'conversation.tag.removed'];
  return typeof frame === 'object' && frame !== null && 'version' in frame && frame.version === 1 && 'eventId' in frame && typeof frame.eventId === 'string' && /^(0|[1-9]\d{0,18})$/.test(frame.eventId) && 'organizationId' in frame && typeof frame.organizationId === 'string' && 'entityId' in frame && typeof frame.entityId === 'string' && 'occurredAt' in frame && typeof frame.occurredAt === 'string' && 'type' in frame && typeof frame.type === 'string' && eventTypes.includes(frame.type) && 'payload' in frame && typeof frame.payload === 'object' && frame.payload !== null && 'resourceId' in frame.payload && typeof frame.payload.resourceId === 'string' && (!('conversationId' in frame.payload) || typeof frame.payload.conversationId === 'string');
}

export class RealtimeClient {
  private socket?: WebSocket;
  private timer?: ReturnType<typeof setTimeout>;
  private attempts = 0;
  private closed = false;
  private failed = false;
  private checkpoint: string;
  private readonly seen = new Set<string>();
  private queue: Promise<void> = Promise.resolve();
  private readonly Socket: typeof WebSocket;
  private readonly random: () => number;
  private readonly setTimer: typeof setTimeout;
  private readonly clearTimer: typeof clearTimeout;
  constructor(private readonly options: RealtimeOptions) {
    this.checkpoint = options.lastEventId ?? (options.checkpointStore ? options.checkpointStore.get(options.organizationId) : realtimeCheckpointStore.get(options.organizationId)) ?? '0'; this.Socket = options.WebSocketImpl ?? WebSocket; this.random = options.random ?? Math.random;
    this.setTimer = options.setTimer ?? setTimeout; this.clearTimer = options.clearTimer ?? clearTimeout;
  }
  get lastEventId(): string { return this.checkpoint; }
  connect(): void {
    if (this.closed) return;
    this.failed = false;
    this.options.onState?.(this.attempts ? 'reconnecting' : 'connecting');
    const url = new URL(this.options.url); url.searchParams.set('lastEventId', this.checkpoint);
    const socket = this.socket = new this.Socket(url.toString());
    socket.onopen = () => { this.attempts = 0; this.options.onState?.('open'); };
    socket.onmessage = (message) => { this.queue = this.queue.then(() => this.handleFrame(String(message.data))).catch(() => { this.failed = true; socket.close(); }); };
    socket.onclose = () => { if (!this.closed) this.scheduleReconnect(); };
    socket.onerror = () => socket.close();
  }
  private async handleFrame(data: string): Promise<void> {
    if (this.failed) return;
    let frame: unknown;
    try { frame = JSON.parse(data) as unknown; } catch { return; }
    if (isCheckpoint(frame)) {
      await this.options.onCheckpoint?.(frame);
      (this.options.checkpointStore ?? realtimeCheckpointStore).set(this.options.organizationId, frame.lastEventId);
      this.checkpoint = frame.lastEventId;
      return;
    }
    if (!isChatEvent(frame) || frame.organizationId !== this.options.organizationId || this.seen.has(frame.eventId)) return;
    await this.options.onEvent(frame);
    this.seen.add(frame.eventId);
  }
  private scheduleReconnect(): void {
    this.attempts += 1; this.options.onState?.('reconnecting');
    const base = Math.min(30_000, 500 * 2 ** Math.min(this.attempts - 1, 6));
    this.timer = this.setTimer(() => this.connect(), Math.round(base * (0.8 + this.random() * 0.4)));
  }
  close(): void { this.closed = true; if (this.timer) this.clearTimer(this.timer); this.socket?.close(); this.options.onState?.('closed'); }
}
