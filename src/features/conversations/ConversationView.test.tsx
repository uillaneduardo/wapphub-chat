import { ApiError } from '../../lib/api';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { ConversationView } from './Conversations';
import { clearComposerDrafts } from './composerDrafts';
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
  vi.spyOn(chatApi, 'getMessage').mockRejectedValue(new ApiError(404, 'http', 'NOT_FOUND', 'NOT_FOUND'));
  vi.spyOn(chatApi, 'getConversation').mockResolvedValue(conversation); vi.spyOn(chatApi, 'getContact').mockResolvedValue(contact);
  vi.spyOn(chatApi, 'listMessages').mockResolvedValue({ items: [], nextCursor: null }); vi.spyOn(chatApi, 'listTags').mockResolvedValue({ items: [], nextCursor: null }); vi.spyOn(chatApi, 'listNotes').mockResolvedValue({ items: [], nextCursor: null });
}

describe('ConversationView', () => {
  beforeEach(() => { vi.spyOn(chatApi, 'listTeamMembers').mockResolvedValue({ items: [], nextCursor: null }); });
  afterEach(() => { clearComposerDrafts(); localStorage.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals(); state.session.currentOrganizationId = 'org-1'; state.session.permissions = ['conversations.read', 'messages.read', 'messages.send', 'contacts.read', 'notes.read', 'notes.create', 'tags.read', 'tags.manage', 'conversations.archive', 'conversations.assign', 'conversations.transfer']; });
  it.each(['DEMO', 'WHATSAPP_WEB', 'META'] as const)('uses persisted authors and hides technical %s labels without inferring authors from viewer or body', async (provider) => {
    mockBase(); vi.spyOn(chatApi, 'getConversation').mockResolvedValue({ ...conversation, provider, outboundEnabled: false });
    vi.spyOn(chatApi, 'listMessages').mockResolvedValue({ items: [
      { ...message('historical-author', 'historic-client', 'Texto histórico'), senderUserId: 'original-user', senderName: 'Autora persistida', historical: true },
      { ...message('unknown-history', '', '*Maria:* conteúdo original'), direction: 'OUTBOUND', senderUserId: null, senderName: null, clientMessageId: null, historical: true },
      { ...message('device', '', 'Texto do celular'), direction: 'OUTBOUND', senderUserId: null, senderName: null, clientMessageId: null },
      { ...message('inbound', '', 'Texto recebido'), direction: 'INBOUND', senderUserId: null, senderContactId: contact.id, clientMessageId: null, senderName: 'Contato externo' },
    ], nextCursor: null });
    const view = renderDetail(); await screen.findByText('Texto do celular');
    expect([...view.container.querySelectorAll('.message-author')].map((element) => element.textContent)).toEqual(['Autora persistida', 'Contato externo']);
    expect(screen.queryByText('Aparelho conectado')).not.toBeInTheDocument(); expect(screen.queryByText('Atendente')).not.toBeInTheDocument();
    expect(view.container.querySelectorAll('.channel-label')).toHaveLength(0); expect(screen.queryByText('WhatsApp Web')).not.toBeInTheDocument(); expect(screen.queryByText('DEMO')).not.toBeInTheDocument(); expect(screen.queryByText('META')).not.toBeInTheDocument();
    expect(screen.getByText('Maria:').tagName).toBe('STRONG'); expect(screen.getByText(/conteúdo original/)).toBeInTheDocument();
  });
  it('preserves history, draft and players on an identical session refresh with a fresh permissions array', async () => {
    mockBase(); vi.mocked(chatApi.listMessages).mockResolvedValue({ items: [message('saved', 'client', 'Persistida')], nextCursor: null });
    const view = renderDetail(); await screen.findByText('Persistida');
    const history = screen.getByRole('region', { name: 'Histórico de mensagens' });
    const draft = screen.getByRole('textbox', { name: 'Escrever mensagem' });
    fireEvent.change(draft, { target: { value: 'Rascunho preservado' } });
    state.session.permissions = [...state.session.permissions];
    view.rerender(<MemoryRouter initialEntries={['/app/conversations/conv-1']}><Link to="/app/conversations/conv-2">Outra conversa</Link><Routes><Route path="/app/conversations/:conversationId" element={<ConversationView />} /><Route path="/app/conversations" element={<p>Inbox</p>} /></Routes></MemoryRouter>);
    await act(async () => {});
    expect(chatApi.listMessages).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('region', { name: 'Histórico de mensagens' })).toBe(history);
    expect(screen.getByRole('textbox', { name: 'Escrever mensagem' })).toBe(draft);
    expect(draft).toHaveValue('Rascunho preservado');
  });
  it('keeps messages and the history node while reconnect reconciliation is in flight', async () => {
    mockBase(); vi.mocked(chatApi.listMessages).mockResolvedValue({ items: [message('saved', 'client', 'Persistida')], nextCursor: null });
    renderDetail(); await screen.findByText('Persistida');
    const history = screen.getByRole('region', { name: 'Histórico de mensagens' });
    let finish!: (value: Conversation) => void;
    vi.mocked(chatApi.getConversation).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    let reconcile!: Promise<void>;
    act(() => { reconcile = realtimeBus.reconcile('org-1'); });
    await waitFor(() => expect(finish).toBeTypeOf('function'));
    expect(screen.getByText('Persistida')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Histórico de mensagens' })).toBe(history);
    await act(async () => { finish(conversation); await reconcile; });
    expect(screen.getByRole('region', { name: 'Histórico de mensagens' })).toBe(history);
  });
  it('keeps WhatsApp Web outbound disabled according to Core capability and identifies device authorship', async () => {
    mockBase(); vi.spyOn(chatApi, 'getConversation').mockResolvedValue({ ...conversation, provider: 'WHATSAPP_WEB', outboundEnabled: false });
    vi.spyOn(chatApi, 'listMessages').mockResolvedValue({ items: [{ ...message('device', '', 'Texto do aparelho'), senderUserId: null, clientMessageId: null, direction: 'OUTBOUND' }], nextCursor: null });
    const send = vi.spyOn(chatApi, 'sendMessage'); renderDetail(); await screen.findByText('Texto do aparelho');
    expect(screen.queryByText('Aparelho conectado')).not.toBeInTheDocument(); expect(screen.queryByRole('textbox', { name: 'Escrever mensagem' })).not.toBeInTheDocument();
    expect(screen.getByText(/Envio indisponível nesta conversa/)).toBeInTheDocument(); expect(send).not.toHaveBeenCalled();
  });
  it('shows an optimistic send and retries with the same clientMessageId', async () => {
    mockBase(); const send = vi.spyOn(chatApi, 'sendMessage').mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(message('message-1', 'client-stable', 'Olá'));
    renderDetail(); await screen.findByRole('heading', { name: 'Joana' }); fireEvent.change(screen.getByRole('textbox', { name: 'Escrever mensagem' }), { target: { value: 'Olá' } }); fireEvent.click(screen.getByRole('button', { name: 'Enviar mensagem' }));
    expect(await screen.findByText('Olá')).toBeInTheDocument(); expect(await screen.findByText('Erro')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    await waitFor(() => expect(send).toHaveBeenCalledTimes(2));
    const firstPayload = send.mock.calls[0]![1]; const retryPayload = send.mock.calls[1]![1]; expect(firstPayload.clientMessageId).toBe(retryPayload.clientMessageId); expect(retryPayload).toMatchObject({ body: 'Olá', clientMessageId: firstPayload.clientMessageId });
    await screen.findByText('Enviada'); expect(screen.queryByRole('button', { name: 'Tentar novamente' })).not.toBeInTheDocument();
  });
  it('exposes actionable formatting and emoji controls without duplicate disabled media placeholders', async () => {
    mockBase(); renderDetail(); await screen.findByRole('heading', { name: 'Joana' });
    for (const name of ['Negrito', 'Itálico', 'Tachado', 'Monoespaçado', 'Emojis']) expect(screen.getByRole('button', { name })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Anexar arquivo' })).not.toBeInTheDocument();
    expect(screen.queryByText('indisponível nesta versão')).not.toBeInTheDocument();
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
  it('reconciles a renamed contact without aborting the P1 history refresh on rerender', async () => {
    mockBase(); renderDetail(); await screen.findByRole('heading', { name: 'Joana' });
    vi.mocked(chatApi.getConversation).mockResolvedValue({ ...conversation, contactName: 'Nome atualizado' });
    vi.mocked(chatApi.getContact).mockResolvedValue({ ...contact, name: 'Nome atualizado' });
    vi.mocked(chatApi.listMessages).mockResolvedValue({ items: [message('renamed-message', 'renamed-client', 'Histórico reconciliado')], nextCursor: null });
    await act(async () => { await realtimeBus.reconcile('org-1'); });
    expect(await screen.findByRole('heading', { name: 'Nome atualizado' })).toBeInTheDocument();
    expect(screen.getByText('Histórico reconciliado')).toBeInTheDocument();
  });

});

it.each(['resolved', 'rejected'])('P1.2 keeps Core DELIVERED when delayed POST is %s after message.updated REST', async outcome => {
  mockBase(); vi.spyOn(chatApi, 'listTeamMembers').mockResolvedValue({ items: [], nextCursor: null });
  let finish!: (value: InternalTextMessage) => void, fail!: (reason: Error) => void;
  const send = vi.spyOn(chatApi, 'sendMessage').mockImplementation(() => new Promise((resolve, reject) => { finish = resolve; fail = reject; }));
  const view = renderDetail(); await screen.findByRole('textbox', { name: 'Escrever mensagem' });
  fireEvent.change(screen.getByRole('textbox', { name: 'Escrever mensagem' }), { target: { value: 'Status sintético' } });
  fireEvent.click(screen.getByRole('button', { name: 'Enviar mensagem' })); await screen.findByText('Enviando');
  const pending = { ...message('persisted-status', send.mock.calls[0]![1].clientMessageId, 'Status sintético'), status: 'PENDING' as const };
  vi.mocked(chatApi.listMessages).mockResolvedValue({ items: [{ ...pending, status: 'DELIVERED' }], nextCursor: null });
  await act(async () => { await realtimeBus.emit({ version: 1, eventId: '17', organizationId: 'org-1', type: 'message.updated', entityId: pending.id, occurredAt: pending.updatedAt, payload: { resourceId: pending.id, conversationId: 'conv-1' } }); });
  await screen.findByText('Entregue');
  await act(async () => { if (outcome === 'resolved') finish(pending); else fail(new Error('synthetic lost POST response')); });
  expect(screen.getByText('Entregue')).toBeInTheDocument(); expect(screen.queryByText('Enviando')).toBeNull(); expect(view.container.querySelectorAll('.message-bubble')).toHaveLength(1);
  localStorage.clear(); vi.restoreAllMocks();
});


it('P1.2 rejects a pagination response from before authorization reconciliation without clearing the current view', async () => {
  mockBase(); vi.spyOn(chatApi, 'listTeamMembers').mockResolvedValue({ items: [], nextCursor: null });
  vi.mocked(chatApi.listMessages).mockResolvedValueOnce({ items: [message('old', 'old-client', 'Antes')], nextCursor: 'old-cursor' });
  renderDetail(); await screen.findByText('Antes'); const history = screen.getByRole('region', { name: 'Histórico de mensagens' });
  let finish!: (value: { items: InternalTextMessage[]; nextCursor: null }) => void;
  vi.mocked(chatApi.listMessages).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockResolvedValue({ items: [message('new', 'new-client', 'Autorizada agora')], nextCursor: null });
  fireEvent.click(screen.getByRole('button', { name: 'Carregar mensagens anteriores' })); await waitFor(() => expect(finish).toBeTypeOf('function'));
  await act(async () => { await realtimeBus.reconcile('org-1'); }); await screen.findByText('Autorizada agora');
  await act(async () => finish({ items: [message('stale-page', 'stale-client', 'Página anterior ao novo escopo')], nextCursor: null }));
  expect(screen.queryByText('Página anterior ao novo escopo')).toBeNull(); expect(screen.getByRole('region', { name: 'Histórico de mensagens' })).toBe(history); localStorage.clear(); vi.restoreAllMocks();
});


it('P1.2 preserves loaded authorized notes during reconnect reconciliation', async () => {
  mockBase(); vi.spyOn(chatApi, 'listTeamMembers').mockResolvedValue({ items: [], nextCursor: null });
  const recent = { id: 'recent-note', authorUserId: 'user-1', body: 'Nota recente', createdAt: '2026-10-13T00:00:02Z' };
  const older = { ...recent, id: 'older-note', body: 'Nota anterior carregada', createdAt: '2026-10-13T00:00:01Z' };
  vi.mocked(chatApi.listNotes).mockResolvedValueOnce({ items: [recent], nextCursor: 'notes-old' }).mockResolvedValueOnce({ items: [older], nextCursor: null });
  renderDetail(); await screen.findByText('Nota recente'); fireEvent.click(screen.getByRole('button', { name: 'Carregar notas anteriores' }));
  const node = await screen.findByText('Nota anterior carregada');
  vi.mocked(chatApi.listNotes).mockResolvedValueOnce({ items: [recent], nextCursor: 'notes-old' }).mockResolvedValueOnce({ items: [older], nextCursor: null });
  await act(async () => { await realtimeBus.reconcile('org-1'); }); expect(screen.getByText('Nota anterior carregada')).toBe(node); expect(chatApi.listNotes).toHaveBeenCalledTimes(4);
  localStorage.clear(); vi.restoreAllMocks();
});

 it('P1.2 point receipts update an older row without replacing history or querying pages', async () => {
   mockBase(); vi.mocked(chatApi.getConversation).mockResolvedValue({ ...conversation, readScope: 'scope-a' });
   const pending = { ...message('older-row', 'stable-client', 'Voz antiga'), status: 'PENDING' as const };
   vi.mocked(chatApi.listMessages).mockResolvedValue({ items: [pending], nextCursor: null });
   vi.mocked(chatApi.getMessage).mockResolvedValue({ ...pending, status: 'DELIVERED' });
   renderDetail(); await screen.findByText('Enviando');
   const node = screen.getByText('Voz antiga').closest('article');
   await act(async () => { await realtimeBus.emit({ version: 1, eventId: 'point-1', organizationId: 'org-1', type: 'message.updated', entityId: pending.id, occurredAt: pending.updatedAt, payload: { resourceId: pending.id, conversationId: 'conv-1' } }); });
   expect(screen.getByText('Entregue')).toBeInTheDocument(); expect(screen.getByText('Voz antiga').closest('article')).toBe(node);
   expect(chatApi.listMessages).toHaveBeenCalledTimes(1); expect(chatApi.getMessage).toHaveBeenCalledWith('conv-1', pending.id, expect.any(AbortSignal)); localStorage.clear(); vi.restoreAllMocks();
 });
 it.each([false, true])('P1.2 revalidation with scope changed=%s retains only authorized loaded rows', async changed => {
   mockBase(); vi.mocked(chatApi.getConversation).mockResolvedValue({ ...conversation, readScope: 'scope-a' });
   vi.mocked(chatApi.listMessages).mockResolvedValueOnce({ items: [message('older', 'older-client', 'Página carregada')], nextCursor: null }).mockResolvedValue({ items: [message('new', 'new-client', 'Janela nova')], nextCursor: null });
   renderDetail(); await screen.findByText('Página carregada'); const node = screen.getByText('Página carregada').closest('article');
   vi.mocked(chatApi.getConversation).mockResolvedValue({ ...conversation, readScope: changed ? 'scope-b' : 'scope-a' });
   await act(async () => { await realtimeBus.reconcile('org-1'); });
   await screen.findByText('Janela nova');
   if (changed) expect(screen.queryByText('Página carregada')).not.toBeInTheDocument(); else expect(screen.getByText('Página carregada').closest('article')).toBe(node); localStorage.clear(); vi.restoreAllMocks();
 });


it.each(['upload', 'message'])('P1.1 retains the recording and reuses intent and uploaded media after %s failure', async stage => {
  mockBase(); vi.spyOn(chatApi, 'listTeamMembers').mockResolvedValue({ items: [], nextCursor: null });
  vi.mocked(chatApi.getConversation).mockResolvedValue({ ...conversation, provider: 'WHATSAPP_WEB', mediaEnabled: true, outboundEnabled: true });
  const savedMedia = { mediaId: 'recorded-media', type: 'VOICE', mimeType: 'audio/ogg', fileName: 'mensagem-de-voz.ogg', size: 10, state: 'READY' };
  const upload = vi.spyOn(chatApi, 'uploadMedia');
  if (stage === 'upload') upload.mockRejectedValueOnce(new ApiError(503, 'server', 'MEDIA_UPLOAD_FAILED', 'MEDIA_UPLOAD_FAILED'));
  upload.mockResolvedValue(savedMedia);
  const send = vi.spyOn(chatApi, 'sendMessage');
  if (stage === 'message') send.mockRejectedValueOnce(new ApiError(403, 'forbidden', 'PERMISSION_DENIED', 'PERMISSION_DENIED'));
  send.mockImplementation(async (_id, payload) => ({ ...message('saved-voice', payload.clientMessageId, ''), type: 'VOICE', media: savedMedia, direction: 'OUTBOUND' }));
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:voice-preview') });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  const track = { stop: vi.fn() };
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: vi.fn(async () => ({ getTracks: () => [track] })) } });
  class Recorder {
    static isTypeSupported() { return true; } state = 'inactive'; ondataavailable?: (event: { data: Blob }) => void; onstop?: () => void;
    start() { this.state = 'recording'; }
    stop() { this.state = 'inactive'; this.ondataavailable?.({ data: new Blob(['synthetic EBML chunk'], { type: 'audio/webm' }) }); this.onstop?.(); }
  }
  vi.stubGlobal('MediaRecorder', Recorder);
  renderDetail(); await screen.findByRole('button', { name: 'Gravar voz' });
  fireEvent.click(screen.getByRole('button', { name: 'Gravar voz' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Concluir gravação' })); await screen.findByText('mensagem-de-voz.webm');
  fireEvent.click(screen.getByRole('button', { name: 'Enviar mensagem' })); await screen.findByText('Erro');
  expect(screen.getByLabelText('Prévia do áudio')).toHaveAttribute('src', 'blob:voice-preview');
  expect(screen.getByRole('alert')).toHaveTextContent(stage === 'upload' ? 'upload da mídia (MEDIA_UPLOAD_FAILED)' : 'registrar a mensagem (PERMISSION_DENIED)');
  fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' })); await screen.findByText('Enviada');
  expect(upload).toHaveBeenCalledTimes(stage === 'upload' ? 2 : 1);
  expect(send).toHaveBeenCalledTimes(stage === 'upload' ? 1 : 2);
  expect(upload.mock.calls[0]![1]).toMatchObject({ name: 'mensagem-de-voz.webm', type: 'audio/webm' }); expect(upload.mock.calls[0]![2]).toBe('VOICE');
  if (stage === 'message') expect(send.mock.calls[0]![1]).toEqual(send.mock.calls[1]![1]);
  expect(screen.queryByLabelText('Prévia do áudio')).toBeNull();
  delete (navigator as unknown as { mediaDevices?: unknown }).mediaDevices; localStorage.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});

it.each([false, true])('P1.1 UNKNOWN confirmation preserves a replacement recording=%s without resending', async replaced => {
  mockBase(); vi.spyOn(chatApi, 'listTeamMembers').mockResolvedValue({ items: [], nextCursor: null });
  vi.mocked(chatApi.getConversation).mockResolvedValue({ ...conversation, provider: 'WHATSAPP_WEB', mediaEnabled: true, outboundEnabled: true });
  const media = { mediaId: 'voice-unknown', type: 'VOICE', mimeType: 'audio/ogg', fileName: 'voice.ogg', size: 10, state: 'READY' };
  const upload = vi.spyOn(chatApi, 'uploadMedia').mockResolvedValue(media);
  const send = vi.spyOn(chatApi, 'sendMessage').mockRejectedValue(new ApiError(0, 'network', 'offline'));
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:voice') });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  const view = renderDetail(); await screen.findByRole('button', { name: 'Anexar mídia' });
  const input = view.container.querySelector('input[type=file]')!;
  fireEvent.change(input, { target: { files: [new File(['synthetic'], 'recorded.webm', { type: 'audio/webm' })] } });
  fireEvent.click(screen.getByRole('button', { name: 'Enviar mensagem' })); await screen.findByText('Resultado incerto — aguardando confirmação');
  await waitFor(() => expect(screen.getByRole('button', { name: 'Enviar mensagem' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Enviar mensagem' }));
  expect(send).toHaveBeenCalledTimes(1); expect(upload).toHaveBeenCalledTimes(1); expect(screen.getByLabelText('Prévia do áudio')).toBeInTheDocument();
  if (replaced) { fireEvent.click(screen.getByRole('button', { name: 'Descartar anexo' })); fireEvent.change(input, { target: { files: [new File(['second'], 'nova-gravacao.webm', { type: 'audio/webm' })] } }); }
  const saved = { ...message('unknown-persisted', send.mock.calls[0]![1].clientMessageId, ''), status: 'DELIVERED' as const, direction: 'OUTBOUND' as const, type: 'AUDIO' as const, media };
  vi.mocked(chatApi.listMessages).mockResolvedValue({ items: [saved], nextCursor: null });
  fireEvent.click(screen.getByRole('button', { name: 'Verificar envio' })); await screen.findByText('Entregue');
  expect(send).toHaveBeenCalledTimes(1); expect(upload).toHaveBeenCalledTimes(1); expect(view.container.querySelectorAll('.message-bubble')).toHaveLength(1); if (replaced) expect(screen.getByText('nova-gravacao.webm')).toBeInTheDocument(); else expect(screen.queryByLabelText('Prévia do áudio')).toBeNull();
  localStorage.clear(); vi.restoreAllMocks();
});

it('P1.1 explicit discard removes the failed local intent and allows a fresh attachment', async () => {
 mockBase(); vi.spyOn(chatApi, 'listTeamMembers').mockResolvedValue({ items: [], nextCursor: null });
 vi.mocked(chatApi.getConversation).mockResolvedValue({ ...conversation, provider: 'WHATSAPP_WEB', mediaEnabled: true, outboundEnabled: true });
 const upload = vi.spyOn(chatApi, 'uploadMedia').mockRejectedValue(new ApiError(503, 'server', 'MEDIA_UPLOAD_FAILED', 'MEDIA_UPLOAD_FAILED'));
 const send = vi.spyOn(chatApi, 'sendMessage');
 Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:preview') }); Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
 const view = renderDetail(); await screen.findByRole('button', { name: 'Anexar mídia' }); const input = view.container.querySelector('input[type=file]')!;
 fireEvent.change(input, { target: { files: [new File(['voice'], 'discard.webm', { type: 'audio/webm' })] } });
 fireEvent.click(screen.getByRole('button', { name: 'Enviar mensagem' })); await screen.findByText('Erro');
 fireEvent.click(screen.getByRole('button', { name: 'Descartar anexo' })); expect(view.container.querySelectorAll('.message-bubble')).toHaveLength(0); expect(screen.queryByText('discard.webm')).toBeNull();
 fireEvent.change(input, { target: { files: [new File(['new'], 'new.webm', { type: 'audio/webm' })] } }); fireEvent.click(screen.getByRole('button', { name: 'Enviar mensagem' })); await screen.findByText('Erro');
 expect(upload).toHaveBeenCalledTimes(2); expect(upload.mock.calls[1]![1].name).toBe('new.webm'); expect(send).not.toHaveBeenCalled(); localStorage.clear(); vi.restoreAllMocks();
});
