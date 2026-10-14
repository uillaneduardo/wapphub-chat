import { afterEach, expect, it, vi } from 'vitest';
import { MediaTransfers, type MediaAsset } from './mediaTransfers';
const flush = async () => { for (let i = 0; i < 24; i++) await Promise.resolve(); };
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });
it('deduplicates mediaId and revokes the blob after the last reference', async () => {
  const revoke = vi.fn(); Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revoke });
  const pool = new MediaTransfers(), load = vi.fn(async () => ({ url: 'blob:shared', blob: true }));
  const first = pool.acquire('image:id', 4, load), second = pool.acquire('image:id', 4, load);
  expect(await first.ready).toEqual(await second.ready); expect(load).toHaveBeenCalledTimes(1);
  first.release(); expect(revoke).not.toHaveBeenCalled(); second.release(); expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:shared');
});
it('limits simultaneous requests and bytes retained, and releases queued cancellations', async () => {
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  const pool = new MediaTransfers(2, 10), completions: ((asset: MediaAsset) => void)[] = [];
  const load = vi.fn(() => new Promise<MediaAsset>(resolve => { completions.push(resolve); }));
  const first = pool.acquire('first', 6, load), second = pool.acquire('second', 6, load), third = pool.acquire('third', 1, load);
  void second.ready.catch(() => {}); await flush(); expect(load).toHaveBeenCalledTimes(2);
  second.release(); completions[0]!({ url: 'blob:first', blob: true }); completions[1]!({ url: 'blob:third', blob: true });
  await first.ready; await third.ready; await flush(); expect(load).toHaveBeenCalledTimes(2);
  const fourth = pool.acquire('fourth', 6, load); await flush(); expect(load).toHaveBeenCalledTimes(2);
  first.release(); await flush(); expect(load).toHaveBeenCalledTimes(3); completions[2]!({ url: 'blob:fourth', blob: true }); await fourth.ready;
  third.release(); fourth.release(); pool.dispose();
});
it('holds native metadata admission until completion and cancels it on tenant teardown', async () => {
  const pool = new MediaTransfers(1), load = vi.fn(async () => ({ url: '/authorized-media', blob: false }));
  const first = pool.acquire('audio', 1024, load, true), second = pool.acquire('video', 1024, load, true);
  void second.ready.catch(() => {}); await first.ready; await flush(); expect(load).toHaveBeenCalledTimes(1);
  first.metadataReady(); await second.ready; expect(load).toHaveBeenCalledTimes(2); pool.dispose();
  expect(first.signal.aborted).toBe(true); expect(second.signal.aborted).toBe(true);
});
it('aborts unnecessary downloads and rejects over-budget media without running the loader', async () => {
  const pool = new MediaTransfers(2, 10), load = vi.fn(() => new Promise<MediaAsset>(() => {}));
  const oversized = pool.acquire('large', 11, load); await expect(oversized.ready).rejects.toThrow('budget'); expect(load).not.toHaveBeenCalled();
  const pending = pool.acquire('image', 5, load); const rejected = expect(pending.ready).rejects.toMatchObject({ name: 'AbortError' }); pending.release(); await rejected; expect(pending.signal.aborted).toBe(true); pool.dispose();
});
