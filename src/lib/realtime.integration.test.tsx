import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { InboxList } from '../features/conversations/InboxList';
import { ConversationView } from '../features/conversations/Conversations';
import { DemoSimulatorPage } from '../features/providers/Providers';
import { RealtimeClient } from './realtime';
import { realtimeBus } from './realtimeBus';
import { chatApi } from './chatApi';
import type { Conversation, CursorPage, InternalTextMessage } from '../types/chat';

const state = vi.hoisted(() => ({ session: { user: { id: 'user-1', name: 'Ana', email: 'ana@example.test' }, currentOrganizationId: 'org-1', permissions: ['conversations.read', 'messages.read', 'messages.send', 'providers.simulate'] } }));
vi.mock('../features/session/SessionContext', () => ({ useSession: () => state }));
const conversation: Conversation = { id: 'c-1', contactId: 'contact-1', contactName: 'Contato sintético', lastMessagePreview: 'Prévia inicial', provider: 'DEMO', tagIds: [], status: 'OPEN', assignedUserId: 'user-1', archivedAt: null, createdAt: '2026-10-08T00:00:00Z', updatedAt: '2026-10-08T00:00:00Z', lastMessageAt: '2026-10-08T00:00:00Z', visibility: 'FULL' };
const message = (body: string, id = body): InternalTextMessage => ({ id, conversationId: 'c-1', senderUserId: null, senderContactId: 'contact-1', clientMessageId: null, direction: 'INBOUND', type: 'TEXT', body, status: 'SENT', createdAt: '2026-10-08T00:00:00Z', updatedAt: '2026-10-08T00:00:00Z' });
class Socket {
  static instances: Socket[] = [];
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  close() { this.onclose?.(); }
  constructor(public url: string) { Socket.instances.push(this); }
}
const clients: RealtimeClient[] = [];
function client() {
  const current = new RealtimeClient({ url: 'ws://local.test/api/v1/realtime', organizationId: 'org-1', lastEventId: '0', checkpointStore: { get: () => null, set: vi.fn() }, WebSocketImpl: Socket as unknown as typeof WebSocket, onEvent: realtimeBus.emit, onReconcile: (signal) => realtimeBus.reconcile('org-1', signal), random: () => 0.5 });
  clients.push(current); current.connect(); return current;
}
function emit(type = 'conversation.updated', org = 'org-1', id = '1') {
  const socket = Socket.instances.at(-1)!;
  socket.onmessage?.({ data: JSON.stringify({ version: 1, eventId: id, organizationId: org, type, entityId: type.startsWith('message.') ? 'm-1' : 'c-1', occurredAt: '2026-10-08T00:00:00Z', payload: { resourceId: 'c-1', conversationId: 'c-1' } }) });
  socket.onmessage?.({ data: JSON.stringify({ version: 1, type: 'sync.checkpoint', lastEventId: id, hasMore: false }) });
}
function detail() { return render(<MemoryRouter initialEntries={['/app/conversations/c-1']}><Link to="/app/conversations/c-2">Outra conversa</Link><Routes><Route path="/app/conversations/:conversationId" element={<ConversationView />} /><Route path="/app/conversations" element={<p>Inbox</p>} /></Routes></MemoryRouter>); }

describe('P1 transport + actual REST projections (synthetic)', () => {
  beforeEach(() => {
    vi.spyOn(chatApi, 'listConversations').mockResolvedValue({ items: [conversation], nextCursor: null });
    vi.spyOn(chatApi, 'getConversation').mockResolvedValue(conversation);
    vi.spyOn(chatApi, 'listMessages').mockResolvedValue({ items: [message('Histórico inicial')], nextCursor: null });
    vi.spyOn(chatApi, 'listTags').mockResolvedValue({ items: [], nextCursor: null });
    vi.spyOn(chatApi, 'listNotes').mockResolvedValue({ items: [], nextCursor: null });
    vi.spyOn(chatApi, 'listTeamMembers').mockResolvedValue({ items: [], nextCursor: null });
  });
  afterEach(() => { clients.splice(0).forEach((item) => item.close()); Socket.instances = []; vi.restoreAllMocks(); state.session.currentOrganizationId = 'org-1'; state.session.permissions = ['conversations.read', 'messages.read', 'messages.send', 'providers.simulate']; });
  it('keeps the real inbox checkpoint pending until its REST response is applied', async () => {
    render(<MemoryRouter><InboxList /></MemoryRouter>); await screen.findByText('Prévia inicial');
    let finish!: (value: Conversation) => void;
    vi.mocked(chatApi.getConversation).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const connection = client(); act(() => emit());
    await waitFor(() => expect(finish).toBeTypeOf('function')); expect(connection.lastEventId).toBe('0');
    // Reconciliation list must also reflect the canonical current state.
    vi.mocked(chatApi.listConversations).mockResolvedValue({ items: [{ ...conversation, lastMessagePreview: 'Prévia nova' }], nextCursor: null });
    await act(async () => { finish({ ...conversation, lastMessagePreview: 'Prévia nova' }); });
    await screen.findByText('Prévia nova'); await waitFor(() => expect(connection.lastEventId).toBe('1'));
  });
  it('recovers a real inbox REST 500 by replaying from the unconfirmed cursor', async () => {
    render(<MemoryRouter><InboxList /></MemoryRouter>); await screen.findByText('Prévia inicial');
    vi.mocked(chatApi.getConversation).mockRejectedValueOnce(new Error('REST 500')).mockResolvedValue({ ...conversation, lastMessagePreview: 'Recuperada' });
    vi.mocked(chatApi.listConversations).mockResolvedValue({ items: [{ ...conversation, lastMessagePreview: 'Recuperada' }], nextCursor: null });
    const connection = client(); act(() => emit());
    await waitFor(() => expect(Socket.instances).toHaveLength(2)); expect(connection.lastEventId).toBe('0');
    act(() => emit()); await screen.findByText('Recuperada'); await waitFor(() => expect(connection.lastEventId).toBe('1'));
  });
  it('does not let a later event race an earlier request or regress the inbox', async () => {
    render(<MemoryRouter><InboxList /></MemoryRouter>); await screen.findByText('Prévia inicial');
    let finish!: (value: Conversation) => void;
    const refresh = vi.mocked(chatApi.getConversation).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; })).mockResolvedValue({ ...conversation, lastMessagePreview: 'Mais recente' });
    const connection = client();
    act(() => { emit('conversation.updated', 'org-1', '1'); emit('conversation.updated', 'org-1', '2'); });
    await waitFor(() => expect(finish).toBeTypeOf('function')); expect(refresh).toHaveBeenCalledTimes(1);
    await act(async () => finish({ ...conversation, lastMessagePreview: 'Resposta antiga' }));
    await screen.findByText('Mais recente'); await waitFor(() => expect(connection.lastEventId).toBe('2'));
  });
  it.each(['FULL', 'LIMITED', 'NONE'] as const)('replaces restricted cached history on transfer %s using only authorized REST data', async (visibility) => {
    detail(); await screen.findByText('Histórico inicial');
    vi.mocked(chatApi.getConversation).mockResolvedValue({ ...conversation, visibility });
    vi.mocked(chatApi.listMessages).mockResolvedValue({ items: visibility === 'NONE' ? [] : [message('Permitida')], nextCursor: null });
    const connection = client(); act(() => emit('conversation.transferred'));
    await waitFor(() => expect(connection.lastEventId).toBe('1'));
    expect(screen.queryByText('Histórico inicial')).not.toBeInTheDocument();
    if (visibility !== 'NONE') expect(screen.getByText('Permitida')).toBeInTheDocument();
    else expect(screen.queryByText('Permitida')).not.toBeInTheDocument();
  });
  it('invalidates a lost conversation access without retrying forbidden content', async () => {
    detail(); await screen.findByText('Histórico inicial');
    vi.mocked(chatApi.getConversation).mockRejectedValue({ status: 403 });
    const connection = client(); act(() => emit('conversation.transferred'));
    await screen.findByText('Inbox'); await waitFor(() => expect(connection.lastEventId).toBe('1'));
    expect(screen.queryByText('Histórico inicial')).not.toBeInTheDocument();
  });
  it('never requests or renders message content without messages.read', async () => {
    state.session.permissions = ['conversations.read']; detail(); await screen.findByRole('heading', { name: /Contato contact-/ });
    const connection = client(); act(() => emit('message.created')); await waitFor(() => expect(connection.lastEventId).toBe('1'));
    expect(chatApi.listMessages).not.toHaveBeenCalled(); expect(screen.queryByText('Histórico inicial')).not.toBeInTheDocument();
  });
  it('cancels the old conversation request when navigating during an update', async () => {
    detail(); await screen.findByText('Histórico inicial');
    let finish!: (value: { items: InternalTextMessage[]; nextCursor: null }) => void;
    let signal!: AbortSignal;
    vi.mocked(chatApi.listMessages).mockImplementationOnce((_id, _cursor, current) => { signal = current!; return new Promise((resolve) => { finish = resolve; }); }).mockResolvedValue({ items: [message('Outra conversa', 'c2-message')], nextCursor: null });
    const connection = client(); act(() => emit('message.created')); await waitFor(() => expect(finish).toBeTypeOf('function'));
    fireEvent.click(screen.getByRole('link', { name: 'Outra conversa' })); await screen.findByText('Outra conversa', { selector: 'p' });
    expect(signal.aborted).toBe(true);
    await act(async () => finish({ items: [message('Resposta obsoleta')], nextCursor: null }));
    expect(screen.queryByText('Resposta obsoleta')).not.toBeInTheDocument(); await waitFor(() => expect(connection.lastEventId).toBe('1'));
  });
  it('updates Demo through the same acknowledgement path and preserves contact identity', async () => {
    vi.spyOn(chatApi, 'listDemoContacts').mockResolvedValue({ enabled: true, items: [{ contactId: 'contact-1', name: 'Contato Demo', conversationId: 'c-1' }] });
    render(<MemoryRouter><DemoSimulatorPage /></MemoryRouter>); await screen.findByText('Histórico inicial');
    vi.mocked(chatApi.listMessages).mockResolvedValue({ items: [message('Mensagem externa')], nextCursor: null });
    const connection = client(); act(() => emit('message.created'));
    await screen.findByText('Mensagem externa'); await waitFor(() => expect(connection.lastEventId).toBe('1'));
    expect(screen.getByText('Mensagem externa').closest('article')).toHaveClass('from-contact');
  });
  it('does not overwrite a realtime update with a late bootstrap response', async () => {
    let finish!: (value: CursorPage<Conversation>) => void;
    vi.mocked(chatApi.listConversations).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; })).mockResolvedValue({ items: [{ ...conversation, lastMessagePreview: 'Depois do bootstrap' }], nextCursor: null });
    vi.mocked(chatApi.getConversation).mockResolvedValue({ ...conversation, lastMessagePreview: 'Depois do bootstrap' });
    render(<MemoryRouter><InboxList /></MemoryRouter>); const connection = client(); act(() => emit());
    expect(connection.lastEventId).toBe('0');
    await act(async () => finish({ items: [conversation], nextCursor: null }));
    await screen.findByText('Depois do bootstrap'); await waitFor(() => expect(connection.lastEventId).toBe('1'));
    expect(screen.queryByText('Prévia inicial')).not.toBeInTheDocument();
  });
  it('bootstraps current authorized data after events processed with no mounted projection', async () => {
    const connection = client(); act(() => emit()); await waitFor(() => expect(connection.lastEventId).toBe('1'));
    vi.mocked(chatApi.listConversations).mockResolvedValue({ items: [{ ...conversation, lastMessagePreview: 'Estado atual do REST' }], nextCursor: null });
    render(<MemoryRouter><InboxList /></MemoryRouter>); expect(await screen.findByText('Estado atual do REST')).toBeInTheDocument();
  });
  it('does not duplicate messages when the same event is delivered twice', async () => {
    detail(); await screen.findByText('Histórico inicial');
    vi.mocked(chatApi.listMessages).mockResolvedValue({ items: [message('Mensagem única', 'unique')], nextCursor: null });
    const connection = client(); act(() => { emit('message.created'); emit('message.created'); });
    await screen.findByText('Mensagem única'); await waitFor(() => expect(connection.lastEventId).toBe('1'));
    expect(screen.getAllByText('Mensagem única')).toHaveLength(1);
    // Initial load, event application, and one connection reconciliation.
    expect(chatApi.listMessages).toHaveBeenCalledTimes(3);
  });

});
