import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { InboxList } from './InboxList';
import { chatApi } from '../../lib/chatApi';
import { realtimeBus } from '../../lib/realtimeBus';
import type { Conversation } from '../../types/chat';

const state = vi.hoisted(() => ({ session: { user: { id: 'user-1', name: 'Ana', email: 'ana@example.com' }, permissions: ['conversations.read', 'conversations.supervise', 'tags.read'] } }));
vi.mock('../session/SessionContext', () => ({ useSession: () => ({ session: state.session }) }));
const row = (overrides: Partial<Conversation> = {}): Conversation => ({ id: 'conv-1', contactId: 'contact-1', tagIds: [], status: 'OPEN', assignedUserId: 'user-1', archivedAt: null, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z', lastMessageAt: '2026-10-01T00:00:00.000Z', visibility: 'FULL', ...overrides });
function renderInbox() { return render(<MemoryRouter initialEntries={['/app/conversations']}><InboxList /></MemoryRouter>); }

describe('InboxList', () => {
  afterEach(() => { vi.restoreAllMocks(); });
  it('sends scope, tag filter, and next cursor to the Core endpoint', async () => {
    const list = vi.spyOn(chatApi, 'listConversations').mockResolvedValueOnce({ items: [row()], nextCursor: 'cursor-1' }).mockResolvedValueOnce({ items: [row({ id: 'conv-2', assignedUserId: null })], nextCursor: 'cursor-2' }).mockResolvedValueOnce({ items: [], nextCursor: 'cursor-3' }).mockResolvedValueOnce({ items: [row({ id: 'conv-3', tagIds: ['tag-1'] })], nextCursor: null });
    vi.spyOn(chatApi, 'listTags').mockResolvedValue({ items: [{ id: 'tag-1', name: 'Urgente' }], nextCursor: null });
    renderInbox(); await screen.findByText('Contato contact-');
    expect(list).toHaveBeenNthCalledWith(1, { scope: 'mine', archived: false, limit: 50 });
    fireEvent.click(screen.getByRole('tab', { name: 'Não atribuídas' })); await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
    fireEvent.change(screen.getByLabelText('Filtrar por tag'), { target: { value: 'tag-1' } }); await waitFor(() => expect(list).toHaveBeenCalledTimes(3));
    fireEvent.click(screen.getByRole('button', { name: 'Carregar mais' })); await waitFor(() => expect(list).toHaveBeenCalledTimes(4));
    expect(list).toHaveBeenLastCalledWith({ scope: 'unassigned', archived: false, tagId: 'tag-1', limit: 50, cursor: 'cursor-3' });
  });

  it('applies realtime changes to one conversation without reloading the inbox', async () => {
    const activeConversation = row(); const list = vi.spyOn(chatApi, 'listConversations').mockResolvedValue({ items: [activeConversation], nextCursor: null });
    vi.spyOn(chatApi, 'listTags').mockResolvedValue({ items: [], nextCursor: null });
    vi.spyOn(chatApi, 'getConversation').mockResolvedValue(row({ status: 'ARCHIVED', archivedAt: '2026-10-08T00:00:00.000Z' }));
    renderInbox(); await screen.findByText('Contato contact-');
    realtimeBus.emit({ version: 1, eventId: '7', organizationId: 'org-1', type: 'conversation.archived', entityId: activeConversation.id, occurredAt: '2026-10-08T00:00:00.000Z', payload: { resourceId: activeConversation.id } });
    await waitFor(() => expect(screen.queryByText('Contato contact-')).not.toBeInTheDocument());
    expect(chatApi.getConversation).toHaveBeenCalledWith(activeConversation.id); expect(list).toHaveBeenCalledTimes(1);
  });
});
