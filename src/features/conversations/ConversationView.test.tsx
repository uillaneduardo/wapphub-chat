import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { ConversationView } from './Conversations';
import { chatApi } from '../../lib/chatApi';
import { mockScrollGeometry } from '../../test/messageScrollGeometry';
import { realtimeBus } from '../../lib/realtimeBus';
import type { ChatEventType, Contact, Conversation, InternalNote, InternalTextMessage } from '../../types/chat';

const state = vi.hoisted(() => ({ session: { currentOrganizationId: 'org-1', user: { id: 'user-1', name: 'Ana', email: 'ana@example.com' }, permissions: ['conversations.read', 'messages.read', 'messages.send', 'contacts.read', 'notes.read', 'notes.create', 'tags.read', 'tags.manage', 'conversations.archive', 'conversations.assign', 'conversations.transfer'] } }));
vi.mock('../session/SessionContext', () => ({ useSession: () => ({ session: state.session }) }));
const conversation: Conversation = { id: 'conv-1', contactId: 'contact-1', contactName: 'Contato teste', lastMessagePreview: null, provider: null, tagIds: [], status: 'OPEN', assignedUserId: 'user-1', archivedAt: null, createdAt: '2026-10-08T00:00:00Z', updatedAt: '2026-10-08T00:00:00Z', lastMessageAt: '2026-10-08T00:00:00Z', visibility: 'FULL' };
const contact: Contact = { id: 'contact-1', name: 'Joana', primaryIdentifier: '+55 81 99999-0000', createdAt: '2026-10-08T00:00:00Z', updatedAt: '2026-10-08T00:00:00Z' };
const message = (id: string, clientMessageId: string, body: string): InternalTextMessage => ({ id, conversationId: 'conv-1', senderUserId: 'user-1', senderContactId: null, clientMessageId, direction: 'INTERNAL', type: 'TEXT', body, status: 'SENT', createdAt: '2026-10-08T00:00:01Z', updatedAt: '2026-10-08T00:00:01Z' });
function renderDetail() { return render(<MemoryRouter initialEntries={['/app/conversations/conv-1']}><Link to="/app/conversations/conv-2">Outra conversa</Link><Routes><Route path="/app/conversations/:conversationId" element={<ConversationView />} /><Route path="/app/conversations" element={<p>Inbox</p>} /></Routes></MemoryRouter>); }
const historyMessages = Array.from({ length: 6 }, (_, i) => ({ ...message(`history-${i}`, `history-client-${i}`, `Histórico ${i}`), direction: 'INBOUND' as const }));
function emitMessage(conversationId = 'conv-1', type: ChatEventType = 'message.created', organizationId = 'org-1') {
  act(() => { void realtimeBus.emit({ version: 1, eventId: 'scroll-event', organizationId, type, entityId: 'new-message', occurredAt: '2026-10-08T00:00:02Z', payload: { resourceId: 'new-message', conversationId } }); });
}
function mockBase() {
  vi.spyOn(chatApi, 'getConversation').mockResolvedValue(conversation); vi.spyOn(chatApi, 'getContact').mockResolvedValue(contact);
  vi.spyOn(chatApi, 'listMessages').mockResolvedValue({ items: [], nextCursor: null }); vi.spyOn(chatApi, 'listTags').mockResolvedValue({ items: [], nextCursor: null }); vi.spyOn(chatApi, 'listNotes').mockResolvedValue({ items: [], nextCursor: null });
}

describe('ConversationView', () => {
  beforeEach(() => { vi.spyOn(chatApi, 'listTeamMembers').mockResolvedValue({ items: [], nextCursor: null }); });
  afterEach(() => { localStorage.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals(); state.session.currentOrganizationId = 'org-1'; state.session.permissions = ['conversations.read', 'messages.read', 'messages.send', 'contacts.read', 'notes.read', 'notes.create', 'tags.read', 'tags.manage', 'conversations.archive', 'conversations.assign', 'conversations.transfer']; });
  it('shows an optimistic send and retries with the same clientMessageId', async () => {
    mockBase(); const send = vi.spyOn(chatApi, 'sendMessage').mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(message('message-1', 'client-stable', 'Olá'));
    renderDetail(); await screen.findByRole('heading', { name: 'Joana' }); fireEvent.change(screen.getByRole('textbox', { name: 'Escrever mensagem' }), { target: { value: 'Olá' } }); fireEvent.click(screen.getByRole('button', { name: 'Enviar mensagem' }));
    expect(await screen.findByText('Olá')).toBeInTheDocument(); expect(await screen.findByText('Erro')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    await waitFor(() => expect(send).toHaveBeenCalledTimes(2));
    const firstPayload = send.mock.calls[0]![1]; const retryPayload = send.mock.calls[1]![1]; expect(firstPayload.clientMessageId).toBe(retryPayload.clientMessageId); expect(retryPayload).toMatchObject({ body: 'Olá', clientMessageId: firstPayload.clientMessageId });
    await screen.findByText('Enviada'); expect(screen.queryByRole('button', { name: 'Tentar novamente' })).not.toBeInTheDocument();
  });
  it('keeps future tools disabled with explanatory tooltips', async () => {
    mockBase(); renderDetail(); await screen.findByRole('heading', { name: 'Joana' });
    for (const name of ['Negrito', 'Itálico', 'Anexar arquivo', 'Imagem/vídeo', 'Áudio', 'Emojis']) {
      expect(screen.getByRole('button', { name })).toBeDisabled();
      const wrapper = screen.getByLabelText(`${name}: indisponível nesta versão`);
      expect(wrapper).toHaveAttribute('tabindex', '0'); expect(wrapper).toHaveAttribute('aria-disabled', 'true');
      expect(document.getElementById(wrapper.getAttribute('aria-describedby')!)).toHaveTextContent(`${name}: indisponível nesta versão.`);
    }
    expect(screen.getByRole('textbox', { name: 'Escrever mensagem' })).toHaveAttribute('maxlength', '8000');
  });
  it('preserves IME and Shift+Enter and blocks duplicate pending sends', async () => {
    mockBase(); let resolve!: (value: InternalTextMessage) => void;
    const send = vi.spyOn(chatApi, 'sendMessage').mockImplementation(() => new Promise((done) => { resolve = done; }));
    renderDetail(); await screen.findByRole('heading', { name: 'Joana' }); const input = screen.getByRole('textbox', { name: 'Escrever mensagem' });
    fireEvent.change(input, { target: { value: 'Olá' } });
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true }); fireEvent.keyDown(input, { key: 'Enter', keyCode: 229 }); fireEvent.keyDown(input, { key: 'Enter', shiftKey: true }); expect(send).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: 'Enter' }); fireEvent.change(input, { target: { value: 'Olá' } }); fireEvent.keyDown(input, { key: 'Enter' });
    expect(send).toHaveBeenCalledTimes(1); expect(screen.getByRole('button', { name: 'Enviar mensagem' })).toBeDisabled();
    resolve(message('m', send.mock.calls[0]![1].clientMessageId, 'Olá'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Enviar mensagem' })).toBeEnabled());
  });
  it('integrates the splitter and restore control without replacing the history', async () => {
    mockScrollGeometry(900); vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    mockBase(); vi.spyOn(chatApi, 'listMessages').mockResolvedValue({ items: historyMessages, nextCursor: null }); renderDetail();
    const handle = await screen.findByRole('separator'); const history = screen.getByRole('region', { name: 'Histórico de mensagens' }); history.scrollTop = 100; fireEvent.scroll(history);
    fireEvent.keyDown(handle, { key: 'ArrowLeft' }); expect(handle).toHaveAttribute('aria-valuenow', '316'); expect(history).toBe(screen.getByRole('region', { name: 'Histórico de mensagens' })); expect(history.scrollTop).toBe(100);
    fireEvent.click(screen.getByRole('button', { name: 'Restaurar largura padrão' })); expect(handle).toHaveAttribute('aria-valuenow', '300'); expect(history.scrollTop).toBe(100);
  });
  it('uses the account preference for Shift+Enter while preserving IME, empty and duplicate guards', async () => {
    mockBase(); let resolve!: (value: InternalTextMessage) => void;
    const send = vi.spyOn(chatApi, 'sendMessage').mockImplementation(() => new Promise((done) => { resolve = done; }));
    renderDetail(); await screen.findByRole('heading', { name: 'Joana' }); const input = screen.getByRole('textbox', { name: 'Escrever mensagem' });
    fireEvent.change(screen.getByRole('combobox', { name: 'Atalho de envio' }), { target: { value: 'shift-enter' } });
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true }); expect(send).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: 'Texto pelo atalho' } });
    expect(fireEvent.keyDown(input, { key: 'Enter' })).toBe(true);
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true, isComposing: true }); fireEvent.keyDown(input, { key: 'Enter', shiftKey: true, keyCode: 229 }); expect(send).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true }); fireEvent.change(input, { target: { value: 'Texto pelo atalho' } }); fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
    expect(send).toHaveBeenCalledTimes(1); expect(send.mock.calls[0]![1]).toMatchObject({ body: 'Texto pelo atalho', clientMessageId: expect.any(String) });
    await act(async () => resolve(message('saved-shortcut', send.mock.calls[0]![1].clientMessageId, 'Texto pelo atalho')));
  });
  it('blocks archived conversations including keyboard sends', async () => {
    mockBase(); vi.spyOn(chatApi, 'getConversation').mockResolvedValue({ ...conversation, status: 'ARCHIVED' }); const send = vi.spyOn(chatApi, 'sendMessage');
    renderDetail(); await screen.findByRole('heading', { name: 'Joana' }); const input = screen.getByRole('textbox', { name: 'Escrever mensagem' });
    expect(input).toBeDisabled(); fireEvent.change(input, { target: { value: 'Olá' } }); fireEvent.keyDown(input, { key: 'Enter' }); expect(send).not.toHaveBeenCalled();
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
  it('preserves reading on incoming DEMO messages and exposes an accessible jump to the end', async () => {
    mockScrollGeometry(); mockBase();
    vi.spyOn(chatApi, 'getConversation').mockResolvedValue({ ...conversation, provider: 'DEMO' });
    const list = vi.spyOn(chatApi, 'listMessages').mockResolvedValueOnce({ items: historyMessages, nextCursor: null }).mockResolvedValue({ items: [...historyMessages, { ...message('incoming', 'incoming-client', 'Nova do contato Demo'), direction: 'INBOUND' }], nextCursor: null });
    renderDetail(); const history = await screen.findByRole('region', { name: 'Histórico de mensagens' });
    expect(history.scrollTop).toBe(400); expect(history).toHaveAttribute('tabindex', '0');
    history.scrollTop = 100; fireEvent.scroll(history); emitMessage();
    await screen.findByText('Nova do contato Demo'); expect(history.scrollTop).toBe(100);
    expect(screen.getByText('Nova mensagem')).toBeInTheDocument();
    emitMessage('conv-other'); emitMessage('conv-1', 'message.created', 'org-other'); expect(list).toHaveBeenCalledTimes(2);
    emitMessage('conv-1', 'message.updated'); await waitFor(() => expect(list).toHaveBeenCalledTimes(3));
    expect(screen.getByText('Nova mensagem')).toBeInTheDocument(); expect(history.scrollTop).toBe(100);
    fireEvent.click(screen.getByRole('button', { name: 'Ir para o final' }));
    expect(history.scrollTop).toBe(500); expect(history).toHaveFocus(); expect(screen.queryByText('Nova mensagem')).not.toBeInTheDocument();
  });
  it('does not force the reader down during an optimistic send and reconciliation', async () => {
    mockScrollGeometry(); mockBase(); vi.spyOn(chatApi, 'listMessages').mockResolvedValue({ items: historyMessages, nextCursor: null });
    const send = vi.spyOn(chatApi, 'sendMessage').mockImplementation(async (_id, payload) => message('saved', payload.clientMessageId, payload.body));
    renderDetail(); const history = await screen.findByRole('region', { name: 'Histórico de mensagens' }); history.scrollTop = 100; fireEvent.scroll(history);
    fireEvent.change(screen.getByRole('textbox', { name: 'Escrever mensagem' }), { target: { value: 'Resposta de texto' } }); fireEvent.click(screen.getByRole('button', { name: 'Enviar mensagem' }));
    await waitFor(() => expect(send).toHaveBeenCalledTimes(1)); await screen.findByText('Resposta de texto');
    expect(history.scrollTop).toBe(100); expect(screen.getByText('Nova mensagem')).toBeInTheDocument();
  });
  it('keeps the visible message anchored when loading an older cursor page', async () => {
    mockScrollGeometry(); mockBase();
    const older = [message('older-1', 'older-client-1', 'Antiga 1'), message('older-2', 'older-client-2', 'Antiga 2')].map((item) => ({ ...item, createdAt: '2026-10-07T00:00:00Z' }));
    const list = vi.spyOn(chatApi, 'listMessages').mockResolvedValueOnce({ items: historyMessages, nextCursor: 'older-cursor' }).mockResolvedValueOnce({ items: older, nextCursor: null });
    renderDetail(); const history = await screen.findByRole('region', { name: 'Histórico de mensagens' }); history.scrollTop = 100; fireEvent.scroll(history);
    fireEvent.click(screen.getByRole('button', { name: 'Carregar mensagens anteriores' })); await screen.findByText('Antiga 1');
    expect(list).toHaveBeenLastCalledWith('conv-1', 'older-cursor', expect.any(AbortSignal)); expect(history.scrollTop).toBe(300);
    expect(screen.queryByRole('button', { name: 'Carregar mensagens anteriores' })).not.toBeInTheDocument(); expect(screen.queryByText('Nova mensagem')).not.toBeInTheDocument();
  });
  it('resets unread, scroll and drafts when changing conversations', async () => {
    mockScrollGeometry(); mockBase();
    vi.spyOn(chatApi, 'getConversation').mockImplementation(async (id) => ({ ...conversation, id }));
    vi.spyOn(chatApi, 'listMessages').mockResolvedValueOnce({ items: historyMessages, nextCursor: null }).mockResolvedValueOnce({ items: [...historyMessages, message('new', 'new-client', 'Nova anterior')], nextCursor: null }).mockResolvedValue({ items: historyMessages.map((item) => ({ ...item, conversationId: 'conv-2' })), nextCursor: null });
    renderDetail(); const oldHistory = await screen.findByRole('region', { name: 'Histórico de mensagens' }); oldHistory.scrollTop = 100; fireEvent.scroll(oldHistory); emitMessage(); await screen.findByText('Nova mensagem');
    fireEvent.change(screen.getByRole('textbox', { name: 'Escrever mensagem' }), { target: { value: 'Rascunho anterior' } }); fireEvent.click(screen.getByRole('link', { name: 'Outra conversa' }));
    await screen.findByRole('region', { name: 'Histórico de mensagens' });
    expect(screen.getByRole('region', { name: 'Histórico de mensagens' })).not.toBe(oldHistory);
    expect(screen.getByRole('region', { name: 'Histórico de mensagens' }).scrollTop).toBe(400);
    expect(screen.queryByText('Nova mensagem')).not.toBeInTheDocument(); expect(screen.getByRole('textbox', { name: 'Escrever mensagem' })).toHaveValue('');
  });
  it('resets the same conversation on organization change and ignores an old in-flight refresh', async () => {
    mockScrollGeometry(); mockBase(); let resolveOld!: (value: { items: InternalTextMessage[]; nextCursor: null }) => void;
    vi.spyOn(chatApi, 'listMessages').mockResolvedValueOnce({ items: historyMessages, nextCursor: null }).mockResolvedValueOnce({ items: [...historyMessages, message('new', 'new-client', 'Nova anterior')], nextCursor: null }).mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; })).mockResolvedValue({ items: [message('new-org', 'new-org-client', 'Histórico da outra organização')], nextCursor: null });
    const view = renderDetail(); const oldHistory = await screen.findByRole('region', { name: 'Histórico de mensagens' }); oldHistory.scrollTop = 100; fireEvent.scroll(oldHistory); emitMessage(); await screen.findByText('Nova mensagem'); emitMessage(); await waitFor(() => expect(resolveOld).toBeTypeOf('function'));
    state.session.currentOrganizationId = 'org-2';
    view.rerender(<MemoryRouter initialEntries={['/app/conversations/conv-1']}><Link to="/app/conversations/conv-2">Outra conversa</Link><Routes><Route path="/app/conversations/:conversationId" element={<ConversationView />} /><Route path="/app/conversations" element={<p>Inbox</p>} /></Routes></MemoryRouter>);
    await screen.findByText('Histórico da outra organização'); await act(async () => resolveOld({ items: [message('old-late', 'old-late-client', 'Resposta atrasada do tenant anterior')], nextCursor: null }));
    expect(screen.queryByText('Resposta atrasada do tenant anterior')).not.toBeInTheDocument(); expect(screen.queryByText('Nova mensagem')).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Histórico de mensagens' }).scrollTop).toBe(0);
  });
  it('hides conversation controls when permissions are absent', async () => {
    state.session.permissions = ['conversations.read']; mockBase(); renderDetail(); await screen.findByRole('heading', { name: /Contato contact-/ });
    expect(screen.queryByRole('textbox', { name: 'Escrever mensagem' })).not.toBeInTheDocument(); expect(screen.queryByRole('textbox', { name: 'Nova nota interna' })).not.toBeInTheDocument(); expect(screen.queryByRole('button', { name: 'Arquivar conversa' })).not.toBeInTheDocument();
  });
});
