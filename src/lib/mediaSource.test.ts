import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiMediaSource, ApiError } from './api';
describe('authenticated native media source', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('probes one byte with cookies and returns only the public Core route', async () => {
    const cancel = vi.fn(), fetch = vi.fn().mockResolvedValue(new Response(new ReadableStream({ cancel }), { status: 206, headers: { 'content-range': 'bytes 0-0/2048' } })); vi.stubGlobal('fetch', fetch);
    const source = await apiMediaSource('/conversations/a/messages/b/media'); expect(source).toBe('/api/v1/conversations/a/messages/b/media'); expect(source).not.toMatch(/token|internal|provider/i);
    const [,init] = fetch.mock.calls[0]; expect(init.credentials).toBe('include'); expect(init.headers.get('Range')).toBe('bytes=0-0'); expect(cancel).toHaveBeenCalled();
  });
  it('keeps session and permission failures distinct', async () => {
    for (const status of [401,403,404,410,416,503]) {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: 'MEDIA_UNAVAILABLE' } }), { status })));
      await expect(apiMediaSource('/conversations/a/messages/b/media')).rejects.toMatchObject({ status });
    }
  });
  it('rejects a server that ignores Range and cancels its body', async () => {
    const cancel = vi.fn(); vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(new ReadableStream({ cancel }), { status: 200 })));
    await expect(apiMediaSource('/conversations/a/messages/b/media')).rejects.toBeInstanceOf(ApiError); expect(cancel).toHaveBeenCalled();
  });
});
