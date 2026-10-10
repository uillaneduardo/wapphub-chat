import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { WebProviderCard } from './WebProvider';
import { ProvidersPage } from './Providers';
import { webProviderApi, type WebConnection } from '../../lib/webProviderApi';
import { chatApi } from '../../lib/chatApi';
import { ApiError } from '../../lib/api';
const auth = vi.hoisted(() => ({ session: { user: { id: 'owner' }, currentOrganizationId: 'org-a', membership: { permissionVersion: 1 }, permissions: ['providers.manage'] }, refreshSession: vi.fn(), expireSession: vi.fn() }));
vi.mock('../session/SessionContext', () => ({ useSession: () => auth }));
class FakeSocket {
  static instances: FakeSocket[] = []; onopen: (() => void) | null = null; onmessage: ((event: { data: string }) => void) | null = null; onclose: ((event: { code: number }) => void) | null = null;
  close = vi.fn(); constructor(public url: string) { FakeSocket.instances.push(this); }
  event(organizationId = 'org-a', id = '1') { this.onmessage?.({ data: JSON.stringify({ version: 1, type: 'provider.connection.updated', eventId: id, organizationId, entityId: 'channel', occurredAt: '2026-10-10T00:00:00Z', payload: { resourceId: 'channel' } }) }); }
}
const connection = (values: Partial<WebConnection> = {}): WebConnection => ({ id: 'channel', state: 'DISCONNECTED', uiState: 'DISCONNECTED', version: 1, qrRevision: 0, errorCode: null, lastCheckedAt: null, operation: null, sendingEnabled: false, mediaEnabled: false, ...values });
const ready = () => connection({ state: 'QR_REQUIRED', uiState: 'QR_READY', qrRevision: 1, version: 3 });
const renderCard = () => render(<MemoryRouter><WebProviderCard organizationId="org-a" /></MemoryRouter>);
const flush = async () => { for (let i = 0; i < 40; i++) await Promise.resolve(); };
describe('WhatsApp Web provider integration', () => {
  beforeEach(() => {
    vi.stubGlobal('WebSocket', FakeSocket); FakeSocket.instances = []; auth.session.currentOrganizationId = 'org-a'; auth.session.permissions = ['providers.manage'];
    vi.spyOn(webProviderApi, 'read').mockResolvedValue({ connection: connection() }); vi.spyOn(webProviderApi, 'create').mockResolvedValue(connection({ operation: { id: 'create-id', action: 'create', status: 'PENDING', errorCode: null } }));
    vi.spyOn(webProviderApi, 'command').mockResolvedValue(connection({ version: 2, operation: { id: 'cmd-id', action: 'connect', status: 'PENDING', errorCode: null } }));
    vi.spyOn(webProviderApi, 'qr').mockResolvedValue({ qr: 'SYNTHETIC_PRIVATE_QR', revision: 1, expiresInMs: 20000, expiresAt: new Date(Date.now() + 20000).toISOString() });
  });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); localStorage.clear(); sessionStorage.clear(); auth.refreshSession.mockClear(); auth.expireSession.mockClear(); });
  it.each([['DISCONNECTED', 'Desconectado'], ['CONNECTING', 'Conectando'], ['QR_READY', 'QR disponível'], ['CONNECTED', 'Conectado'], ['RECONNECTING', 'Reconectando'], ['ERROR', 'Erro de conexão']] as const)('presents actual %s state without simulated transitions', async (uiState, label) => {
    vi.mocked(webProviderApi.read).mockResolvedValue({ connection: connection({ uiState }) }); renderCard(); await screen.findByText(label); expect(webProviderApi.command).not.toHaveBeenCalled();
  });
  it('preserves real disconnected state and never starts or fetches a QR on mount', async () => {
    renderCard(); await screen.findByText('Desconectado'); expect(webProviderApi.command).not.toHaveBeenCalled(); expect(webProviderApi.qr).not.toHaveBeenCalled();
    expect(screen.getByText(/protocolo não oficial/)).toBeInTheDocument(); expect(FakeSocket.instances[0]?.url).toContain('/api/v1/providers/realtime');
  });
  it('creates an idle connection only after an explicit action and blocks duplicate commands', async () => {
    vi.mocked(webProviderApi.read).mockResolvedValue({ connection: null }); let complete!: (value: WebConnection) => void;
    vi.mocked(webProviderApi.create).mockImplementation(() => new Promise((done) => { complete = done; }));
    renderCard(); const create = await screen.findByRole('button', { name: 'Criar conexão' }); fireEvent.click(create); fireEvent.click(create); expect(webProviderApi.create).toHaveBeenCalledOnce();
    await act(async () => complete(connection({ operation: { id: 'create-id', action: 'create', status: 'PENDING', errorCode: null } }))); expect(screen.getByRole('button', { name: 'Solicitar QR Code' })).toBeDisabled(); expect(webProviderApi.command).not.toHaveBeenCalled();
  });
  it('requests a QR explicitly, shows pending operation without faking connecting state', async () => {
    renderCard(); const button = await screen.findByRole('button', { name: 'Solicitar QR Code' }); fireEvent.click(button);
    await waitFor(() => expect(webProviderApi.command).toHaveBeenCalledWith(expect.objectContaining({ version: 1 }), 'connect', expect.any(String), expect.any(AbortSignal)));
    expect(await screen.findByText(/Aguardando confirmação/)).toBeInTheDocument(); expect(screen.getByText('Desconectado')).toBeInTheDocument(); expect(webProviderApi.qr).not.toHaveBeenCalled();
  });
  it('renders a restricted QR as SVG with accessible instructions, without browser persistence', async () => {
    vi.mocked(webProviderApi.read).mockResolvedValue({ connection: ready() }); renderCard(); fireEvent.click(await screen.findByRole('button', { name: 'Exibir QR Code' }));
    const image = await screen.findByRole('img', { name: 'QR Code para vincular o WhatsApp' }); expect(image.tagName.toLowerCase()).toBe('svg'); expect(image.innerHTML).not.toContain('SYNTHETIC_PRIVATE_QR');
    expect(screen.getByText(/Aparelhos conectados/)).toBeInTheDocument(); expect(JSON.stringify(localStorage)).not.toContain('SYNTHETIC'); expect(JSON.stringify(sessionStorage)).not.toContain('SYNTHETIC');
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar QR Code' })); expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
  it('removes an expired QR and refreshes only when requested', async () => {
    vi.mocked(webProviderApi.read).mockResolvedValue({ connection: ready() }); renderCard(); const show = await screen.findByRole('button', { name: 'Exibir QR Code' });
    vi.useFakeTimers(); fireEvent.click(show); await act(flush); expect(screen.getByRole('img')).toBeInTheDocument();
    await act(async () => { vi.advanceTimersByTime(20001); }); expect(screen.queryByRole('img')).not.toBeInTheDocument(); expect(screen.getByText(/QR Code expirado/)).toBeInTheDocument(); expect(webProviderApi.qr).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar QR Code' })); await act(flush); expect(webProviderApi.command).toHaveBeenCalledWith(expect.anything(), 'refresh', expect.any(String), expect.any(AbortSignal));
  });
  it('reconciles connection updates through Core realtime and does not poll', async () => {
    renderCard(); await screen.findByText('Desconectado'); vi.mocked(webProviderApi.read).mockResolvedValue({ connection: ready() });
    await act(async () => { FakeSocket.instances[0]!.event(); await flush(); }); expect(await screen.findByText('QR disponível')).toBeInTheDocument();
    const calls = vi.mocked(webProviderApi.read).mock.calls.length; vi.useFakeTimers(); await act(async () => { vi.advanceTimersByTime(60000); }); expect(webProviderApi.read).toHaveBeenCalledTimes(calls);
    expect(webProviderApi.qr).not.toHaveBeenCalled();
  });
  it('ignores realtime from another organization and refreshes authority on revocation', async () => {
    renderCard(); await screen.findByText('Desconectado'); const calls = vi.mocked(webProviderApi.read).mock.calls.length;
    await act(async () => { FakeSocket.instances[0]!.event('org-b'); await flush(); }); expect(webProviderApi.read).toHaveBeenCalledTimes(calls);
    act(() => FakeSocket.instances[0]!.onclose?.({ code: 4003 })); expect(auth.refreshSession).toHaveBeenCalledWith(true); expect(auth.expireSession).not.toHaveBeenCalled();
  });
  it('confirms logout contextually and supports Escape, focus return and keyboard trapping', async () => {
    vi.mocked(webProviderApi.read).mockResolvedValue({ connection: connection({ state: 'CONNECTED', uiState: 'CONNECTED' }) }); renderCard();
    const button = await screen.findByRole('button', { name: 'Desconectar' }); fireEvent.click(button); const dialog = screen.getByRole('dialog'); expect(dialog).toHaveTextContent('revoga o vínculo'); expect(screen.getByRole('button', { name: 'Confirmar desconexão' })).toHaveFocus();
    const cancel = screen.getByRole('button', { name: 'Cancelar' }); cancel.focus(); fireEvent.keyDown(cancel, { key: 'Tab' }); expect(screen.getByRole('button', { name: 'Confirmar desconexão' })).toHaveFocus();
    fireEvent.keyDown(dialog, { key: 'Escape' }); expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(button).toHaveFocus(); expect(webProviderApi.command).not.toHaveBeenCalled();
    fireEvent.click(button); fireEvent.click(screen.getByRole('button', { name: 'Confirmar desconexão' })); await waitFor(() => expect(webProviderApi.command).toHaveBeenCalledWith(expect.anything(), 'disconnect', expect.any(String), expect.any(AbortSignal)));
  });
  it('shows safe API failure text and retains genuine connection state', async () => {
    vi.mocked(webProviderApi.command).mockRejectedValue(new ApiError(503, 'server', 'secret-sensitive-server-detail', 'PROVIDER_UNAVAILABLE'));
    renderCard(); fireEvent.click(await screen.findByRole('button', { name: 'Solicitar QR Code' })); expect(await screen.findByRole('alert')).toHaveTextContent('temporariamente indisponível'); expect(screen.queryByText('secret-sensitive-server-detail')).not.toBeInTheDocument(); expect(screen.getByText('Desconectado')).toBeInTheDocument();
  });
  it('discards an aborted late QR response after navigation and closes the subscription', async () => {
    vi.mocked(webProviderApi.read).mockResolvedValue({ connection: ready() }); let done!: (value: Awaited<ReturnType<typeof webProviderApi.qr>>) => void;
    vi.mocked(webProviderApi.qr).mockImplementation(() => new Promise((resolve) => { done = resolve; })); const view = renderCard(); fireEvent.click(await screen.findByRole('button', { name: 'Exibir QR Code' })); await waitFor(() => expect(webProviderApi.qr).toHaveBeenCalledOnce());
    const signal = vi.mocked(webProviderApi.qr).mock.calls[0]![1]; view.unmount(); expect(signal.aborted).toBe(true); expect(FakeSocket.instances[0]!.close).toHaveBeenCalled();
    await act(async () => done({ qr: 'SENSITIVE_LATE_QR', revision: 1, expiresInMs: 10000, expiresAt: new Date().toISOString() })); expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
  it('rejects a late lower-version snapshot and keeps the latest real state', async () => {
    renderCard(); await screen.findByText('Desconectado'); vi.mocked(webProviderApi.read).mockResolvedValue({ connection: connection({ state: 'CONNECTED', uiState: 'CONNECTED', version: 8 }) });
    await act(async () => { FakeSocket.instances[0]!.event(); await flush(); }); vi.mocked(webProviderApi.read).mockResolvedValue({ connection: connection({ version: 2 }) });
    fireEvent.click(screen.getByRole('button', { name: 'Consultar estado' })); await act(flush); expect(screen.getByText('Conectado')).toBeInTheDocument();
  });
  it('uses catalog visibility and effective permissions rather than role names', async () => {
    const catalog = vi.spyOn(chatApi, 'listProviders').mockResolvedValue({ items: [{ code: 'WHATSAPP_WEB', name: 'WhatsApp Web', description: '', state: 'AVAILABLE', enabled: false }] });
    auth.session.permissions = []; const view = render(<MemoryRouter><ProvidersPage /></MemoryRouter>); expect(screen.getByRole('alert')).toHaveTextContent('não tem permissão'); expect(catalog).not.toHaveBeenCalled();
    view.unmount(); auth.session.permissions = ['providers.manage']; render(<MemoryRouter><ProvidersPage /></MemoryRouter>); expect(await screen.findByRole('heading', { name: 'WhatsApp Web' })).toBeInTheDocument();
  });
  it('clears the old tenant QR and rejects late reads when provider page changes organization', async () => {
    vi.spyOn(chatApi, 'listProviders').mockResolvedValue({ items: [{ code: 'WHATSAPP_WEB', name: 'WhatsApp Web', description: '', state: 'AVAILABLE', enabled: false }] }); vi.mocked(webProviderApi.read).mockResolvedValue({ connection: ready() });
    const view = render(<MemoryRouter><ProvidersPage /></MemoryRouter>); fireEvent.click(await screen.findByRole('button', { name: 'Exibir QR Code' })); await screen.findByRole('img');
    auth.session.currentOrganizationId = 'org-b'; vi.mocked(webProviderApi.read).mockResolvedValue({ connection: null }); view.rerender(<MemoryRouter><ProvidersPage /></MemoryRouter>);
    await screen.findByRole('button', { name: 'Criar conexão' }); expect(screen.queryByRole('img')).not.toBeInTheDocument(); expect(FakeSocket.instances.at(-1)!.url).toContain('/api/v1/providers/realtime');
  });
  it('shows generation and authentication feedback from observed phases without enabling refresh during authentication', async () => {
    vi.mocked(webProviderApi.read).mockResolvedValue({ connection: connection({ state: 'CONNECTING', uiState: 'CONNECTING', pairingPhase: 'GENERATING_QR' }) });
    const view = renderCard(); await screen.findByText('Gerando QR Code…');
    vi.mocked(webProviderApi.read).mockResolvedValue({ connection: connection({ state: 'CONNECTING', uiState: 'CONNECTING', pairingPhase: 'AUTHENTICATING', version: 4 }) });
    await act(async () => { FakeSocket.instances[0]!.event(); await flush(); });
    await screen.findByText('Autenticando…'); expect(screen.getByRole('button', { name: 'Atualizar QR Code' })).toBeDisabled(); expect(webProviderApi.qr).not.toHaveBeenCalled(); view.unmount();
  });
  it('keeps the connection connected while showing genuine progress and no fabricated percentage', async () => {
    vi.mocked(webProviderApi.read).mockResolvedValue({ connection: connection({ state: 'CONNECTED', uiState: 'CONNECTED', sync: { contacts: 7, conversations: 3, messages: 29, failures: 0, batches: 4, provider: { historyEnabled: true, phase: 'MESSAGES', queued: 12, contacts: 9, conversations: 5, messages: 40, failures: 0, limited: false, durationMs: 500 } } }) });
    renderCard(); await screen.findByText('Sincronizando conversas e mensagens'); expect(screen.getByText('Conectado')).toBeInTheDocument(); expect(screen.getByText('WhatsApp conectado.')).toBeInTheDocument();
    expect(screen.getByText('29')).toBeInTheDocument(); expect(screen.getByText('Itens na fila: 12')).toBeInTheDocument(); expect(screen.getByText(/continuar navegando/)).toBeInTheDocument(); expect(screen.queryByText(/\d+%/)).not.toBeInTheDocument();
  });
  it('shows bounded import awaiting authorization and preserves partial failures instead of claiming all history', async () => {
    vi.mocked(webProviderApi.read).mockResolvedValue({ connection: connection({ state: 'CONNECTED', uiState: 'CONNECTED', sync: { contacts: 2, conversations: 1, messages: 3, failures: 1, batches: 1, lastErrorCode: 'IDENTITY_MAPPING_CONFLICT', provider: { historyEnabled: false, phase: 'PARTIAL', queued: 0, contacts: 2, conversations: 1, messages: 3, failures: 0, limited: true, durationMs: 100 } } }) });
    renderCard(); await screen.findByText('Sincronização parcial ou com falhas'); expect(screen.getByText(/até 500 contatos/)).toBeInTheDocument(); expect(screen.getByText(/total disponível é desconhecido/)).toBeInTheDocument(); expect(screen.getByRole('alert')).toHaveTextContent(/identidade externa/); expect(webProviderApi.command).not.toHaveBeenCalled();
  });
});
