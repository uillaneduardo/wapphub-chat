import type { ChatEvent, SyncCheckpoint } from '../types/chat';

export type RealtimeFrame = ChatEvent | SyncCheckpoint;
export interface RealtimeOptions {
  url: string;
  organizationId: string;
  lastEventId?: string;
  checkpointStore?: { get: (organizationId: string) => string | null; set: (organizationId: string, eventId: string) => void };
  onEvent: (event: ChatEvent, signal: AbortSignal) => void | Promise<void>;
  onReconcile?: (signal: AbortSignal) => void | Promise<void>;
  onUnauthorized?: () => void;
  onPermissionsChanged?: () => void;
  onCheckpoint?: (checkpoint: SyncCheckpoint) => void | Promise<void>;
  onState?: (state: 'connecting' | 'open' | 'reconnecting' | 'stale' | 'closed') => void;
  WebSocketImpl?: typeof WebSocket;
  random?: () => number;
  setTimer?: typeof setTimeout;
  clearTimer?: typeof clearTimeout;
}

const checkpointKey = (organizationId: string) => `wapphub-chat:realtime:applied:v2:${organizationId}`;
// Scope keys passed by AppShell include user + organization. Legacy receive-only cursors are ignored.
export const realtimeCheckpointStore = {
  get(organizationId: string): string | null {
    try { const value = globalThis.sessionStorage?.getItem(checkpointKey(organizationId)) ?? null; return value && /^(0|[1-9]\d{0,18})$/.test(value) ? value : null; } catch { return null; }
  },
  set(organizationId: string, eventId: string): void {
    if (!/^(0|[1-9]\d{0,18})$/.test(eventId)) return;
    try { globalThis.sessionStorage?.setItem(checkpointKey(organizationId), eventId); } catch { /* Storage can be unavailable; keep the live checkpoint in memory. */ }
  },
};

export function createAccountCheckpointStore(userId: string) {
  return {
    get: (organizationId: string) => realtimeCheckpointStore.get(`${userId}:${organizationId}`),
    set: (organizationId: string, eventId: string) => realtimeCheckpointStore.set(`${userId}:${organizationId}`, eventId),
  };
}

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
  const eventTypes = ['conversation.created', 'conversation.updated', 'conversation.archived', 'conversation.assigned', 'conversation.transferred', 'message.created', 'message.updated', 'note.created', 'tag.created', 'tag.updated', 'tag.deleted', 'conversation.tag.added', 'conversation.tag.removed', 'provider.connection.updated'];
  return typeof frame === 'object' && frame !== null && 'version' in frame && frame.version === 1 && 'eventId' in frame && typeof frame.eventId === 'string' && /^(0|[1-9]\d{0,18})$/.test(frame.eventId) && 'organizationId' in frame && typeof frame.organizationId === 'string' && 'entityId' in frame && typeof frame.entityId === 'string' && 'occurredAt' in frame && typeof frame.occurredAt === 'string' && 'type' in frame && typeof frame.type === 'string' && eventTypes.includes(frame.type) && 'payload' in frame && typeof frame.payload === 'object' && frame.payload !== null && 'resourceId' in frame.payload && typeof frame.payload.resourceId === 'string' && (!('conversationId' in frame.payload) || typeof frame.payload.conversationId === 'string');
}

export class RealtimeClient {
  private socket?: WebSocket;
  private timer?: ReturnType<typeof setTimeout>;
  private attempts = 0;
  private closed = false;
  private generation = 0;
  private controller?: AbortController;
  private checkpoint: string;
  private readonly seen = new Set<string>();
  private queue: Promise<void> = Promise.resolve();
  private readonly Socket: typeof WebSocket;
  private readonly random: () => number;
  private readonly setTimer: typeof setTimeout;
  private readonly clearTimer: typeof clearTimeout;
  constructor(private readonly options: RealtimeOptions) {
    this.checkpoint = options.lastEventId ?? (options.checkpointStore ?? realtimeCheckpointStore).get(options.organizationId) ?? '0';
    this.Socket = options.WebSocketImpl ?? WebSocket; this.random = options.random ?? Math.random;
    this.setTimer = options.setTimer ?? setTimeout; this.clearTimer = options.clearTimer ?? clearTimeout;
  }
  get lastEventId(): string { return this.checkpoint; }
  retry(): void {
    if (this.closed) return;
    this.attempts = 0;
    if (this.timer) this.clearTimer(this.timer);
    this.timer = undefined;
    this.socket?.close();
    this.connect();
  }
  connect(): void {
    if (this.closed) return;
    if (this.timer) this.clearTimer(this.timer);
    this.timer = undefined;
    this.controller?.abort();
    const generation = ++this.generation;
    const controller = this.controller = new AbortController();
    this.queue = Promise.resolve();
    let queued = 0;
    let reconciled = false;
    let failed = false;
    let overflow = false;
    const current = () => !this.closed && generation === this.generation && !controller.signal.aborted;
    this.options.onState?.(this.attempts ? 'reconnecting' : 'connecting');
    const url = new URL(this.options.url); url.searchParams.set('lastEventId', this.checkpoint);
    const socket = this.socket = new this.Socket(url.toString());
    socket.onmessage = (message) => {
      if (!current() || failed || overflow) return;
      // Drain accepted frames before reconnecting: immediate abort could starve a large replay.
      if (queued >= 256) { overflow = true; return; }
      queued += 1;
      this.queue = this.queue.then(async () => {
        if (!current() || failed) return;
        let frame: unknown;
        try { frame = JSON.parse(String(message.data)) as unknown; } catch { return; }
        if (isCheckpoint(frame)) {
          // A page scan cursor is not an applied-state cursor until all REST work succeeds.
          if (!reconciled && !frame.hasMore) {
            await this.options.onReconcile?.(controller.signal);
            if (!current()) return;
            reconciled = true;
          }
          await this.options.onCheckpoint?.(frame);
          if (!current()) return;
          const advanced = BigInt(frame.lastEventId) > BigInt(this.checkpoint);
          if (BigInt(frame.lastEventId) >= BigInt(this.checkpoint)) {
            (this.options.checkpointStore ?? realtimeCheckpointStore).set(this.options.organizationId, frame.lastEventId);
            this.checkpoint = frame.lastEventId;
            for (const id of this.seen) if (BigInt(id) <= BigInt(this.checkpoint)) this.seen.delete(id);
          }
          if (advanced || reconciled) this.attempts = 0;
          if (reconciled) this.options.onState?.('open');
        } else if (isChatEvent(frame) && frame.organizationId === this.options.organizationId && BigInt(frame.eventId) > BigInt(this.checkpoint) && !this.seen.has(frame.eventId)) {
          await this.options.onEvent(frame, controller.signal);
          if (current()) this.seen.add(frame.eventId);
        }
      }).catch((reason: unknown) => {
        if (!current() || failed) return;
        failed = true;
        if (reason && typeof reason === 'object' && 'status' in reason && reason.status === 401) {
          this.close(); this.options.onUnauthorized?.();
        } else socket.close();
      }).finally(() => { queued -= 1; if (queued === 0 && overflow && current()) socket.close(); });
    };
    socket.onclose = (event) => {
      if (!current()) return;
      controller.abort();
      // A policy close needs a fresh authenticated context, not unlimited retry.
      if (event?.code === 4003) { this.close(); this.options.onPermissionsChanged?.(); return; }
      if (event?.code === 1008) { this.close(); this.options.onUnauthorized?.(); return; }
      this.scheduleReconnect();
    };
    socket.onerror = () => { if (current()) socket.close(); };
  }
  private scheduleReconnect(): void {
    this.attempts += 1;
    if (this.attempts > 8) { this.options.onState?.('stale'); return; }
    this.options.onState?.('reconnecting');
    const base = Math.min(30_000, 500 * 2 ** Math.min(this.attempts - 1, 6));
    this.timer = this.setTimer(() => this.connect(), Math.round(base * (0.8 + this.random() * 0.4)));
  }
  close(): void {
    if (this.closed) return;
    this.closed = true; this.generation += 1; this.controller?.abort();
    if (this.timer) this.clearTimer(this.timer);
    this.timer = undefined; this.socket?.close(); this.seen.clear(); this.options.onState?.('closed');
  }
}
