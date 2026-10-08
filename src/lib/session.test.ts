import { afterEach, describe, expect, it, vi } from 'vitest';
import { sessionApi } from './session';

const user = { id: 'user-1', name: 'Lia', email: 'lia@example.com' };
const org = { id: 'org-1', name: 'Loja' };
describe('Core session contract', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('uses the Core auth paths, composes current context, and sends its CSRF token', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), 'http://localhost');
      if (url.pathname.endsWith('/auth/login')) return new Response(JSON.stringify({ user, csrfToken: 'csrf-1' }), { status: 200 });
      if (url.pathname.endsWith('/me/organizations')) return new Response(JSON.stringify({ organizations: [org] }), { status: 200 });
      if (url.pathname.endsWith('/me')) return new Response(JSON.stringify({ user, currentOrganizationId: 'org-1', csrfToken: 'csrf-1' }), { status: 200 });
      if (url.pathname.endsWith('/app/bootstrap')) return new Response(JSON.stringify({ user, organization: org, membership: { id: 'membership-1', role: 'OWNER', consumesSeat: true }, permissions: ['conversations.read'] }), { status: 200 });
      if (url.pathname.endsWith('/session/organization')) return new Response(JSON.stringify({ organization: org, membership: { id: 'membership-1', role: 'OWNER', consumesSeat: true }, permissions: ['conversations.read'] }), { status: 200 });
      throw new Error(`Unexpected request ${url.pathname} ${init?.method}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    const session = await sessionApi.login('lia@example.com', 'secret');
    expect(session.currentOrganizationId).toBe('org-1'); expect(session.permissions).toEqual(['conversations.read']);
    const context = await sessionApi.selectOrganization('org-1');
    const loginCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/api/v1/auth/login'))!;
    const selectCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/api/v1/session/organization'))!;
    expect(loginCall[1]).toMatchObject({ method: 'POST', credentials: 'include' });
    expect(selectCall[1]?.body).toBe(JSON.stringify({ organizationId: 'org-1' }));
    expect((selectCall[1]?.headers as Headers).get('x-csrf-token')).toBe('csrf-1');
    expect(context.organization).toEqual(org);
  });
});
