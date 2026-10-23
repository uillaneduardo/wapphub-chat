import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { InboxList } from './InboxList';
import { chatApi } from '../../lib/chatApi';
import { realtimeBus } from '../../lib/realtimeBus';
import type { Conversation } from '../../types/chat';

const state = vi.hoisted(() => ({ session: { currentOrganizationId: 'org-1', user: { id: 'user-1', name: 'Ana', email: 'ana@example.com' }, permissions: ['conversations.read', 'conversations.supervise', 'tags.read', 'messages.read'], membership: { role: 'OWNER' } } }));
vi.mock('../session/SessionContext', () => ({ useSession: () => ({ session: state.session }) }));
const row = (overrides: Partial<Conversation> = {}): Conversation => ({ id: 'conv-1', contactId: 'contact-1', contactName: null, lastMessagePreview: null, provider: null, tagIds: [], status: 'OPEN', assignedUserId: 'user-1', archivedAt: null, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z', lastMessageAt: '2026-10-01T00:00:00.000Z', visibility: 'FULL', ...overrides });
function renderInbox(path = '/app/conversations?scope=mine') { return render(<MemoryRouter initialEntries={[path]}><InboxList /></MemoryRouter>); }

describe('InboxList', () => {
  afterEach(() => { vi.restoreAllMocks(); state.session.permissions = ['conversations.read', 'conversations.supervise', 'tags.read', 'messages.read']; state.session.membership.role = 'OWNER'; });
  it('renders a compact unread marker from the authorized server flag and clears it on a read event', async () => {
    const data = row({ contactName: 'Cliente não lido', hasUnread: true });
    vi.spyOn(chatApi, 'listConversations').mockResolvedValue({ items: [data], nextCursor: null });
    vi.spyOn(chatApi, 'listTags').mockResolvedValue({ items: [], nextCursor: null });
    vi.spyOn(chatApi, 'getConversation').mockResolvedValue({ ...data, hasUnread: false });
    renderInbox();
    const link = await screen.findByRole('link', { name: /Cliente não lido/ });
    expect(link).toHaveClass('has-unread');
    expect(link.querySelector('.conversation-unread-dot')).toHaveAttribute('aria-label', 'Mensagens não lidas');
    await realtimeBus.emit({ version: 1, eventId: 'read-1', organizationId: 'org-1',
      type: 'conversation.read.updated', entityId: 'conv-1',
      occurredAt: new Date().toISOString(), payload: { resourceId: 'conv-1', conversationId: 'conv-1' } });
    await waitFor(() => expect(screen.getByRole('link', { name: /Cliente não lido/ })).not.toHaveClass('has-unread'));
  });
  it('keeps notification sound opt-in and separate per organization/user', async () => {
    localStorage.clear();
    vi.spyOn(chatApi, 'listConversations').mockResolvedValue({ items: [], nextCursor: null });
    vi.spyOn(chatApi, 'listTags').mockResolvedValue({ items: [], nextCursor: null });
    renderInbox();
    const soundOff = await screen.findByRole('button', { name: 'Ativar som de novas mensagens' });
    expect(soundOff).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(soundOff);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Desativar som de novas mensagens' })).toHaveAttribute('aria-pressed', 'true'));
    expect(localStorage.getItem('wapphub:message-sound:v1:user-1:org-1')).toBe('on');
    fireEvent.click(screen.getByRole('button', { name: 'Desativar som de novas mensagens' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Ativar som de novas mensagens' })).toHaveAttribute('aria-pressed', 'false'));
    expect(localStorage.getItem('wapphub:message-sound:v1:user-1:org-1')).toBe('off');
  });
  it('shows only assigned conversations to AGENT even when a URL requests the unassigned queue', async () => {
    state.session.membership.role = 'AGENT';
    state.session.permissions = ['conversations.read', 'messages.read', 'messages.send'];
    const list = vi.spyOn(chatApi, 'listConversations').mockResolvedValue({ items: [], nextCursor: null });
    renderInbox('/app/conversations?scope=unassigned');
    await screen.findByText('Nenhuma conversa');
    expect(list).toHaveBeenCalledWith({ scope: 'mine', archived: false, limit: 50 }, expect.any(AbortSignal));
    expect(screen.queryByRole('tab', { name: 'Não atribuídas' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Todas' })).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Minhas' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByRole('link', { name: 'Nova conversa' })).not.toBeInTheDocument();
  });
  it('opens all authorized conversations for supervisors and retains the selected scope in links', async () => {
    const list = vi.spyOn(chatApi, 'listConversations').mockResolvedValue({ items: [row({ assignedUserId: null, provider: 'WHATSAPP_WEB' })], nextCursor: null });
    vi.spyOn(chatApi, 'listTags').mockResolvedValue({ items: [], nextCursor: null });
    renderInbox('/app/conversations'); await screen.findByText('Contato contact-');
    expect(list).toHaveBeenCalledWith({ scope: 'all', archived: false, limit: 50 }, expect.any(AbortSignal));
    fireEvent.click(screen.getByRole('tab', { name: 'Não atribuídas' }));
    await waitFor(() => expect(screen.getByRole('tab', { name: 'Não atribuídas' })).toHaveAttribute('aria-selected', 'true'));
    expect(screen.getByRole('link', { name: /Contato contact-/ })).toHaveAttribute('href', '/app/conversations/conv-1?scope=unassigned');
  });
  it('opens unassigned for readers without supervision and blocks an all-scope URL', async () => {
    state.session.permissions = ['conversations.read', 'messages.read'];
    const list = vi.spyOn(chatApi, 'listConversations').mockResolvedValue({ items: [row({ assignedUserId: null })], nextCursor: null });
    renderInbox('/app/conversations?scope=all'); await screen.findByText('Contato contact-');
    expect(list).toHaveBeenCalledWith({ scope: 'unassigned', archived: false, limit: 50 }, expect.any(AbortSignal));
    expect(screen.queryByRole('tab', { name: 'Todas' })).not.toBeInTheDocument();
  });
  it.each(['DEMO', 'WHATSAPP_WEB', 'META'] as const)('keeps %s metadata in data while rendering no technical badge', async (provider) => {
    const data = row({ provider }); vi.spyOn(chatApi, 'listConversations').mockResolvedValue({ items: [data], nextCursor: null });
    const view = renderInbox(); await screen.findByRole('link', { name: /Contato/ }); expect(view.container.querySelector('.channel-label')).toBeNull(); expect(data.provider).toBe(provider);
  });
  it('adds a new unassigned WhatsApp conversation through realtime without refresh and survives remount', async () => {
    const external = row({ assignedUserId: null, contactName: 'Novo contato', provider: 'WHATSAPP_WEB', lastMessagePreview: '*Texto recebido*' });
    const list = vi.spyOn(chatApi, 'listConversations').mockResolvedValue({ items: [], nextCursor: null });
    vi.spyOn(chatApi, 'listTags').mockResolvedValue({ items: [], nextCursor: null }); vi.spyOn(chatApi, 'getConversation').mockResolvedValue(external);
    const view = renderInbox('/app/conversations?scope=unassigned'); await screen.findByText('Nenhuma conversa');
    await realtimeBus.emit({ version: 1, eventId: '99', organizationId: 'org-1', type: 'message.created', entityId: 'new-message', occurredAt: '2026-10-10T00:00:00Z', payload: { resourceId: 'new-message', conversationId: external.id } });
    await screen.findByText('Novo contato'); expect(list).toHaveBeenCalledTimes(1); view.unmount();
    list.mockResolvedValue({ items: [external], nextCursor: null }); renderInbox('/app/conversations?scope=unassigned'); await screen.findByText('*Texto recebido*');
    expect(screen.getByRole('tab', { name: 'Não atribuídas' })).toHaveAttribute('aria-selected', 'true');
  });
  it('sends scope, tag filter, and next cursor to the Core endpoint', async () => {
    const list = vi.spyOn(chatApi, 'listConversations').mockResolvedValueOnce({ items: [row()], nextCursor: 'cursor-1' }).mockResolvedValueOnce({ items: [row({ id: 'conv-2', assignedUserId: null })], nextCursor: 'cursor-2' }).mockResolvedValueOnce({ items: [], nextCursor: 'cursor-3' }).mockResolvedValueOnce({ items: [row({ id: 'conv-3', tagIds: ['tag-1'] })], nextCursor: null });
    vi.spyOn(chatApi, 'listTags').mockResolvedValue({ items: [{ id: 'tag-1', name: 'Urgente' }], nextCursor: null });
    renderInbox(); await screen.findByText('Contato contact-');
    expect(list).toHaveBeenNthCalledWith(1, { scope: 'mine', archived: false, limit: 50 }, expect.any(AbortSignal));
    fireEvent.click(screen.getByRole('tab', { name: 'Não atribuídas' })); await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
    fireEvent.change(screen.getByLabelText('Filtrar por tag'), { target: { value: 'tag-1' } }); await waitFor(() => expect(list).toHaveBeenCalledTimes(3));
    fireEvent.click(screen.getByRole('button', { name: 'Carregar mais' })); await waitFor(() => expect(list).toHaveBeenCalledTimes(4));
    expect(list).toHaveBeenLastCalledWith({ scope: 'unassigned', archived: false, tagId: 'tag-1', limit: 50, cursor: 'cursor-3' }, expect.any(AbortSignal));
  });

  it('applies realtime changes to one conversation without reloading the inbox', async () => {
    const activeConversation = row(); const list = vi.spyOn(chatApi, 'listConversations').mockResolvedValue({ items: [activeConversation], nextCursor: null });
    vi.spyOn(chatApi, 'listTags').mockResolvedValue({ items: [], nextCursor: null });
    vi.spyOn(chatApi, 'getConversation').mockResolvedValue(row({ status: 'ARCHIVED', archivedAt: '2026-10-08T00:00:00.000Z' }));
    renderInbox(); await screen.findByText('Contato contact-');
    realtimeBus.emit({ version: 1, eventId: '7', organizationId: 'org-1', type: 'conversation.archived', entityId: activeConversation.id, occurredAt: '2026-10-08T00:00:00.000Z', payload: { resourceId: activeConversation.id } });
    await waitFor(() => expect(screen.queryByText('Contato contact-')).not.toBeInTheDocument());
    expect(chatApi.getConversation).toHaveBeenCalledWith(activeConversation.id, expect.any(AbortSignal)); expect(list).toHaveBeenCalledTimes(1);
  });
  it.each(['FULL', 'LIMITED', 'NONE'] as const)('shows an authorized preview for %s, including future messages after NONE', async (visibility) => {
    vi.spyOn(chatApi, 'listConversations').mockResolvedValue({ items: [row({ visibility, lastMessagePreview: 'Texto autorizado' })], nextCursor: null });
    vi.spyOn(chatApi, 'listTags').mockResolvedValue({ items: [], nextCursor: null });
    renderInbox(); expect(await screen.findByText('Texto autorizado')).toBeInTheDocument();
  });
  it('hides legacy or cached previews without messages.read, including after a realtime refresh', async () => {
    state.session.permissions = ['conversations.read', 'conversations.supervise'];
    vi.spyOn(chatApi, 'listConversations').mockResolvedValue({ items: [row({ lastMessagePreview: 'Prévia restrita' })], nextCursor: null });
    const refresh = vi.spyOn(chatApi, 'getConversation').mockResolvedValue(row({ lastMessagePreview: 'Texto restrito atualizado' }));
    renderInbox(); await screen.findByText('Contato contact-'); expect(screen.queryByText('Prévia restrita')).not.toBeInTheDocument();
    realtimeBus.emit({ version: 1, eventId: '8', organizationId: 'org-1', type: 'conversation.updated', entityId: 'conv-1', occurredAt: '2026-10-08T00:00:00.000Z', payload: { resourceId: 'conv-1' } });
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(screen.queryByText('Texto restrito atualizado')).not.toBeInTheDocument();
  });
  it('searches only loaded authorized conversations locally without extra API calls', async () => {
    const list = vi.spyOn(chatApi, 'listConversations').mockResolvedValue({ items: [
      row({ id: 'conv-1', contactName: 'Elaine', lastMessagePreview: 'Pedido de orçamento' }),
      row({ id: 'conv-2', contactName: 'Mauá Tecnologia', lastMessagePreview: 'Manutenção' }),
    ], nextCursor: 'more-cursor' });
    vi.spyOn(chatApi, 'listTags').mockResolvedValue({ items: [], nextCursor: null });
    renderInbox(); await screen.findByRole('link', { name: /Elaine/ });
    const input = screen.getByRole('searchbox', { name: 'Buscar nas conversas carregadas' });
    fireEvent.change(input, { target: { value: 'MAUÁ' } });
    expect(screen.queryByRole('link', { name: /Elaine/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Mauá Tecnologia/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Carregar mais' })).toBeInTheDocument();
    fireEvent.change(input, { target: { value: 'Não encontrado' } });
    expect(screen.getByRole('status')).toHaveTextContent('A busca considera apenas as conversas já carregadas');
    expect(list).toHaveBeenCalledTimes(1);
    fireEvent.change(input, { target: { value: '' } });
    expect(screen.getByRole('link', { name: /Elaine/ })).toBeInTheDocument();
  });
  it('does not search message previews when messages.read is denied', async () => {
    state.session.permissions = ['conversations.read', 'conversations.supervise'];
    vi.spyOn(chatApi, 'listConversations').mockResolvedValue({ items: [
      row({ contactName: 'Contato disponível', lastMessagePreview: 'SEGREDO-DO-CLIENTE' }),
    ], nextCursor: null });
    renderInbox(); await screen.findByRole('link', { name: /Contato disponível/ });
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar nas conversas carregadas' }), { target: { value: 'SEGREDO-DO-CLIENTE' } });
    expect(screen.queryByRole('link', { name: /Contato disponível/ })).not.toBeInTheDocument();
    expect(screen.queryByText('SEGREDO-DO-CLIENTE')).not.toBeInTheDocument();
  });
  it('keeps a null preview empty without replacing it with older message content', async () => {
    vi.spyOn(chatApi, 'listConversations').mockResolvedValue({ items: [row({ visibility: 'NONE', lastMessagePreview: null })], nextCursor: null });
    vi.spyOn(chatApi, 'listTags').mockResolvedValue({ items: [], nextCursor: null });
    renderInbox(); const label = await screen.findByText('Contato contact-');
    expect(label.closest('a')?.querySelector('.conversation-preview')).toBeEmptyDOMElement();
  });

});
