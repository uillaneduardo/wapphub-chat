import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ConversationActions } from './ConversationActions';
import { chatApi } from '../../lib/chatApi';
import type { Conversation, Tag, TeamMember } from '../../types/chat';

const baseConversation: Conversation = { id: 'conv-1', contactId: 'contact-1', contactName: null, lastMessagePreview: null, provider: null, tagIds: [], status: 'OPEN', assignedUserId: null, archivedAt: null, createdAt: '2026-10-08T00:00:00Z', updatedAt: '2026-10-08T00:00:00Z', lastMessageAt: '2026-10-08T00:00:00Z', visibility: 'FULL' };
const tags: Tag[] = [{ id: 'tag-1', name: 'Urgente' }];
const members: TeamMember[] = [
  { userId: 'user-1', name: 'Ana', email: 'ana@example.test', status: 'ACTIVE', canReceiveAssignment: true },
  { userId: 'user-2', name: 'Rafa Lima', email: 'rafa@example.test', status: 'ACTIVE', canReceiveAssignment: true },
  { userId: 'user-3', name: 'Convidado', email: 'guest@example.test', status: 'ACTIVE', canReceiveAssignment: false },
];
function renderActions(conversation = baseConversation, permissions = ['conversations.assign', 'conversations.archive', 'conversations.transfer', 'conversations.supervise', 'tags.manage']) {
  vi.spyOn(chatApi, 'listTeamMembers').mockResolvedValue({ items: members, nextCursor: null });
  return render(<ConversationActions conversation={conversation} tags={tags} userId="user-1" permissions={permissions} onConversationUpdate={vi.fn()} onTagsUpdate={vi.fn()} />);
}

describe('conversation actions', () => {
  afterEach(() => vi.restoreAllMocks());
  it('assigns the selected active team member by name', async () => {
    const assign = vi.spyOn(chatApi, 'assign').mockResolvedValue({ ...baseConversation, assignedUserId: 'user-2' });
    renderActions();
    await screen.findByRole('option', { name: /Rafa Lima · rafa@example\.test/ });
    expect(screen.queryByPlaceholderText(/UUID/i)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Atribuir a uma pessoa'), { target: { value: 'user-2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Atribuir' }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith('conv-1', 'user-2'));
  });
  it('disables team members who cannot receive an assignment', async () => {
    renderActions();
    const ineligible = await screen.findByRole('option', { name: /Convidado.*sem permissão para receber/ });
    expect(ineligible).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Atribuir a uma pessoa'), { target: { value: 'user-3' } });
    expect(screen.getByRole('button', { name: 'Atribuir' })).toBeDisabled();
  });
  it('transfers to a selected member with visibility and optional note', async () => {
    const conversation = { ...baseConversation, assignedUserId: 'user-1' };
    const transfer = vi.spyOn(chatApi, 'transfer').mockResolvedValue({ ...conversation, assignedUserId: 'user-2' });
    renderActions(conversation);
    fireEvent.click(screen.getByRole('button', { name: 'Transferir conversa' }));
    await screen.findByRole('option', { name: /Rafa Lima · rafa@example\.test/ });
    fireEvent.change(screen.getByLabelText('Transferir para'), { target: { value: 'user-2' } });
    fireEvent.change(screen.getByLabelText('Histórico visível'), { target: { value: 'LIMITED' } });
    fireEvent.change(screen.getByLabelText('Quantidade de mensagens'), { target: { value: '12' } });
    fireEvent.change(screen.getByLabelText('Nota de transferência (opcional)'), { target: { value: 'Contexto para assumir' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar transferência' }));
    await waitFor(() => expect(transfer).toHaveBeenCalledWith('conv-1', { userId: 'user-2', visibility: 'LIMITED', lastN: 12, note: 'Contexto para assumir' }));
  });
  it('shows roster loading, error with retry, and empty states', async () => {
    let rejectRequest!: (reason: Error) => void;
    vi.spyOn(chatApi, 'listTeamMembers').mockReturnValueOnce(new Promise((_, reject) => { rejectRequest = reject; })).mockResolvedValueOnce({ items: [], nextCursor: null });
    render(<ConversationActions conversation={baseConversation} tags={[]} userId="user-1" permissions={['conversations.assign', 'conversations.supervise']} onConversationUpdate={vi.fn()} onTagsUpdate={vi.fn()} />);
    expect(await screen.findByText('Carregando equipe…')).toBeInTheDocument();
    rejectRequest(new Error('offline'));
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Nenhuma pessoa ativa na equipe.')).toBeInTheDocument();
  });
  it('adds tags, archives, and hides actions without permissions', async () => {
    const addTag = vi.spyOn(chatApi, 'addTag').mockResolvedValue({ tagId: 'tag-1' });
    const view = renderActions(); fireEvent.change(screen.getByLabelText('Adicionar tag'), { target: { value: 'tag-1' } }); fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
    await waitFor(() => expect(addTag).toHaveBeenCalledWith('conv-1', 'tag-1'));
    view.unmount();
    const archive = vi.spyOn(chatApi, 'archive').mockResolvedValue({ ...baseConversation, status: 'ARCHIVED', archivedAt: '2026-10-08T01:00:00Z' });
    renderActions(baseConversation, ['conversations.archive']); fireEvent.click(screen.getByRole('button', { name: 'Arquivar conversa' }));
    await waitFor(() => expect(archive).toHaveBeenCalledWith('conv-1', true));
    const denied = renderActions(baseConversation, []);
    expect(screen.queryByRole('button', { name: 'Atribuir a mim' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Transferir conversa' })).not.toBeInTheDocument();
    expect(chatApi.listTeamMembers).toHaveBeenCalledTimes(1);
    denied.unmount();
  });
});
