import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from './AppShell';
import { SessionProvider, useSession } from '../features/session/SessionContext';
import { RequireSession } from '../routes/Guards';
import { InboxList } from '../features/conversations/InboxList';
import { sessionApi } from '../lib/session';
import { chatApi } from '../lib/chatApi';
import type { Conversation, CursorPage } from '../types/chat';
import type { Session } from '../types/auth';

class Socket {
  static instances: Socket[] = [];
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  close = vi.fn(() => this.onclose?.());
  constructor(public url: string) { Socket.instances.push(this); }
}
const session: Session = { user: { id: 'user-1', name: 'Ana', email: 'ana@example.test' }, organization: { id: 'org-1', name: 'Org 1' }, organizations: [{ id: 'org-1', name: 'Org 1' }, { id: 'org-2', name: 'Org 2' }], currentOrganizationId: 'org-1', membership: { id: 'membership-1', role: 'AGENT', consumesSeat: true }, permissions: ['conversations.read', 'messages.read'] };
const row: Conversation = { id: 'c-1', contactId: 'contact-1', contactName: 'Contato', lastMessagePreview: 'Prévia da org 1', tagIds: [], provider: 'DEMO', status: 'OPEN', assignedUserId: 'user-1', archivedAt: null, visibility: 'FULL', createdAt: '2026-10-08T00:00:00Z', updatedAt: '2026-10-08T00:00:00Z', lastMessageAt: '2026-10-08T00:00:00Z' };
function Page() { const { selectOrganization } = useSession(); return <><button onClick={() => void selectOrganization('org-2')}>Trocar contexto sintético</button><InboxList /></>; }
function mount() {
  vi.stubGlobal('WebSocket', Socket); vi.spyOn(sessionApi, 'current').mockResolvedValue(session); vi.spyOn(chatApi, 'listConversations').mockResolvedValue({ items: [row], nextCursor: null });
  return render(<SessionProvider><MemoryRouter initialEntries={['/app/conversations']}><Routes><Route path="/login" element={<p>Login sintético</p>} /><Route element={<RequireSession />}><Route path="/app" element={<AppShell />}><Route path="conversations" element={<Page />} /></Route></Route></Routes></MemoryRouter></SessionProvider>);
}
function event() { Socket.instances[0]!.onmessage?.({ data: JSON.stringify({ version: 1, eventId: '1', organizationId: 'org-1', type: 'conversation.updated', entityId: 'c-1', occurredAt: '2026-10-08T00:00:00Z', payload: { resourceId: 'c-1' } }) }); Socket.instances[0]!.onmessage?.({ data: JSON.stringify({ version: 1, type: 'sync.checkpoint', lastEventId: '1', hasMore: false }) }); }

describe('P1 session + shell teardown', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); sessionStorage.clear(); Socket.instances = []; });
  it('aborts reconciliation at logout initiation and preserves the actual server logout', async () => {
    let finish!: (value: Conversation) => void; let signal!: AbortSignal; let endLogout!: () => void;
    vi.spyOn(chatApi, 'getConversation').mockImplementation((_id, current) => { signal = current!; return new Promise((resolve) => { finish = resolve; }); });
    const logout = vi.spyOn(sessionApi, 'logout').mockImplementation(() => new Promise((resolve) => { endLogout = resolve; }));
    mount(); await screen.findByText('Prévia da org 1'); act(event); await waitFor(() => expect(finish).toBeTypeOf('function'));
    fireEvent.click(screen.getByRole('button', { name: 'Sair da conta' }));
    expect(logout).toHaveBeenCalledTimes(1); await waitFor(() => expect(signal.aborted).toBe(true));
    expect(Socket.instances[0]!.close).toHaveBeenCalledTimes(1); expect(sessionStorage.length).toBe(0);
    await act(async () => { finish({ ...row, lastMessagePreview: 'Resposta antiga' }); endLogout(); });
    await screen.findByText('Login sintético'); expect(screen.queryByText('Resposta antiga')).not.toBeInTheDocument();
  });
  it('isolates organization changes with an old REST response still pending', async () => {
    let finish!: (value: Conversation) => void; let signal!: AbortSignal;
    vi.spyOn(chatApi, 'getConversation').mockImplementation((_id, current) => { signal = current!; return new Promise((resolve) => { finish = resolve; }); });
    vi.spyOn(sessionApi, 'selectOrganization').mockResolvedValue({ organization: { id: 'org-2', name: 'Org 2' }, membership: session.membership!, permissions: session.permissions });
    mount(); await screen.findByText('Prévia da org 1'); act(event); await waitFor(() => expect(finish).toBeTypeOf('function'));
    vi.mocked(chatApi.listConversations).mockResolvedValue({ items: [{ ...row, lastMessagePreview: 'Prévia da org 2' }], nextCursor: null } as CursorPage<Conversation>);
    fireEvent.click(screen.getByRole('button', { name: 'Trocar contexto sintético' })); await screen.findByText('Prévia da org 2');
    expect(signal.aborted).toBe(true); expect(Socket.instances).toHaveLength(2); expect(Socket.instances[0]!.close).toHaveBeenCalledTimes(1);
    await act(async () => finish({ ...row, lastMessagePreview: 'Resposta antiga de outra org' }));
    expect(screen.queryByText('Resposta antiga de outra org')).not.toBeInTheDocument(); expect(sessionStorage.length).toBe(0);
  });
  it('removes the protected shell when reconciliation detects an expired session', async () => {
    vi.spyOn(chatApi, 'getConversation').mockRejectedValue({ status: 401 }); mount(); await screen.findByText('Prévia da org 1'); act(event);
    await screen.findByText('Login sintético'); expect(Socket.instances[0]!.close).toHaveBeenCalledTimes(1); expect(sessionStorage.length).toBe(0);
  });
});
