import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ConversationView } from './Conversations';
import { chatApi } from '../../lib/chatApi';
import { realtimeBus } from '../../lib/realtimeBus';
import type { Contact, Conversation, InternalNote, InternalTextMessage } from '../../types/chat';

const state = vi.hoisted(() => ({ session: { user: { id: 'user-1', name: 'Ana', email: 'ana@example.com' }, permissions: ['conversations.read', 'messages.read', 'messages.send', 'contacts.read', 'notes.read', 'notes.create', 'tags.read', 'tags.manage', 'conversations.archive', 'conversations.assign', 'conversations.transfer'] } }));
vi.mock('../session/SessionContext', () => ({ useSession: () => ({ session: state.session }) }));
const conversation: Conversation = { id: 'conv-1', contactId: 'contact-1', contactName: 'Contato teste', lastMessagePreview: null, provider: null, tagIds: [], status: 'OPEN', assignedUserId: 'user-1', archivedAt: null, createdAt: '2026-10-08T00:00:00Z', updatedAt: '2026-10-08T00:00:00Z', lastMessageAt: '2026-10-08T00:00:00Z', visibility: 'FULL' };
const contact: Contact = { id: 'contact-1', name: 'Joana', primaryIdentifier: '+55 81 99999-0000', createdAt: '2026-10-08T00:00:00Z', updatedAt: '2026-10-08T00:00:00Z' };
const message = (id: string, clientMessageId: string, body: string): InternalTextMessage => ({ id, conversationId: 'conv-1', senderUserId: 'user-1', senderContactId: null, clientMessageId, direction: 'INTERNAL', type: 'TEXT', body, status: 'SENT', createdAt: '2026-10-08T00:00:01Z', updatedAt: '2026-10-08T00:00:01Z' });
function renderDetail() { return render(<MemoryRouter initialEntries={['/app/conversations/conv-1']}><Routes><Route path="/app/conversations/:conversationId" element={<ConversationView />} /><Route path="/app/conversations" element={<p>Inbox</p>} /></Routes></MemoryRouter>); }
function mockBase() {
  vi.spyOn(chatApi, 'getConversation').mockResolvedValue(conversation); vi.spyOn(chatApi, 'getContact').mockResolvedValue(contact);
  vi.spyOn(chatApi, 'listMessages').mockResolvedValue({ items: [], nextCursor: null }); vi.spyOn(chatApi, 'listTags').mockResolvedValue({ items: [], nextCursor: null }); vi.spyOn(chatApi, 'listNotes').mockResolvedValue({ items: [], nextCursor: null });
}

describe('ConversationView', () => {
  afterEach(() => { vi.restoreAllMocks(); state.session.permissions = ['conversations.read', 'messages.read', 'messages.send', 'contacts.read', 'notes.read', 'notes.create', 'tags.read', 'tags.manage', 'conversations.archive', 'conversations.assign', 'conversations.transfer']; });
  it('shows an optimistic send and retries with the same clientMessageId', async () => {
    mockBase(); const send = vi.spyOn(chatApi, 'sendMessage').mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(message('message-1', 'client-stable', 'Olá'));
    renderDetail(); await screen.findByRole('heading', { name: 'Joana' }); fireEvent.change(screen.getByRole('textbox', { name: 'Escrever mensagem' }), { target: { value: 'Olá' } }); fireEvent.click(screen.getByRole('button', { name: 'Enviar mensagem' }));
    expect(await screen.findByText('Olá')).toBeInTheDocument(); expect(await screen.findByText('Erro')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    await waitFor(() => expect(send).toHaveBeenCalledTimes(2));
    const firstPayload = send.mock.calls[0]![1]; const retryPayload = send.mock.calls[1]![1]; expect(firstPayload.clientMessageId).toBe(retryPayload.clientMessageId); expect(retryPayload).toMatchObject({ body: 'Olá', clientMessageId: firstPayload.clientMessageId });
    await screen.findByText('Enviada'); expect(screen.queryByRole('button', { name: 'Tentar novamente' })).not.toBeInTheDocument();
  });
  it('adds an internal note with the Core contract', async () => {
    mockBase(); const note: InternalNote = { id: 'note-1', authorUserId: 'user-1', body: 'Retornar amanhã', createdAt: '2026-10-08T00:00:00Z' }; const createNote = vi.spyOn(chatApi, 'createNote').mockResolvedValue(note);
    renderDetail(); await screen.findByRole('heading', { name: 'Joana' }); fireEvent.change(screen.getByRole('textbox', { name: 'Nova nota interna' }), { target: { value: note.body } }); fireEvent.click(screen.getByRole('button', { name: 'Adicionar nota' }));
    expect(await screen.findByText(note.body)).toBeInTheDocument(); expect(createNote).toHaveBeenCalledWith('conv-1', note.body);
  });
  it('removes a conversation tag only when tags.manage is present', async () => {
    vi.spyOn(chatApi, 'getConversation').mockResolvedValue({ ...conversation, tagIds: ['tag-1'] }); vi.spyOn(chatApi, 'getContact').mockResolvedValue(contact);
    vi.spyOn(chatApi, 'listMessages').mockResolvedValue({ items: [], nextCursor: null }); vi.spyOn(chatApi, 'listTags').mockResolvedValue({ items: [{ id: 'tag-1', name: 'Urgente' }], nextCursor: null }); vi.spyOn(chatApi, 'listNotes').mockResolvedValue({ items: [], nextCursor: null });
    const removeTag = vi.spyOn(chatApi, 'removeTag').mockResolvedValue({ tagId: 'tag-1' }); renderDetail(); await screen.findByText('Urgente'); fireEvent.click(screen.getByRole('button', { name: 'Remover tag Urgente' }));
    await waitFor(() => expect(removeTag).toHaveBeenCalledWith('conv-1', 'tag-1'));
  });
  it('applies realtime message events to the selected conversation only', async () => {
    mockBase(); const listMessages = vi.spyOn(chatApi, 'listMessages').mockResolvedValueOnce({ items: [], nextCursor: null }).mockResolvedValueOnce({ items: [message('message-2', 'client-2', 'Cheguei pelo realtime')], nextCursor: null });
    renderDetail(); await screen.findByRole('heading', { name: 'Joana' }); realtimeBus.emit({ version: 1, eventId: '9', organizationId: 'org-1', type: 'message.created', entityId: 'message-2', occurredAt: '2026-10-08T00:00:02Z', payload: { resourceId: 'message-2', conversationId: 'conv-1' } });
    expect(await screen.findByText('Cheguei pelo realtime')).toBeInTheDocument(); expect(listMessages).toHaveBeenCalledTimes(2);
  });
  it('hides conversation controls when permissions are absent', async () => {
    state.session.permissions = ['conversations.read']; mockBase(); renderDetail(); await screen.findByRole('heading', { name: /Contato contact-/ });
    expect(screen.queryByRole('textbox', { name: 'Escrever mensagem' })).not.toBeInTheDocument(); expect(screen.queryByRole('textbox', { name: 'Nova nota interna' })).not.toBeInTheDocument(); expect(screen.queryByRole('button', { name: 'Arquivar conversa' })).not.toBeInTheDocument();
  });
});
