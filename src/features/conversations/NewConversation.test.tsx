import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { NewConversationPage } from './NewConversation';
import { ConversationsLayout, ConversationView } from './Conversations';
import { chatApi } from '../../lib/chatApi';
import { realtimeBus } from '../../lib/realtimeBus';
import type { Contact, Conversation, CreateConversationResult } from '../../types/chat';

const state = vi.hoisted(() => ({ session: { user: { id: 'u-1', name: 'Ana' }, currentOrganizationId: 'org-1', permissions: ['contacts.read', 'contacts.write', 'conversations.create', 'conversations.read', 'messages.read', 'messages.send'] } }));
vi.mock('../session/SessionContext', () => ({ useSession: () => state }));
const contact: Contact = { id: 'contact-1', name: 'Contato escolhido', primaryIdentifier: 'id-1', providers: [], createdAt: '2026-10-08T00:00:00Z', updatedAt: '2026-10-08T00:00:00Z' };
const conversation: Conversation = { id: 'conv-1', contactId: contact.id, contactName: contact.name, lastMessagePreview: null, provider: null, tagIds: [], status: 'OPEN', assignedUserId: null, archivedAt: null, createdAt: '2026-10-08T00:00:00Z', updatedAt: '2026-10-08T00:00:00Z', lastMessageAt: '2026-10-08T00:00:00Z', visibility: 'FULL' };
function renderFlow(route = '/app/conversations/new') { return render(<MemoryRouter initialEntries={[route]}><Routes><Route path="/app/conversations" element={<ConversationsLayout />}><Route path="new" element={<NewConversationPage />} /><Route path=":conversationId" element={<ConversationView />} /></Route></Routes></MemoryRouter>); }
async function select() { fireEvent.click(await screen.findByRole('button', { name: 'Selecionar Contato escolhido' })); }

describe('M1 manual internal conversation flow', () => {
  beforeEach(() => {
    vi.spyOn(chatApi, 'listContacts').mockResolvedValue({ items: [contact], nextCursor: null });
    vi.spyOn(chatApi, 'listConversations').mockImplementation(async (query) => ({ items: query.scope === 'unassigned' ? [conversation] : [], nextCursor: null }));
    vi.spyOn(chatApi, 'getConversation').mockResolvedValue(conversation);
    vi.spyOn(chatApi, 'getContact').mockResolvedValue(contact);
    vi.spyOn(chatApi, 'listMessages').mockResolvedValue({ items: [], nextCursor: null });
    vi.spyOn(chatApi, 'listTeamMembers').mockResolvedValue({ items: [], nextCursor: null });
  });
  afterEach(() => { vi.restoreAllMocks(); state.session.currentOrganizationId = 'org-1'; state.session.permissions = ['contacts.read', 'contacts.write', 'conversations.create', 'conversations.read', 'messages.read', 'messages.send']; });
  it('creates without sending, reconciles P1, shows the inbox row and opens the usable composer', async () => {
    const create = vi.spyOn(chatApi, 'createConversation').mockResolvedValue({ ...conversation, reused: false }); const send = vi.spyOn(chatApi, 'sendMessage'); const reconcile = vi.spyOn(realtimeBus, 'reconcile'); const emit = vi.spyOn(realtimeBus, 'emit');
    renderFlow(); await select(); fireEvent.click(screen.getByRole('button', { name: 'Criar ou abrir conversa interna' }));
    await screen.findByRole('heading', { name: 'Contato escolhido' }); expect(create).toHaveBeenCalledWith('contact-1'); expect(send).not.toHaveBeenCalled(); expect(reconcile).toHaveBeenCalledWith('org-1'); expect(emit).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox', { name: 'Escrever mensagem' })).toBeInTheDocument(); expect(screen.getByRole('tab', { name: 'Não atribuídas' })).toHaveAttribute('aria-selected', 'true'); expect(await screen.findByRole('link', { name: /Contato escolhido/ })).toHaveAttribute('href', '/app/conversations/conv-1?scope=unassigned');
  });
  it('opens an existing internal conversation with clear reuse feedback', async () => {
    vi.spyOn(chatApi, 'createConversation').mockResolvedValue({ ...conversation, reused: true }); renderFlow(); await select(); fireEvent.click(screen.getByRole('button', { name: 'Criar ou abrir conversa interna' })); expect(await screen.findByText('Conversa interna existente aberta.')).toBeInTheDocument();
  });
  it('prevents duplicate clicks while creation is pending', async () => {
    let finish!: (value: CreateConversationResult) => void; const create = vi.spyOn(chatApi, 'createConversation').mockImplementation(() => new Promise((resolve) => { finish = resolve; })); renderFlow(); await select(); const button = screen.getByRole('button', { name: 'Criar ou abrir conversa interna' }); fireEvent.click(button); fireEvent.click(button); expect(create).toHaveBeenCalledTimes(1); expect(button).toBeDisabled(); await act(async () => finish({ ...conversation, reused: false })); await screen.findByRole('heading', { name: 'Contato escolhido' });
  });
  it('handles conflict/failure and lets the user retry safely', async () => {
    const create = vi.spyOn(chatApi, 'createConversation').mockRejectedValueOnce({ status: 409 }).mockResolvedValue({ ...conversation, reused: true }); renderFlow(); await select(); fireEvent.click(screen.getByRole('button', { name: 'Criar ou abrir conversa interna' })); expect(await screen.findByRole('alert')).toHaveTextContent('conflito'); fireEvent.click(screen.getByRole('button', { name: 'Criar ou abrir conversa interna' })); await screen.findByText('Conversa interna existente aberta.'); expect(create).toHaveBeenCalledTimes(2);
  });
  it('does not repeat POST after a successful create but failed reconciliation', async () => {
    const create = vi.spyOn(chatApi, 'createConversation').mockResolvedValue({ ...conversation, reused: false }); vi.spyOn(realtimeBus, 'reconcile').mockRejectedValueOnce(new Error('REST 500')).mockResolvedValue(); renderFlow(); await select(); fireEvent.click(screen.getByRole('button', { name: 'Criar ou abrir conversa interna' })); expect(await screen.findByRole('alert')).toHaveTextContent('Conversa salva'); fireEvent.click(screen.getByRole('button', { name: 'Atualizar inbox e abrir' })); await screen.findByRole('heading', { name: 'Contato escolhido' }); expect(create).toHaveBeenCalledTimes(1);
  });
  it('creates a new contact inline before creating the internal conversation', async () => {
    vi.spyOn(chatApi, 'listContacts').mockResolvedValue({ items: [], nextCursor: null }); const save = vi.spyOn(chatApi, 'createContact').mockResolvedValue(contact); const create = vi.spyOn(chatApi, 'createConversation').mockResolvedValue({ ...conversation, reused: false }); renderFlow(); fireEvent.click(screen.getByRole('button', { name: 'Cadastrar novo contato' })); fireEvent.change(screen.getByLabelText('Nome'), { target: { value: contact.name } }); fireEvent.change(screen.getByLabelText('Identificador principal'), { target: { value: contact.primaryIdentifier } }); fireEvent.click(screen.getByRole('button', { name: 'Salvar contato' })); await screen.findByText(/Contato selecionado:/); expect(create).not.toHaveBeenCalled(); fireEvent.click(screen.getByRole('button', { name: 'Criar ou abrir conversa interna' })); await screen.findByRole('heading', { name: contact.name }); expect(save).toHaveBeenCalledWith({ name: contact.name, primaryIdentifier: contact.primaryIdentifier });
  });
  it('never offers an external channel or sends Demo data while Demo is unavailable', async () => {
    vi.mocked(chatApi.listContacts).mockResolvedValue({ items: [{ ...contact, providers: ['DEMO'] }], nextCursor: null }); const providers = vi.spyOn(chatApi, 'listProviders').mockResolvedValue({ items: [{ code: 'DEMO', name: 'Demo', description: '', state: 'AVAILABLE', enabled: false }] }); const external = vi.spyOn(chatApi, 'sendDemoMessage'); vi.spyOn(chatApi, 'createConversation').mockResolvedValue(conversation);
    renderFlow(); expect(screen.queryByText(/Meta está indisponível/)).not.toBeInTheDocument(); expect(screen.queryByRole('combobox', { name: /canal/i })).not.toBeInTheDocument(); await select(); fireEvent.click(screen.getByRole('button', { name: 'Criar ou abrir conversa interna' })); await screen.findByRole('heading', { name: contact.name }); expect(providers).not.toHaveBeenCalled(); expect(external).not.toHaveBeenCalled(); expect(chatApi.createConversation).toHaveBeenCalledWith(contact.id);
  });
  it('rejects missing creation or contacts read permission without calls to mutate', async () => {
    state.session.permissions = ['conversations.read']; const create = vi.spyOn(chatApi, 'createConversation'); renderFlow('/app/conversations/new?contactId=foreign'); expect(screen.getByRole('alert')).toHaveTextContent('não permite'); expect(chatApi.getContact).not.toHaveBeenCalled(); expect(chatApi.listContacts).not.toHaveBeenCalled(); expect(create).not.toHaveBeenCalled(); expect(screen.queryByRole('link', { name: 'Nova conversa' })).not.toBeInTheDocument();
  });
  it('clears the previous tenant selection and cancels a late creation navigation', async () => {
    let finish!: (value: CreateConversationResult) => void; const create = vi.spyOn(chatApi, 'createConversation').mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const view = renderFlow(); await select(); fireEvent.click(screen.getByRole('button', { name: 'Criar ou abrir conversa interna' })); state.session.currentOrganizationId = 'org-2';
    view.rerender(<MemoryRouter initialEntries={['/app/conversations/new']}><Routes><Route path="/app/conversations/new" element={<NewConversationPage />} /></Routes></MemoryRouter>);
    expect(screen.queryByText(/Contato selecionado:/)).not.toBeInTheDocument(); await act(async () => finish(conversation)); expect(screen.queryByRole('heading', { name: contact.name })).not.toBeInTheDocument(); expect(create).toHaveBeenCalledTimes(1);
  });
});
