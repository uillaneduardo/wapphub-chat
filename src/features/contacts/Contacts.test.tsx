import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ContactBrowser } from './ContactBrowser';
import { ContactForm } from './ContactForm';
import { ContactsPage, ContactDetailPage } from './Contacts';
import { chatApi } from '../../lib/chatApi';
import { realtimeBus } from '../../lib/realtimeBus';
import type { Contact, CursorPage } from '../../types/chat';

const state = vi.hoisted(() => ({ session: { user: { id: 'u-1' }, currentOrganizationId: 'org-1', permissions: ['contacts.read', 'contacts.write', 'conversations.create', 'conversations.read'] } }));
vi.mock('../session/SessionContext', () => ({ useSession: () => state }));
const ana: Contact = { id: 'contact-1', name: 'Ana', primaryIdentifier: 'ana@example.test', providers: [], createdAt: '2026-10-08T00:00:00Z', updatedAt: '2026-10-08T00:00:00Z' };
const page = (items = [ana], nextCursor: string | null = null): CursorPage<Contact> => ({ items, nextCursor });
function browser() { return render(<MemoryRouter><ContactBrowser /></MemoryRouter>); }
function fill(name = 'Ana', identifier = 'ana@example.test') { fireEvent.change(screen.getByLabelText('Nome'), { target: { value: name } }); fireEvent.change(screen.getByLabelText('Identificador principal'), { target: { value: identifier } }); }
afterEach(() => { vi.restoreAllMocks(); state.session.currentOrganizationId = 'org-1'; state.session.permissions = ['contacts.read', 'contacts.write', 'conversations.create', 'conversations.read']; });

describe('M1 contacts browser', () => {
  it('lists names, identifiers, provider origin and details links', async () => {
    vi.spyOn(chatApi, 'listContacts').mockResolvedValue(page([{ ...ana, providers: ['DEMO'] }])); browser();
    expect(await screen.findByText('Ana')).toBeInTheDocument(); expect(screen.getByText('ana@example.test')).toBeInTheDocument(); expect(screen.queryByText('DEMO')).not.toBeInTheDocument(); expect(screen.getByRole('link', { name: /Ana/ })).toHaveAttribute('href', '/app/contacts/contact-1');
  });
  it('searches on explicit submit and resets cursor pagination', async () => {
    const list = vi.spyOn(chatApi, 'listContacts').mockResolvedValueOnce(page()).mockResolvedValue(page([{ ...ana, name: 'Resultado' }])); browser(); await screen.findByText('Ana');
    fireEvent.change(screen.getByRole('searchbox', { name: 'Pesquisar contatos' }), { target: { value: '  Nome ou email  ' } }); expect(list).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Pesquisar' })); await screen.findByText('Resultado'); expect(list).toHaveBeenLastCalledWith({ q: 'Nome ou email' }, expect.any(AbortSignal));
  });
  it('loads the next signed cursor and deduplicates records', async () => {
    const list = vi.spyOn(chatApi, 'listContacts').mockResolvedValueOnce(page([ana], 'signed')).mockResolvedValueOnce(page([ana, { ...ana, id: 'contact-2', name: 'Bia' }])); browser(); await screen.findByText('Ana');
    fireEvent.click(screen.getByRole('button', { name: 'Carregar mais contatos' })); await screen.findByText('Bia'); expect(screen.getAllByText('Ana')).toHaveLength(1); expect(list).toHaveBeenLastCalledWith({ q: undefined, cursor: 'signed' }, expect.any(AbortSignal));
  });
  it('shows REST errors and permits retry', async () => {
    vi.spyOn(chatApi, 'listContacts').mockRejectedValueOnce(new Error('500')).mockResolvedValue(page()); browser(); await screen.findByRole('alert'); fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' })); expect(await screen.findByText('Ana')).toBeInTheDocument();
  });
  it('does not fetch contacts without read permission', () => {
    state.session.permissions = []; const list = vi.spyOn(chatApi, 'listContacts'); browser(); expect(screen.getByRole('alert')).toHaveTextContent('não permite'); expect(list).not.toHaveBeenCalled();
  });
  it('cancels and ignores the previous tenant response on context change', async () => {
    let finish!: (value: CursorPage<Contact>) => void; let oldSignal!: AbortSignal;
    vi.spyOn(chatApi, 'listContacts').mockImplementationOnce((_query, signal) => { oldSignal = signal!; return new Promise((resolve) => { finish = resolve; }); }).mockResolvedValue(page([{ ...ana, name: 'Outro tenant' }]));
    const view = browser(); state.session.currentOrganizationId = 'org-2'; view.rerender(<MemoryRouter><ContactBrowser /></MemoryRouter>); await screen.findByText('Outro tenant'); expect(oldSignal.aborted).toBe(true);
    await act(async () => finish(page())); expect(screen.queryByText('Ana')).not.toBeInTheDocument();
  });
  it('protects a P1 resync from a stale bootstrap response', async () => {
    let finish!: (value: CursorPage<Contact>) => void;
    vi.spyOn(chatApi, 'listContacts').mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; })).mockResolvedValue(page([{ ...ana, name: 'Atualizada' }])); browser();
    await act(async () => { await realtimeBus.reconcile('org-1'); }); await screen.findByText('Atualizada'); await act(async () => finish(page())); expect(screen.queryByText('Ana')).not.toBeInTheDocument();
  });
  it('removes cached contact data when a reconciliation denies access', async () => {
    vi.spyOn(chatApi, 'listContacts').mockResolvedValueOnce(page()).mockRejectedValue({ status: 403 }); browser(); await screen.findByText('Ana'); await act(async () => { await realtimeBus.reconcile('org-1'); }); expect(screen.queryByText('Ana')).not.toBeInTheDocument(); expect(screen.getByRole('alert')).toHaveTextContent('não permite');
  });
});

describe('M1 contacts mutations', () => {
  it('validates blank fields and maximum lengths before POST', async () => {
    const create = vi.spyOn(chatApi, 'createContact'); render(<ContactForm onSaved={vi.fn()} />); fill('   ', 'valid'); fireEvent.submit(screen.getByRole('form')); expect(await screen.findByRole('alert')).toHaveTextContent('válidos'); expect(create).not.toHaveBeenCalled();
    fill('N'.repeat(121)); fireEvent.submit(screen.getByRole('form')); expect(create).not.toHaveBeenCalled();
  });
  it('trims supported fields, prevents duplicate submit and reconciles through P1', async () => {
    let finish!: (value: Contact) => void; const create = vi.spyOn(chatApi, 'createContact').mockImplementation(() => new Promise((resolve) => { finish = resolve; })); const reconcile = vi.spyOn(realtimeBus, 'reconcile').mockResolvedValue(); const saved = vi.fn();
    render(<ContactForm onSaved={saved} />); fill('  Ana  ', '  ana@example.test  '); fireEvent.submit(screen.getByRole('form')); fireEvent.submit(screen.getByRole('form')); expect(create).toHaveBeenCalledTimes(1); expect(create).toHaveBeenCalledWith({ name: 'Ana', primaryIdentifier: 'ana@example.test' });
    await act(async () => finish(ana)); expect(reconcile).toHaveBeenCalledWith('org-1'); expect(saved).toHaveBeenCalledWith(ana);
  });
  it('reports duplicate identifiers without presenting raw backend errors', async () => {
    vi.spyOn(chatApi, 'createContact').mockRejectedValue({ status: 409, message: 'Prisma private' }); render(<ContactForm onSaved={vi.fn()} />); fill(); fireEvent.submit(screen.getByRole('form')); expect(await screen.findByRole('alert')).toHaveTextContent('Já existe'); expect(screen.queryByText('Prisma private')).not.toBeInTheDocument();
  });
  it('updates mutable manual fields and preserves provider bindings on linked contacts', async () => {
    const update = vi.spyOn(chatApi, 'updateContact').mockResolvedValue({ ...ana, providers: ['DEMO'], name: 'Nome novo' }); vi.spyOn(realtimeBus, 'reconcile').mockResolvedValue();
    render(<ContactForm contact={{ ...ana, providers: ['DEMO'] }} onSaved={vi.fn()} />); expect(screen.getByLabelText('Identificador principal')).toHaveAttribute('readonly'); fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Nome novo' } }); fireEvent.submit(screen.getByRole('form')); await waitFor(() => expect(update).toHaveBeenCalledWith('contact-1', { name: 'Nome novo' }));
  });
  it('retries only reconciliation after a successful POST and failed refresh', async () => {
    const create = vi.spyOn(chatApi, 'createContact').mockResolvedValue(ana); const refresh = vi.spyOn(realtimeBus, 'reconcile').mockRejectedValueOnce(new Error('500')).mockResolvedValue(); const saved = vi.fn();
    render(<ContactForm onSaved={saved} />); fill(); fireEvent.submit(screen.getByRole('form')); expect(await screen.findByRole('alert')).toHaveTextContent('Contato salvo'); fireEvent.click(screen.getByRole('button', { name: 'Atualizar tela' })); await waitFor(() => expect(saved).toHaveBeenCalled()); expect(create).toHaveBeenCalledTimes(1); expect(refresh).toHaveBeenCalledTimes(2);
  });
  it('does not send mutations without contacts.write', () => {
    state.session.permissions = ['contacts.read']; const create = vi.spyOn(chatApi, 'createContact'); render(<ContactForm onSaved={vi.fn()} />); fireEvent.submit(screen.getByRole('form')); expect(create).not.toHaveBeenCalled(); expect(screen.getByRole('button', { name: 'Salvar contato' })).toBeDisabled();
  });
  it('ignores a successful response after form teardown', async () => {
    let finish!: (value: Contact) => void; vi.spyOn(chatApi, 'createContact').mockImplementation(() => new Promise((resolve) => { finish = resolve; })); const saved = vi.fn(); const view = render(<ContactForm onSaved={saved} />); fill(); fireEvent.submit(screen.getByRole('form')); view.unmount(); await act(async () => finish(ana)); expect(saved).not.toHaveBeenCalled();
  });
  it('creates from the actual contacts route and opens the new details page', async () => {
    vi.spyOn(chatApi, 'listContacts').mockResolvedValue(page([])); vi.spyOn(chatApi, 'createContact').mockResolvedValue(ana); vi.spyOn(chatApi, 'getContact').mockResolvedValue(ana);
    render(<MemoryRouter initialEntries={['/app/contacts']}><Routes><Route path="/app/contacts" element={<ContactsPage />} /><Route path="/app/contacts/:contactId" element={<ContactDetailPage />} /></Routes></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Novo contato' })); fill(); fireEvent.submit(screen.getByRole('form')); expect(await screen.findByRole('heading', { name: 'Ana' })).toBeInTheDocument(); expect(screen.getByRole('link', { name: 'Nova conversa interna' })).toHaveAttribute('href', '/app/conversations/new?contactId=contact-1');
  });
  it('edits both supported fields on a manually created contact', async () => {
    const update = vi.spyOn(chatApi, 'updateContact').mockResolvedValue({ ...ana, name: 'Bia', primaryIdentifier: 'new-id' }); vi.spyOn(realtimeBus, 'reconcile').mockResolvedValue();
    render(<ContactForm contact={ana} onSaved={vi.fn()} />); fill(' Bia ', ' new-id '); fireEvent.submit(screen.getByRole('form')); await waitFor(() => expect(update).toHaveBeenCalledWith(ana.id, { name: 'Bia', primaryIdentifier: 'new-id' }));
  });
  it('offers read-only details without edit permission', async () => {
    state.session.permissions = ['contacts.read']; vi.spyOn(chatApi, 'getContact').mockResolvedValue(ana);
    render(<MemoryRouter initialEntries={['/app/contacts/contact-1']}><Routes><Route path="/app/contacts/:contactId" element={<ContactDetailPage />} /></Routes></MemoryRouter>);
    await screen.findByRole('heading', { name: 'Ana' }); expect(screen.queryByRole('button', { name: 'Editar contato' })).not.toBeInTheDocument(); expect(screen.queryByRole('link', { name: 'Nova conversa interna' })).not.toBeInTheDocument();
  });

  it('does not replace reconciled contact details with a stale bootstrap error', async () => {
    let fail!: (reason: Error) => void;
    vi.spyOn(chatApi, 'getContact').mockImplementationOnce(() => new Promise((_resolve, reject) => { fail = reject; })).mockResolvedValue(ana);
    render(<MemoryRouter initialEntries={['/app/contacts/contact-1']}><Routes><Route path="/app/contacts/:contactId" element={<ContactDetailPage />} /></Routes></MemoryRouter>);
    await act(async () => { await realtimeBus.reconcile('org-1'); }); await screen.findByRole('heading', { name: 'Ana' });
    await act(async () => fail(new Error('Stale 500'))); expect(screen.queryByRole('alert')).not.toBeInTheDocument(); expect(screen.getByRole('heading', { name: 'Ana' })).toBeInTheDocument();
  });

});
