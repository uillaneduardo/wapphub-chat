import type { ChatEvent } from '../types/chat';

export type RealtimeListener = (event: ChatEvent, signal: AbortSignal) => void | Promise<void>;
interface Subscription {
  listener: RealtimeListener;
  reconcile?: (signal: AbortSignal) => void | Promise<void>;
  organizationId?: string;
  active: boolean;
  requests: Set<AbortController>;
}
const listeners = new Set<Subscription>();
let queue: Promise<void> = Promise.resolve();

async function run(subscription: Subscription, task: (signal: AbortSignal) => void | Promise<void>, parent?: AbortSignal): Promise<void> {
  if (!subscription.active || parent?.aborted) return;
  const controller = new AbortController();
  subscription.requests.add(controller);
  let timeout = false;
  const abort = () => controller.abort();
  parent?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(() => { timeout = true; controller.abort(); }, 10_000);
  try {
    await new Promise<void>((resolve, reject) => {
      controller.signal.addEventListener('abort', () => timeout ? reject(new Error('Realtime REST timeout')) : resolve(), { once: true });
      Promise.resolve().then(() => { if (!controller.signal.aborted) return task(controller.signal); }).then(resolve, reject);
    });
  } finally {
    clearTimeout(timer);
    parent?.removeEventListener('abort', abort);
    subscription.requests.delete(controller);
  }
}
function enqueue(subscriptions: Subscription[], task: (subscription: Subscription) => Promise<void>): Promise<void> {
  const delivery = queue.then(async () => {
    const results = await Promise.allSettled(subscriptions.map(task));
    const failure = results.find((result) => result.status === 'rejected');
    if (failure?.status === 'rejected') throw failure.reason;
  });
  queue = delivery.catch(() => undefined);
  return delivery;
}

export const realtimeBus = {
  // Only active projections retain data. Unmounted views bootstrap through REST on mount.
  emit(event: ChatEvent, signal?: AbortSignal): Promise<void> {
    return enqueue([...listeners].filter((s) => !s.organizationId || s.organizationId === event.organizationId), (s) => run(s, (current) => s.listener(event, current), signal));
  },
  reconcile(organizationId: string, signal?: AbortSignal): Promise<void> {
    return enqueue([...listeners].filter((s) => !s.organizationId || s.organizationId === organizationId), (s) => run(s, (current) => s.reconcile?.(current), signal));
  },
  subscribe(listener: RealtimeListener, options: { organizationId?: string; reconcile?: Subscription['reconcile'] } = {}): () => void {
    const subscription: Subscription = { listener, ...options, active: true, requests: new Set() };
    listeners.add(subscription);
    return () => { subscription.active = false; listeners.delete(subscription); subscription.requests.forEach((request) => request.abort()); };
  },
};
