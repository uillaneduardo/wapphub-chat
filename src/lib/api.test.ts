import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiRequest, ApiError } from './api';

describe('apiRequest', () => {
  afterEach(() => { vi.unstubAllGlobals(); });
  it('sends cookies and CSRF on mutations and parses JSON', async () => {
    Object.defineProperty(document, 'cookie', { configurable: true, value: 'wapphub_csrf=abc123' });
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 })); vi.stubGlobal('fetch', fetchMock);
    await expect(apiRequest<{ ok: boolean }>('/resource', { method: 'POST', body: '{}' })).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/api\/v1\/resource$/), expect.objectContaining({ credentials: 'include', headers: expect.any(Headers) }));
    expect((fetchMock.mock.calls[0]?.[1] as RequestInit).headers).toBeInstanceOf(Headers);
    expect(((fetchMock.mock.calls[0]?.[1] as RequestInit).headers as Headers).get('x-csrf-token')).toBe('abc123');
  });
  it.each([[401, 'unauthorized'], [403, 'forbidden'], [409, 'conflict'], [422, 'validation'], [429, 'rate_limit'], [503, 'server']] as const)('maps HTTP %i to %s', async (status, kind) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: 'TEST_ERROR', requestId: 'req-1' } }), { status })));
    await expect(apiRequest('/resource')).rejects.toMatchObject({ status, kind, code: 'TEST_ERROR', requestId: 'req-1' });
  });
  it('wraps network failures', async () => { vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline'))); await expect(apiRequest('/resource')).rejects.toBeInstanceOf(ApiError); });
});

describe('P1 bounded authorized reads', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
  it('aborts a timed-out bootstrap read with a controlled error', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_url, init: RequestInit) => new Promise((_resolve, reject) => init.signal!.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))))));
    const result = expect(apiRequest('/conversations')).rejects.toMatchObject({ status: 0, kind: 'network', message: 'A consulta excedeu o tempo limite.' });
    await vi.advanceTimersByTimeAsync(15_000); await result; expect(vi.getTimerCount()).toBe(0);
  });
  it('forwards teardown cancellation to fetch and removes its timeout', async () => {
    vi.useFakeTimers(); const controller = new AbortController(); let signal!: AbortSignal;
    vi.stubGlobal('fetch', vi.fn((_url, init: RequestInit) => { signal = init.signal!; return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))); }));
    const result = expect(apiRequest('/conversations', { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort(); await result; expect(signal.aborted).toBe(true); expect(vi.getTimerCount()).toBe(0);
  });
});
