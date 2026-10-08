import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiRequest, ApiError } from './api';

describe('apiRequest', () => {
  afterEach(() => { vi.unstubAllGlobals(); });
  it('sends cookies and CSRF on mutations and parses JSON', async () => {
    Object.defineProperty(document, 'cookie', { configurable: true, value: 'csrf_token=abc123' });
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 })); vi.stubGlobal('fetch', fetchMock);
    await expect(apiRequest<{ ok: boolean }>('/resource', { method: 'POST', body: '{}' })).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/resource$/), expect.objectContaining({ credentials: 'include', headers: expect.any(Headers) }));
    expect((fetchMock.mock.calls[0]?.[1] as RequestInit).headers).toBeInstanceOf(Headers);
    expect(((fetchMock.mock.calls[0]?.[1] as RequestInit).headers as Headers).get('X-CSRF-Token')).toBe('abc123');
  });
  it.each([[401, 'unauthorized'], [403, 'forbidden'], [409, 'conflict'], [422, 'validation'], [429, 'rate_limit'], [503, 'server']] as const)('maps HTTP %i to %s', async (status, kind) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status })));
    await expect(apiRequest('/resource')).rejects.toMatchObject({ status, kind });
  });
  it('wraps network failures', async () => { vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline'))); await expect(apiRequest('/resource')).rejects.toBeInstanceOf(ApiError); });
});
