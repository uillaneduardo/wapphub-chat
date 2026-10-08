import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProvidersPage, DemoSimulatorPage } from './Providers';
import { chatApi } from '../../lib/chatApi';
import type { InternalTextMessage, Provider } from '../../types/chat';

const sessionState = vi.hoisted(() => ({ session: { user: { id: 'owner-1', name: 'Owner', email: 'owner@example.test' }, permissions: ['providers.manage', 'providers.simulate', 'messages.read'] } }));
vi.mock('../session/SessionContext', () => ({ useSession: () => sessionState }));
const providerList: Provider[] = [
  { code: 'DEMO', name: 'Demo Provider', description: 'Simulado', state: 'AVAILABLE', enabled: false },
  { code: 'META', name: 'Meta', description: 'Em desenvolvimento', state: 'IN_DEVELOPMENT', enabled: false },
];
const message: InternalTextMessage = { id: 'm-1', conversationId: 'conv-1', senderUserId: null, senderContactId: 'contact-1', clientMessageId: null, direction: 'INBOUND', type: 'TEXT', body: 'Olá, atendimento', status: 'SENT', createdAt: '2026-10-08T12:00:00Z', updatedAt: '2026-10-08T12:00:00Z' };

describe('Demo provider screens', () => {
  afterEach(() => { vi.restoreAllMocks(); sessionState.session.permissions = ['providers.manage', 'providers.simulate', 'messages.read']; });
  it('shows Meta unavailable and enables Demo through the provider API', async () => {
    vi.spyOn(chatApi, 'listProviders').mockResolvedValue({ items: providerList });
    const toggle = vi.spyOn(chatApi, 'setDemoProvider').mockResolvedValue({ enabled: true });
    render(<MemoryRouter><ProvidersPage /></MemoryRouter>);
    await screen.findByRole('heading', { name: 'Meta' });
    expect(screen.getByRole('button', { name: 'Configuração indisponível' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Ativar Demo' }));
    await waitFor(() => expect(toggle).toHaveBeenCalledWith(true));
  });
  it('uses the authenticated contact context in the simulator and sends through Demo ingestion', async () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'external-message-1' });
    vi.spyOn(chatApi, 'listDemoContacts').mockResolvedValue({ enabled: true, items: [{ contactId: 'contact-1', name: 'Contato Demo 01', conversationId: 'conv-1' }] });
    vi.spyOn(chatApi, 'listMessages').mockResolvedValue({ items: [message], nextCursor: null });
    const send = vi.spyOn(chatApi, 'sendDemoMessage').mockResolvedValue({ ...message, id: 'm-2', direction: 'INBOUND', body: 'Preciso de suporte' });
    render(<MemoryRouter><DemoSimulatorPage /></MemoryRouter>);
    await screen.findByText('Olá, atendimento');
    fireEvent.change(screen.getByRole('textbox', { name: 'Mensagem como contato externo' }), { target: { value: 'Preciso de suporte' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    await waitFor(() => expect(send).toHaveBeenCalledWith('contact-1', 'external-message-1', 'Preciso de suporte'));
    expect(screen.getAllByText('Contato Demo 01')).toHaveLength(2);
  });
  it('blocks the simulator UI when provider permission is absent', () => {
    sessionState.session.permissions = ['messages.read'];
    const contacts = vi.spyOn(chatApi, 'listDemoContacts');
    render(<MemoryRouter><DemoSimulatorPage /></MemoryRouter>);
    expect(screen.getByRole('alert')).toHaveTextContent('não pode abrir o simulador');
    expect(contacts).not.toHaveBeenCalled();
  });
  it('preserves disabled provider history and prevents new contact messages', async () => {
    vi.spyOn(chatApi, 'listDemoContacts').mockResolvedValue({ enabled: false, items: [{ contactId: 'contact-1', name: 'Contato Demo 01', conversationId: 'conv-1' }] });
    vi.spyOn(chatApi, 'listMessages').mockResolvedValue({ items: [message], nextCursor: null });
    render(<MemoryRouter><DemoSimulatorPage /></MemoryRouter>);
    await screen.findByText('Olá, atendimento');
    expect(screen.getByRole('status')).toHaveTextContent('desativado');
    expect(screen.getByRole('textbox', { name: 'Mensagem como contato externo' })).toBeDisabled();
  });
  it('shows an API failure in the simulator', async () => {
    vi.spyOn(chatApi, 'listDemoContacts').mockRejectedValue(new Error('Falha temporária'));
    render(<MemoryRouter><DemoSimulatorPage /></MemoryRouter>);
    expect(await screen.findByRole('alert')).toHaveTextContent('Falha temporária');
  });
});
