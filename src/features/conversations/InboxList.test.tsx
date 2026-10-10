import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { InboxList } from './InboxList';
import { chatApi } from '../../lib/chatApi';
import { realtimeBus } from '../../lib/realtimeBus';
import type { Conversation } from '../../types/chat';

const state = vi.hoisted(() => ({ session: { user: { id: 'user-1', name: 'Ana', email: 'ana@example.com' }, permissions: ['conversations.read', 'conversations.supervise', 'tags.read', 'messages.read'] } }));
vi.mock('../session/SessionContext', () => ({ useSession: () => ({ session: state.session }) }));
const row = (overrides: Partial<Conversation> = {}): Conversation => ({ id: 'conv-1', contactId: 'contact-1', contactName: null, lastMessagePreview: null, provider: null, tagIds: [], status: 'OPEN', assignedUserId: 'user-1', archivedAt: null, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z', lastMessageAt: '2026-10-01T00:00:00.000Z', visibility: 'FULL', ...overrides });
function renderInbox(path = '/app/conversations?scope=mine') { return render(<MemoryRouter initialEntries={[path]}><InboxList /></MemoryRouter>); }

describe('InboxList', () => {
  afterEach(() => { vi.restoreAllMocks(); state.session.permissions = ['conversations.read', 'conversations.supervise', 'tags.read', 'messages.read']; });
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
  it('keeps a null preview empty without replacing it with older message content', async () => {
    vi.spyOn(chatApi, 'listConversations').mockResolvedValue({ items: [row({ visibility: 'NONE', lastMessagePreview: null })], nextCursor: null });
    vi.spyOn(chatApi, 'listTags').mockResolvedValue({ items: [], nextCursor: null });
    renderInbox(); const label = await screen.findByText('Contato contact-');
    expect(label.closest('a')?.querySelector('.conversation-preview')).toBeEmptyDOMElement();
  });

});
