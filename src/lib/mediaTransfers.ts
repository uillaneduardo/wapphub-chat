export interface MediaAsset { url: string; blob: boolean }
export interface MediaLease { ready: Promise<MediaAsset>; signal: AbortSignal; release: () => void; metadataReady: () => void }
interface Entry {
  key: string; bytes: number; refs: number; started: boolean; controller: AbortController;
  ready: Promise<MediaAsset>; resolve: (asset: MediaAsset) => void; reject: (reason: unknown) => void;
  load: (signal: AbortSignal) => Promise<MediaAsset>; metadata: boolean; retain: boolean; retained?: boolean; finishMetadata?: () => void; asset?: MediaAsset;
}
const cancelled = () => new DOMException('Media transfer cancelled', 'AbortError');
/** Owned by one mounted authorized conversation. No browser storage or idle cache. */
export class MediaTransfers {
  private entries = new Map<string, Entry>(); private queue: Entry[] = [];
  private active = 0; private bytes = 0; private retainedBytes = 0; private disposing = false;
  constructor(private readonly concurrency = 1, private readonly maximumBytes = 32 * 1024 * 1024) {}
  acquire(key: string, bytes: number, load: Entry['load'], metadata = false, retain = !metadata): MediaLease {
    let entry = this.entries.get(key);
    if (!entry) {
      let resolve!: Entry['resolve'], reject!: Entry['reject'];
      const ready = new Promise<MediaAsset>((done, fail) => { resolve = done; reject = fail; });
      entry = { key, bytes: Math.max(1, bytes), refs: 0, started: false, controller: new AbortController(), ready, resolve, reject, load, metadata, retain };
      this.entries.set(key, entry); this.queue.push(entry);
    }
    const current = entry; current.refs += 1; let released = false;
    this.pump();
    return { ready: current.ready, signal: current.controller.signal, metadataReady: () => current.finishMetadata?.(), release: () => {
      if (released) return; released = true;
      current.refs -= 1; if (current.refs === 0) this.remove(current);
    } };
  }
  private remove(entry: Entry) {
    if (entry.retained) { entry.retained = false; this.retainedBytes -= entry.bytes; }
    entry.controller.abort(); entry.reject(cancelled()); entry.finishMetadata?.();
    if (entry.asset?.blob) { URL.revokeObjectURL(entry.asset.url); entry.asset = undefined; }
    if (this.entries.get(entry.key) === entry) this.entries.delete(entry.key);
    this.queue = this.queue.filter(item => item !== entry); this.pump();
  }
  private pump() {
    if (this.disposing) return;
    for (const entry of [...this.queue]) {
      if (entry.started || entry.controller.signal.aborted) continue;
      if (entry.bytes > this.maximumBytes) { entry.reject(new Error('Media transfer budget exceeded')); this.remove(entry); continue; }
      if (this.active >= this.concurrency || this.bytes + entry.bytes > this.maximumBytes || entry.retain && this.retainedBytes + entry.bytes > this.maximumBytes) continue;
      this.queue = this.queue.filter(item => item !== entry); entry.started = true;
      this.active += 1; this.bytes += entry.bytes;
      if (entry.retain) { entry.retained = true; this.retainedBytes += entry.bytes; }
      void this.run(entry).finally(() => { this.active -= 1; this.bytes -= entry.bytes; this.pump(); });
    }
  }
  private async run(entry: Entry) {
    try {
      const asset = await entry.load(entry.controller.signal);
      if (entry.controller.signal.aborted) { if (asset.blob) URL.revokeObjectURL(asset.url); throw cancelled(); }
      entry.asset = asset; entry.resolve(asset);
      if (entry.metadata) await new Promise<void>(resolve => {
        const complete = () => { clearTimeout(timer); entry.controller.signal.removeEventListener('abort', complete); resolve(); };
        const timer = setTimeout(() => { entry.controller.abort(); complete(); }, 30_000);
        entry.finishMetadata = complete; entry.controller.signal.addEventListener('abort', complete, { once: true });
        if (entry.controller.signal.aborted) complete();
      });
    } catch (reason) { if (entry.retained) { entry.retained = false; this.retainedBytes -= entry.bytes; } entry.reject(reason); }
  }
  dispose() { this.disposing = true; for (const entry of [...this.entries.values()]) this.remove(entry); this.disposing = false; }
}
