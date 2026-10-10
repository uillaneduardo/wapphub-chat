import { afterEach, describe, expect, it, vi } from 'vitest';
import { setCsrfToken } from './api';
import { webProviderApi, type WebConnection } from './webProviderApi';
const connection: WebConnection = { id: '00000000-0000-4000-8000-000000000001', state: 'DISCONNECTED', uiState: 'DISCONNECTED', version: 7, qrRevision: 0, errorCode: null, lastCheckedAt: null, operation: null, sendingEnabled: false, mediaEnabled: false };
describe('Core-only WhatsApp Web API', () => {
  afterEach(() => { setCsrfToken(null); vi.unstubAllGlobals(); });
  it('uses existing Core credentials/CSRF with versioned commands and no internal service address', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(connection), { status: 200 })); vi.stubGlobal('fetch', fetch); setCsrfToken('session-csrf');
    await webProviderApi.command(connection, 'refresh', '00000000-0000-4000-8000-000000000002', new AbortController().signal);
    const [url, init] = fetch.mock.calls[0]!; expect(url).toContain(`/api/v1/providers/whatsapp-web/connections/${connection.id}/commands`); expect(url).not.toContain('/internal/');
    expect(init.credentials).toBe('include'); expect(init.headers.get('x-csrf-token')).toBe('session-csrf'); expect(JSON.parse(init.body)).toEqual({ action: 'refresh', commandId: '00000000-0000-4000-8000-000000000002', expectedVersion: 7 });
  });
  it('requests QR with no-store and propagates context cancellation', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ qr: 'SYNTHETIC', revision: 1, expiresAt: new Date().toISOString(), expiresInMs: 20000 }), { status: 200 })); vi.stubGlobal('fetch', fetch);
    const abort = new AbortController(); await webProviderApi.qr(connection.id, abort.signal); const [url, init] = fetch.mock.calls[0]!;
    expect(url).toContain('/api/v1/providers/whatsapp-web/connections/'); expect(init.cache).toBe('no-store'); expect(init.credentials).toBe('include');
    fetch.mockImplementation((_url, init) => new Promise((_resolve, reject) => { init.signal.addEventListener('abort', () => reject(new DOMException('Cancelled', 'AbortError')), { once: true }); }));
    const pending = webProviderApi.qr(connection.id, abort.signal); abort.abort();
    expect(fetch.mock.calls.at(-1)![1].signal.aborted).toBe(true); await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });
});
