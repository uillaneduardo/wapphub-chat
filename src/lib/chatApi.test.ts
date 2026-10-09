import { afterEach, describe, expect, it, vi } from 'vitest';
import { chatApi } from './chatApi';

describe('chat API Core paths', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('encodes inbox filters, tag filters, and cursor parameters', async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ items: [], nextCursor: null }), { status: 200 }))); vi.stubGlobal('fetch', fetchMock);
    await chatApi.listConversations({ scope: 'all', archived: true, tagId: 'tag-1', cursor: 'signed-cursor', limit: 50 });
    const url = new URL(String(fetchMock.mock.calls[0]?.[0]), 'https://test.local');
    expect(url.pathname).toBe('/api/v1/conversations'); expect(Object.fromEntries(url.searchParams)).toEqual({ scope: 'all', archived: 'true', tagId: 'tag-1', cursor: 'signed-cursor', limit: '50' });
  });
  it('uses Core message cursor semantics and the stable clientMessageId mutation body', async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ items: [], nextCursor: null }), { status: 200 }))); vi.stubGlobal('fetch', fetchMock);
    await chatApi.listMessages('conv/1', 'signed-before'); await chatApi.sendMessage('conv/1', { body: 'Olá', clientMessageId: 'stable-id' });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/api/v1/conversations/conv%2F1/messages?limit=50&before=signed-before');
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('/api/v1/conversations/conv%2F1/messages');
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: 'POST', body: JSON.stringify({ body: 'Olá', clientMessageId: 'stable-id' }), credentials: 'include' });
  });
  it('loads the tenant-scoped assignment roster with cursor pagination', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: [], nextCursor: null }), { status: 200 })); vi.stubGlobal('fetch', fetchMock);
    await chatApi.listTeamMembers('signed-cursor');
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('/api/v1/team/members?limit=100&cursor=signed-cursor');
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ credentials: 'include' });
  });
});

describe('M1 contacts and internal create contracts', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('uses only supported contact fields/search/cursors and the explicit safe reuse option', async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ items: [], nextCursor: null }), { status: 200 }))); vi.stubGlobal('fetch', fetchMock);
    await chatApi.listContacts({ q: 'Ana & +55', cursor: 'signed' }); await chatApi.createContact({ name: 'Ana', primaryIdentifier: 'id' }); await chatApi.updateContact('id/1', { name: 'Bia' }); await chatApi.createConversation('contact-1');
    const url = new URL(String(fetchMock.mock.calls[0]?.[0]), 'https://test.local'); expect(Object.fromEntries(url.searchParams)).toEqual({ q: 'Ana & +55', cursor: 'signed', limit: '50' });
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: 'POST', body: JSON.stringify({ name: 'Ana', primaryIdentifier: 'id' }) }); expect(String(fetchMock.mock.calls[2]?.[0])).toContain('/contacts/id%2F1'); expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({ method: 'PATCH', body: JSON.stringify({ name: 'Bia' }) }); expect(fetchMock.mock.calls[3]?.[1]).toMatchObject({ method: 'POST', body: JSON.stringify({ contactId: 'contact-1', reuseExisting: true }) });
  });
});
