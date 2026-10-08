import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ConversationActions } from './ConversationActions';
import { chatApi } from '../../lib/chatApi';
import type { Conversation, Tag } from '../../types/chat';

const baseConversation: Conversation = { id: 'conv-1', contactId: 'contact-1', tagIds: [], status: 'OPEN', assignedUserId: null, archivedAt: null, createdAt: '2026-10-08T00:00:00Z', updatedAt: '2026-10-08T00:00:00Z', lastMessageAt: '2026-10-08T00:00:00Z', visibility: 'FULL' };
const tags: Tag[] = [{ id: 'tag-1', name: 'Urgente' }];
function renderActions(conversation = baseConversation, permissions = ['conversations.assign', 'conversations.archive', 'conversations.transfer', 'conversations.supervise', 'tags.manage']) {
  return render(<ConversationActions conversation={conversation} tags={tags} userId="user-1" permissions={permissions} onConversationUpdate={vi.fn()} onTagsUpdate={vi.fn()} />);
}

describe('conversation actions', () => {
  afterEach(() => vi.restoreAllMocks());
  it('assigns an unassigned conversation to the current user', async () => {
    const assign = vi.spyOn(chatApi, 'assign').mockResolvedValue({ ...baseConversation, assignedUserId: 'user-1' });
    renderActions(); fireEvent.click(screen.getByRole('button', { name: 'Atribuir a mim' }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith('conv-1', 'user-1'));
  });
  it('transfers with the selected history visibility and optional note', async () => {
    const conversation = { ...baseConversation, assignedUserId: 'user-1' };
    const transfer = vi.spyOn(chatApi, 'transfer').mockResolvedValue({ ...conversation, assignedUserId: 'user-2' });
    renderActions(conversation); fireEvent.click(screen.getByRole('button', { name: 'Transferir conversa' }));
    fireEvent.change(screen.getByLabelText('UUID do novo responsável'), { target: { value: 'user-2' } });
    fireEvent.change(screen.getByLabelText('Histórico visível'), { target: { value: 'LIMITED' } });
    fireEvent.change(screen.getByLabelText('Quantidade de mensagens'), { target: { value: '12' } });
    fireEvent.change(screen.getByLabelText('Nota de transferência (opcional)'), { target: { value: 'Contexto para assumir' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar transferência' }));
    await waitFor(() => expect(transfer).toHaveBeenCalledWith('conv-1', { userId: 'user-2', visibility: 'LIMITED', lastN: 12, note: 'Contexto para assumir' }));
  });
  it('adds a tag through the Core and hides mutation controls without permissions', async () => {
    const addTag = vi.spyOn(chatApi, 'addTag').mockResolvedValue({ tagId: 'tag-1' });
    const view = renderActions(); fireEvent.change(screen.getByLabelText('Adicionar tag'), { target: { value: 'tag-1' } }); fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
    await waitFor(() => expect(addTag).toHaveBeenCalledWith('conv-1', 'tag-1'));
    view.unmount();
    renderActions(baseConversation, []); expect(screen.queryByRole('button', { name: 'Arquivar conversa' })).not.toBeInTheDocument(); expect(screen.queryByRole('button', { name: 'Atribuir a mim' })).not.toBeInTheDocument(); expect(screen.queryByRole('button', { name: 'Transferir conversa' })).not.toBeInTheDocument();
  });
  it('archives a conversation when permitted', async () => {
    const archive = vi.spyOn(chatApi, 'archive').mockResolvedValue({ ...baseConversation, status: 'ARCHIVED', archivedAt: '2026-10-08T01:00:00Z' });
    renderActions(baseConversation, ['conversations.archive']); fireEvent.click(screen.getByRole('button', { name: 'Arquivar conversa' }));
    await waitFor(() => expect(archive).toHaveBeenCalledWith('conv-1', true));
  });
});
