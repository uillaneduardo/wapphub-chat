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
const connection = (values: Partial<WebConnection> = {}): WebConnection => ({ id: 'channel', state: 'DISCONNECTED', uiState: 'DISCONNECTED', version: 1, qrRevision: 0, errorCode: null, lastCheckedAt: new Date().toISOString(), operation: null, transportConfirmed: true, sendingEnabled: false, mediaEnabled: false, ...values });
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
  it.each([['DISCONNECTED', 'Não vinculado'], ['CONNECTING', 'Preparando vinculação…'], ['QR_READY', 'Aguardando leitura'], ['CONNECTED', 'Conectado'], ['RECONNECTING', 'Reconectando…'], ['ERROR', 'Conexão temporariamente indisponível']] as const)('presents actual %s state without simulated transitions', async (uiState, label) => {
    vi.mocked(webProviderApi.read).mockResolvedValue({ connection: connection({ uiState }) }); renderCard(); await screen.findByText(label); expect(webProviderApi.command).not.toHaveBeenCalled();
  });
  it('preserves real disconnected state and never starts or fetches a QR on mount', async () => {
    renderCard(); await screen.findByText('Não vinculado'); expect(webProviderApi.command).not.toHaveBeenCalled(); expect(webProviderApi.qr).not.toHaveBeenCalled();
    expect(screen.getByText(/protocolo não oficial/)).toBeInTheDocument(); expect(FakeSocket.instances[0]?.url).toContain('/api/v1/providers/realtime');
  });
  it.each(['PAIRING_TRANSPORT_CLOSED','RECONNECT_LIMIT'])('reconciles first-pairing %s to an explicit attempt and matching synthetic QR', async errorCode => {
    const failed=connection({state:'FAILED',uiState:'ERROR',version:9,errorCode,transportConfirmed:false,lifecycle:{linked:false,desired:false,recoveryEligible:false,pairingEligible:true},operation:{id:'previous',action:'connect',status:'COMPLETED',errorCode:null}});
    vi.mocked(webProviderApi.read).mockResolvedValue({connection:failed});renderCard();await screen.findByText('Não foi possível vincular');expect(screen.getByText(errorCode==='RECONNECT_LIMIT'?/O limite de tentativas anterior/:/conexão encerrou antes/)).toBeInTheDocument();expect(screen.queryByText('Reconectando…')).not.toBeInTheDocument();expect(webProviderApi.command).not.toHaveBeenCalled();expect(webProviderApi.qr).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'Vincular WhatsApp'}));await waitFor(()=>expect(webProviderApi.command).toHaveBeenCalledWith(expect.objectContaining({version:9}),'connect',expect.any(String),expect.any(AbortSignal)));expect(webProviderApi.command).toHaveBeenCalledOnce();
    vi.mocked(webProviderApi.read).mockResolvedValue({connection:connection({state:'CONNECTING',uiState:'CONNECTING',version:10,transportConfirmed:false,pairingPhase:'GENERATING_QR'})});await act(async()=>FakeSocket.instances[0]!.event());await screen.findByText('Preparando vinculação…');expect(webProviderApi.qr).not.toHaveBeenCalled();
    vi.mocked(webProviderApi.read).mockResolvedValue({connection:{...ready(),version:11}});await act(async()=>FakeSocket.instances[0]!.event('org-a','2'));await screen.findByRole('img',{name:'QR Code para vincular o WhatsApp'});expect(webProviderApi.qr).toHaveBeenCalledOnce();expect(webProviderApi.command).toHaveBeenCalledOnce();
  });
  it('creates an idle connection only after an explicit action and blocks duplicate commands', async () => {
    vi.mocked(webProviderApi.read).mockResolvedValue({ connection: null }); let complete!: (value: WebConnection) => void;
    vi.mocked(webProviderApi.create).mockImplementation(() => new Promise((done) => { complete = done; }));
    renderCard(); const create = await screen.findByRole('button', { name: 'Vincular WhatsApp' }); fireEvent.click(create); fireEvent.click(create); await waitFor(() => expect(webProviderApi.create).toHaveBeenCalledOnce());
    await act(async () => complete(connection({ operation: { id: 'create-id', action: 'create', status: 'PENDING', errorCode: null } }))); expect(webProviderApi.command).not.toHaveBeenCalled(); expect(webProviderApi.command).not.toHaveBeenCalled();
  });
  it('requests a QR explicitly, shows pending operation without faking connecting state', async () => {
    renderCard(); const button = await screen.findByRole('button', { name: 'Vincular WhatsApp' }); fireEvent.click(button);
    await waitFor(() => expect(webProviderApi.command).toHaveBeenCalledWith(expect.objectContaining({ version: 1 }), 'connect', expect.any(String), expect.any(AbortSignal)));
    expect(await screen.findByText(/Aguardando confirmação/)).toBeInTheDocument(); expect(screen.getByText('Atualizando conexão…')).toBeInTheDocument(); expect(screen.getByText(/Estado registrado: DISCONNECTED/)).toBeInTheDocument(); expect(webProviderApi.qr).not.toHaveBeenCalled();
  });
  it('renders a restricted QR as SVG with accessible instructions, without browser persistence', async () => {
    vi.mocked(webProviderApi.read).mockResolvedValue({ connection: ready() }); renderCard();
    const image = await screen.findByRole('img', { name: 'QR Code para vincular o WhatsApp' }); expect(image.tagName.toLowerCase()).toBe('svg'); expect(image.innerHTML).not.toContain('SYNTHETIC_PRIVATE_QR');
    expect(screen.getByText(/Aparelhos conectados/)).toBeInTheDocument(); expect(JSON.stringify(localStorage)).not.toContain('SYNTHETIC'); expect(JSON.stringify(sessionStorage)).not.toContain('SYNTHETIC');
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar QR Code' })); expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
  it('removes an expired QR and refreshes only when requested', async () => {
    vi.mocked(webProviderApi.read).mockResolvedValue({ connection: ready() }); vi.useFakeTimers(); renderCard(); await act(flush); expect(screen.getByRole('img')).toBeInTheDocument();
    await act(async () => { vi.advanceTimersByTime(20001); }); expect(screen.queryByRole('img')).not.toBeInTheDocument(); expect(screen.getByText(/expirado ou indisponível/)).toBeInTheDocument(); expect(webProviderApi.qr).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Gerar outro QR Code' })); await act(flush); expect(webProviderApi.command).toHaveBeenCalledWith(expect.anything(), 'refresh', expect.any(String), expect.any(AbortSignal));
  });
  it('reconciles connection updates through Core realtime and does not poll', async () => {
    renderCard(); await screen.findByText('Não vinculado'); vi.mocked(webProviderApi.read).mockResolvedValue({ connection: ready() });
    await act(async () => { FakeSocket.instances[0]!.event(); await flush(); }); expect(await screen.findByText('Aguardando leitura')).toBeInTheDocument();
    const calls = vi.mocked(webProviderApi.read).mock.calls.length; vi.useFakeTimers(); await act(async () => { vi.advanceTimersByTime(60000); }); expect(webProviderApi.read).toHaveBeenCalledTimes(calls);
    expect(webProviderApi.qr).toHaveBeenCalledOnce();
  });
  it('ignores realtime from another organization and refreshes authority on revocation', async () => {
    renderCard(); await screen.findByText('Não vinculado'); const calls = vi.mocked(webProviderApi.read).mock.calls.length;
    await act(async () => { FakeSocket.instances[0]!.event('org-b'); await flush(); }); expect(webProviderApi.read).toHaveBeenCalledTimes(calls);
    act(() => FakeSocket.instances[0]!.onclose?.({ code: 4003 })); expect(auth.refreshSession).toHaveBeenCalledWith(true); expect(auth.expireSession).not.toHaveBeenCalled();
  });
  it('confirms a reversible local stop contextually and supports Escape, focus return and keyboard trapping', async () => {
    vi.mocked(webProviderApi.read).mockResolvedValue({ connection: connection({ state: 'CONNECTED', uiState: 'CONNECTED' }) }); renderCard();
    await screen.findByText('WhatsApp disponível para atendimento.'); fireEvent.click(screen.getByText('Diagnóstico avançado')); const button = await screen.findByRole('button', { name: 'Parar conexão' }); fireEvent.click(button); const dialog = screen.getByRole('dialog'); expect(dialog).toHaveTextContent('não revoga o aparelho'); expect(screen.getByRole('button', { name: 'Confirmar parada' })).toHaveFocus();
    const cancel = screen.getByRole('button', { name: 'Cancelar' }); cancel.focus(); fireEvent.keyDown(cancel, { key: 'Tab' }); expect(screen.getByRole('button', { name: 'Confirmar parada' })).toHaveFocus();
    fireEvent.keyDown(dialog, { key: 'Escape' }); expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(button).toHaveFocus(); expect(webProviderApi.command).not.toHaveBeenCalled();
    fireEvent.click(button); fireEvent.click(screen.getByRole('button', { name: 'Confirmar parada' })); await waitFor(() => expect(webProviderApi.command).toHaveBeenCalledWith(expect.anything(), 'disconnect', expect.any(String), expect.any(AbortSignal)));
  });
  it('shows safe API failure text and retains genuine connection state', async () => {
    vi.mocked(webProviderApi.command).mockRejectedValue(new ApiError(503, 'server', 'secret-sensitive-server-detail', 'PROVIDER_UNAVAILABLE'));
    renderCard(); fireEvent.click(await screen.findByRole('button', { name: 'Vincular WhatsApp' })); expect(await screen.findByRole('alert')).toHaveTextContent('temporariamente indisponível'); expect(screen.queryByText('secret-sensitive-server-detail')).not.toBeInTheDocument(); expect(screen.getByText('Não vinculado')).toBeInTheDocument(); expect(screen.getByRole('button', { name: 'Vincular WhatsApp' })).toBeEnabled();
  });
  it('discards an aborted late QR response after navigation and closes the subscription', async () => {
    vi.mocked(webProviderApi.read).mockResolvedValue({ connection: ready() }); let done!: (value: Awaited<ReturnType<typeof webProviderApi.qr>>) => void;
    vi.mocked(webProviderApi.qr).mockImplementation(() => new Promise((resolve) => { done = resolve; })); const view = renderCard(); await waitFor(() => expect(webProviderApi.qr).toHaveBeenCalledOnce());
    const signal = vi.mocked(webProviderApi.qr).mock.calls[0]![1]; view.unmount(); expect(signal.aborted).toBe(true); expect(FakeSocket.instances[0]!.close).toHaveBeenCalled();
    await act(async () => done({ qr: 'SENSITIVE_LATE_QR', revision: 1, expiresInMs: 10000, expiresAt: new Date().toISOString() })); expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
  it('rejects a late lower-version snapshot and keeps the latest real state', async () => {
    renderCard(); await screen.findByText('Não vinculado'); vi.mocked(webProviderApi.read).mockResolvedValue({ connection: connection({ state: 'CONNECTED', uiState: 'CONNECTED', version: 8 }) });
    await act(async () => { FakeSocket.instances[0]!.event(); await flush(); }); vi.mocked(webProviderApi.read).mockResolvedValue({ connection: connection({ version: 2 }) });
    fireEvent.click(screen.getByRole('button', { name: 'Consultar estado' })); await act(flush); expect(screen.getByText('Conectado')).toBeInTheDocument();
  });
  it('uses catalog visibility and effective permissions rather than role names', async () => {
    const catalog = vi.spyOn(chatApi, 'listProviders').mockResolvedValue({ items: [{ code: 'WHATSAPP_WEB', name: 'WhatsApp Web', description: '', state: 'AVAILABLE', enabled: false }] });
    auth.session.permissions = []; const view = render(<MemoryRouter><ProvidersPage /></MemoryRouter>); expect(screen.getByRole('alert')).toHaveTextContent('não tem permissão'); expect(catalog).not.toHaveBeenCalled();
    view.unmount(); auth.session.permissions = ['providers.manage']; render(<MemoryRouter><ProvidersPage /></MemoryRouter>); expect(await screen.findByRole('heading', { name: 'WhatsApp' })).toBeInTheDocument();
  });
  it('clears the old tenant QR and rejects late reads when provider page changes organization', async () => {
    vi.spyOn(chatApi, 'listProviders').mockResolvedValue({ items: [{ code: 'WHATSAPP_WEB', name: 'WhatsApp Web', description: '', state: 'AVAILABLE', enabled: false }] }); vi.mocked(webProviderApi.read).mockResolvedValue({ connection: ready() });
    const view = render(<MemoryRouter><ProvidersPage /></MemoryRouter>); await screen.findByRole('img');
    auth.session.currentOrganizationId = 'org-b'; vi.mocked(webProviderApi.read).mockResolvedValue({ connection: null }); view.rerender(<MemoryRouter><ProvidersPage /></MemoryRouter>);
    await screen.findByRole('button', { name: 'Vincular WhatsApp' }); expect(screen.queryByRole('img')).not.toBeInTheDocument(); expect(FakeSocket.instances.at(-1)!.url).toContain('/api/v1/providers/realtime');
  });
  it('shows generation and authentication feedback from observed phases without enabling refresh during authentication', async () => {
    vi.mocked(webProviderApi.read).mockResolvedValue({ connection: connection({ state: 'CONNECTING', uiState: 'CONNECTING', pairingPhase: 'GENERATING_QR' }) });
    const view = renderCard(); await screen.findByText('Preparando vinculação…');
    vi.mocked(webProviderApi.read).mockResolvedValue({ connection: connection({ state: 'CONNECTING', uiState: 'CONNECTING', pairingPhase: 'AUTHENTICATING', version: 4 }) });
    await act(async () => { FakeSocket.instances[0]!.event(); await flush(); });
    await screen.findByText('Autenticando…'); expect(screen.queryByRole('button', { name: 'Gerar outro QR Code' })).not.toBeInTheDocument(); expect(webProviderApi.qr).not.toHaveBeenCalled(); view.unmount();
  });
  it('keeps the connection connected while showing genuine progress and no fabricated percentage', async () => {
    vi.mocked(webProviderApi.read).mockResolvedValue({ connection: connection({ state: 'CONNECTED', uiState: 'CONNECTED', sync: { contacts: 7, conversations: 3, messages: 29, failures: 0, batches: 4, provider: { historyEnabled: true, phase: 'MESSAGES', queued: 12, contacts: 9, conversations: 5, messages: 40, failures: 0, limited: false, durationMs: 500 } } }) });
    renderCard(); await screen.findByText('Sincronizando conversas e mensagens'); expect(screen.getByText('Conectado')).toBeInTheDocument(); expect(screen.getByText('WhatsApp disponível para atendimento.')).toBeInTheDocument();
    expect(screen.getByText('29')).toBeInTheDocument(); expect(screen.getByText('Itens na fila: 12')).toBeInTheDocument(); expect(screen.getByText(/continuar navegando/)).toBeInTheDocument(); expect(screen.queryByText(/\d+%/)).not.toBeInTheDocument();
  });
  it('shows bounded import awaiting authorization and preserves partial failures instead of claiming all history', async () => {
    vi.mocked(webProviderApi.read).mockResolvedValue({ connection: connection({ state: 'CONNECTED', uiState: 'CONNECTED', sync: { contacts: 2, conversations: 1, messages: 3, failures: 1, batches: 1, lastErrorCode: 'IDENTITY_MAPPING_CONFLICT', provider: { historyEnabled: false, phase: 'PARTIAL', queued: 0, contacts: 2, conversations: 1, messages: 3, failures: 0, limited: true, durationMs: 100 } } }) });
    renderCard(); await screen.findByText('Sincronização parcial ou com falhas'); expect(screen.getByText(/Histórico inicial desativado/)).toBeInTheDocument(); expect(screen.getByRole('alert')).toHaveTextContent(/identidade externa/); expect(webProviderApi.command).not.toHaveBeenCalled();
  });
  it('separates persisted counters from source failures and discloses missing legacy details', async () => {
    vi.mocked(webProviderApi.read).mockResolvedValue({ connection: connection({ state: 'CONNECTED', uiState: 'CONNECTED', sync: { contacts: 1, conversations: 0, messages: 1, failures: 0, batches: 1, provider: { historyEnabled: false, phase: 'PARTIAL', queued: 0, contacts: 1, conversations: 1, messages: 1, failures: 2, limited: false, durationMs: 10 } } }) });
    renderCard(); await screen.findByText('Mensagens persistidas'); expect(screen.getByText(/Não é possível reconstruir/)).toBeInTheDocument(); expect(screen.getByText('Conversas criadas').nextElementSibling).toHaveTextContent('0'); expect(screen.getByText(/pode usar uma conversa já existente/)).toBeInTheDocument();
  });
  it('does not classify recovered persistence attempts as pending synchronization failure', async () => {
    vi.mocked(webProviderApi.read).mockResolvedValue({ connection: connection({ state: 'CONNECTED', uiState: 'CONNECTED', sync: { contacts: 1, conversations: 1, messages: 1, failures: 0, batches: 1, failedAttempts: 1, pendingFailures: 0, diagnosticsSince: new Date().toISOString(), provider: { historyEnabled: false, phase: 'MESSAGES', queued: 0, contacts: 1, conversations: 1, messages: 1, failures: 0, limited: false, durationMs: 10 } } }) });
    renderCard(); await screen.findByText('Sincronização contínua ativa'); expect(screen.queryByText('Sincronização parcial ou com falhas')).not.toBeInTheDocument(); expect(screen.getByText('Tentativas com falha ao persistir').nextElementSibling).toHaveTextContent('1');
  });
  it('ends the processing label after continuous messages drain without claiming initial history complete', async () => {
    vi.mocked(webProviderApi.read).mockResolvedValue({ connection: connection({ state: 'CONNECTED', uiState: 'CONNECTED', sync: { contacts: 1, conversations: 1, messages: 2, failures: 0, batches: 1, provider: { historyEnabled: false, phase: 'MESSAGES', queued: 0, contacts: 1, conversations: 1, messages: 2, failures: 0, limited: false, durationMs: 100 } } }) });
    renderCard(); await screen.findByText('Sincronização contínua ativa');
    expect(screen.queryByText('Sincronizando conversas e mensagens')).not.toBeInTheDocument(); expect(screen.queryByText('Sincronização inicial processada')).not.toBeInTheDocument();
  });
  it('never claims the account is currently connected when the Core reports provider unavailability', async () => {
    vi.mocked(webProviderApi.read).mockResolvedValue({ connection: connection({ state: 'CONNECTED', uiState: 'CONNECTED', errorCode: 'PROVIDER_UNAVAILABLE' }) });
    renderCard(); await screen.findByText('Não foi possível verificar'); expect(screen.queryByText('WhatsApp disponível para atendimento.')).not.toBeInTheDocument(); expect(screen.getByText('Consulte o estado atual antes de continuar.')).toBeInTheDocument(); expect(screen.getByText('Não foi possível verificar')).not.toHaveClass('is-enabled'); expect(webProviderApi.command).not.toHaveBeenCalled();
  });

  it.each(['CONNECTED', 'DISCONNECTED', 'FAILED'] as const)('allows stop and unlink in %s without automatically calling the API', async state => {
    vi.mocked(webProviderApi.read).mockResolvedValue({ connection: connection({ state, uiState: state === 'FAILED' ? 'ERROR' : state, errorCode: state === 'FAILED' ? 'RECONNECT_LIMIT' : null, lifecycle: { linked: true, desired: true, recoveryEligible: state !== 'CONNECTED' } }) }); renderCard();
    await screen.findByRole('heading', { name: 'WhatsApp' }); await waitFor(() => expect(webProviderApi.read).toHaveBeenCalled()); fireEvent.click(screen.getByText('Diagnóstico avançado')); const stop = await screen.findByRole('button', { name: 'Parar conexão' }); expect(stop).toBeEnabled(); expect(screen.getByRole('button', { name: 'Desvincular WhatsApp' })).toBeEnabled(); expect(screen.queryByRole('button', { name: 'Vincular WhatsApp' })).not.toBeInTheDocument(); expect(webProviderApi.command).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Desvincular WhatsApp' })); expect(screen.getByRole('dialog')).toHaveTextContent('Se o serviço não conseguir confirmar'); fireEvent.click(screen.getByRole('button', { name: 'Confirmar desvinculação' })); await waitFor(() => expect(webProviderApi.command).toHaveBeenCalledWith(expect.anything(), 'logout', expect.any(String), expect.any(AbortSignal)));
  });
  it('requires explicit confirmation for one recovery and keeps stop available during recovery', async () => {
    vi.mocked(webProviderApi.read).mockResolvedValue({ connection: connection({ state: 'FAILED', uiState: 'ERROR', errorCode: 'RECONNECT_LIMIT', lifecycle: { linked: true, desired: true, recoveryEligible: true } }) }); renderCard();
    fireEvent.click(await screen.findByRole('button', { name: 'Restabelecer conexão' })); expect(webProviderApi.command).not.toHaveBeenCalled(); expect(screen.getByRole('dialog')).toHaveTextContent('Apenas uma tentativa será autorizada'); fireEvent.click(screen.getByRole('button', { name: 'Autorizar uma tentativa' })); await waitFor(() => expect(webProviderApi.command).toHaveBeenCalledWith(expect.anything(), 'recover', expect.any(String), expect.any(AbortSignal)));
  });
  it('shows phone revocation guidance for unconfirmed unlink and does not claim remote success', async () => {
    vi.mocked(webProviderApi.read).mockResolvedValue({ connection: connection({ lifecycle: { linked: true, desired: false, recoveryEligible: false, termination: { commandId: 'synthetic', action: 'logout', remote: 'UNCONFIRMED', requestedAt: new Date().toISOString() } } }) }); renderCard();
    expect(await screen.findByText(/A remoção do aparelho no WhatsApp não foi confirmada/)).toHaveTextContent('Aparelhos conectados'); expect(screen.queryByText('Desvinculação remota confirmada pelo WhatsApp.')).not.toBeInTheDocument(); expect(screen.queryByRole('button', { name: 'Restabelecer conexão' })).not.toBeInTheDocument();
  });
  it('revoked sessions offer termination but no automatic QR or recovery', async () => {
    vi.mocked(webProviderApi.read).mockResolvedValue({ connection: connection({ state: 'FAILED', uiState: 'ERROR', errorCode: 'SESSION_REVOKED', lifecycle: { linked: true, desired: false, recoveryEligible: false } }) }); renderCard();
    await waitFor(() => expect(webProviderApi.read).toHaveBeenCalled()); fireEvent.click(screen.getByText('Diagnóstico avançado')); expect(await screen.findByRole('button', { name: 'Parar conexão' })).toBeEnabled(); expect(screen.queryByRole('button', { name: 'Restabelecer conexão' })).not.toBeInTheDocument(); expect(screen.queryByRole('button', { name: 'Vincular WhatsApp' })).not.toBeInTheDocument(); expect(webProviderApi.qr).not.toHaveBeenCalled();
  });

  it('sequences create completion then connect from one gesture with the latest version', async () => {
    vi.mocked(webProviderApi.read).mockResolvedValue({ connection: null });
    vi.mocked(webProviderApi.create).mockImplementation(async id => connection({ operation: { id, action: 'create', status: 'PENDING', errorCode: null } }));
    renderCard(); fireEvent.click(await screen.findByRole('button', { name: 'Vincular WhatsApp' })); await waitFor(() => expect(webProviderApi.create).toHaveBeenCalledOnce()); expect(webProviderApi.command).not.toHaveBeenCalled();
    const id = vi.mocked(webProviderApi.create).mock.calls[0]![0];
    vi.mocked(webProviderApi.read).mockResolvedValue({ connection: connection({ version: 7, lifecycle: { linked: false, desired: false, recoveryEligible: false, pairingEligible: true }, operation: { id, action: 'create', status: 'COMPLETED', errorCode: null } }) });
    await act(async () => { FakeSocket.instances[0]!.event(); await flush(); }); await waitFor(() => expect(webProviderApi.command).toHaveBeenCalledWith(expect.objectContaining({ version: 7 }), 'connect', expect.any(String), expect.any(AbortSignal))); expect(webProviderApi.command).toHaveBeenCalledOnce();
  });
  it('adopts an existing pending create only after the link gesture, without recreating the connection', async () => {
    vi.mocked(webProviderApi.read).mockResolvedValue({ connection: connection({ operation: { id: 'pending-create', action: 'create', status: 'PENDING', errorCode: null } }) }); renderCard(); fireEvent.click(await screen.findByRole('button', { name: 'Vincular WhatsApp' })); await act(flush); expect(webProviderApi.create).not.toHaveBeenCalled(); expect(webProviderApi.command).not.toHaveBeenCalled();
    vi.mocked(webProviderApi.read).mockResolvedValue({ connection: connection({ version: 5, operation: { id: 'pending-create', action: 'create', status: 'COMPLETED', errorCode: null } }) }); await act(async () => { FakeSocket.instances[0]!.event(); await flush(); }); expect(webProviderApi.command).toHaveBeenCalledWith(expect.objectContaining({ version: 5 }), 'connect', expect.any(String), expect.any(AbortSignal));
  });
  it.each([false, true])('prepares a new link only after explicit removal confirmation=%s and completed receipt', async removedOnPhone => {
    vi.mocked(webProviderApi.read).mockResolvedValue({ connection: connection({ lifecycle: { linked: true, desired: false, recoveryEligible: false, preparationEligible: true, removalConfirmationRequired: removedOnPhone } }) });
    vi.mocked(webProviderApi.command).mockImplementation(async (c, action, id) => connection({ version: c.version + 1, operation: { id, action, status: 'PENDING', errorCode: null } }));
    renderCard(); fireEvent.click(await screen.findByRole('button', { name: 'Vincular WhatsApp' })); const dialog = await screen.findByRole('dialog'); expect(webProviderApi.command).not.toHaveBeenCalled(); expect(dialog).toHaveTextContent(removedOnPhone ? 'já removeu este aparelho' : 'desvinculação remota foi confirmada');
    if (removedOnPhone) { expect(screen.getByRole('button', { name: 'Já removi o aparelho; vincular novamente' })).toBeDisabled(); fireEvent.click(screen.getByRole('checkbox', { name: /Já removi este aparelho/ })); }
    fireEvent.click(screen.getByRole('button', { name: removedOnPhone ? 'Já removi o aparelho; vincular novamente' : 'Confirmar nova vinculação' })); await waitFor(() => expect(webProviderApi.command).toHaveBeenCalledOnce()); expect(webProviderApi.command).toHaveBeenCalledWith(expect.anything(), 'prepare_link', expect.any(String), expect.any(AbortSignal), removedOnPhone);
    const id = vi.mocked(webProviderApi.command).mock.calls[0]![2]; vi.mocked(webProviderApi.read).mockResolvedValue({ connection: connection({ version: 8, operation: { id, action: 'prepare_link', status: 'COMPLETED', errorCode: null }, lifecycle: { linked: false, desired: false, recoveryEligible: false, pairingEligible: true } }) });
    await act(async () => { FakeSocket.instances[0]!.event(); await flush(); }); expect(webProviderApi.command).toHaveBeenCalledWith(expect.objectContaining({ version: 8 }), 'connect', expect.any(String), expect.any(AbortSignal)); expect(webProviderApi.command).toHaveBeenCalledTimes(2);
  });
  it('does not repeat commands after a version conflict', async () => {
    vi.mocked(webProviderApi.command).mockRejectedValue(new ApiError(409, 'server', 'synthetic', 'CONNECTION_VERSION_CONFLICT')); renderCard(); fireEvent.click(await screen.findByRole('button', { name: 'Vincular WhatsApp' })); expect(await screen.findByRole('alert')).toHaveTextContent('conexão mudou'); expect(webProviderApi.command).toHaveBeenCalledOnce();
  });
  it('keeps technical stop in a collapsed advanced section and exposes only the main decision', async () => {
    renderCard(); await screen.findByRole('button', { name: 'Vincular WhatsApp' }); expect(screen.getByRole('button', { name: 'Parar conexão' }).closest('details')).not.toHaveAttribute('open'); expect(screen.getByText('Diagnóstico avançado').closest('details')).not.toHaveAttribute('open'); expect(screen.queryByRole('button', { name: 'Criar conexão' })).not.toBeInTheDocument(); expect(screen.queryByRole('button', { name: 'Solicitar QR Code' })).not.toBeInTheDocument();
  });

  it('revalidates expiry without realtime and reconciles the exact unconfirmed/pending fixture', async () => {
    vi.useFakeTimers(); const lifecycle = { linked: true, desired: false, recoveryEligible: false, preparationEligible: true, removalConfirmationRequired: true, termination: { commandId: 'synthetic', action: 'logout' as const, remote: 'UNCONFIRMED' as const, requestedAt: new Date().toISOString() } };
    const createdAt = new Date().toISOString();
    vi.mocked(webProviderApi.read).mockResolvedValueOnce({ connection: connection({ transportConfirmed: false, lifecycle, operation: { id: 'synthetic', action: 'prepare_link', status: 'PROCESSING', errorCode: null, createdAt } }) }).mockImplementation(async () => ({ connection: connection({ version: 2, lastCheckedAt: new Date().toISOString(), transportConfirmed: false, lifecycle, operation: { id: 'synthetic', action: 'prepare_link', status: 'FAILED', errorCode: 'SESSION_COMMAND_LIMIT', createdAt } }) }));
    renderCard(); await act(flush); expect(screen.getByText('Processando solicitação…')).toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(30001); await flush(); });
    expect(webProviderApi.read).toHaveBeenCalledTimes(2); expect(screen.queryByText('Processando solicitação…')).not.toBeInTheDocument(); expect(screen.getByRole('button', { name: 'Vincular WhatsApp' })).toBeEnabled(); expect(screen.getByText(/A última solicitação não foi concluída/)).toHaveTextContent('limite de recibos'); expect(webProviderApi.command).not.toHaveBeenCalled(); expect(webProviderApi.qr).not.toHaveBeenCalled();
  });
  it('preserves the known session on failed expiry query and provides manual verification', async () => {
    vi.useFakeTimers(); vi.mocked(webProviderApi.read).mockResolvedValueOnce({ connection: connection({ lifecycle: { linked: true, desired: false, recoveryEligible: true } }) }).mockRejectedValue(new Error('synthetic'));
    renderCard(); await act(flush); await act(async () => { await vi.advanceTimersByTimeAsync(30001); await flush(); });
    expect(screen.getByText('Não foi possível verificar')).toBeInTheDocument(); expect(screen.getByRole('button', { name: 'Verificar novamente' })).toBeEnabled(); expect(screen.getByText(/Consulta do estado:/)).toHaveTextContent('último estado registrado foi preservado');
    vi.mocked(webProviderApi.read).mockResolvedValue({ connection: connection({ lifecycle: { linked: true, desired: false, recoveryEligible: true }, lastCheckedAt: new Date().toISOString() }) });
    fireEvent.click(screen.getByRole('button', { name: 'Verificar novamente' })); await act(flush); expect(screen.getByRole('button', { name: 'Restabelecer conexão' })).toBeEnabled(); expect(webProviderApi.command).not.toHaveBeenCalled();
  });
  it('coalesces focus, network and visibility reads and does not replay an uncertain operation', async () => {
    vi.useFakeTimers(); const operation = { id: 'synthetic', action: 'prepare_link' as const, status: 'PROCESSING' as const, errorCode: 'PROVIDER_UNAVAILABLE', createdAt: new Date(Date.now() - 180000).toISOString() };
    vi.mocked(webProviderApi.read).mockResolvedValue({ connection: connection({ lastCheckedAt: new Date(Date.now() - 31000).toISOString(), operation, lifecycle: { linked: true, desired: false, recoveryEligible: false, preparationEligible: true, removalConfirmationRequired: true } }) });
    renderCard(); await act(flush); expect(screen.queryByText('Processando solicitação…')).not.toBeInTheDocument(); expect(screen.getByText(/O resultado desta solicitação ainda não foi confirmado/)).toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(10001); }); let resolve!: (v: {connection: WebConnection}) => void;
    vi.mocked(webProviderApi.read).mockImplementation(() => new Promise(done => { resolve=done; })); fireEvent.focus(window); fireEvent.online(window); fireEvent(document, new Event('visibilitychange')); expect(webProviderApi.read).toHaveBeenCalledTimes(2);
    await act(async () => { FakeSocket.instances.at(-1)!.event(); await flush(); });
    expect(webProviderApi.read).toHaveBeenCalledTimes(2); // never concurrent
    vi.mocked(webProviderApi.read).mockResolvedValue({ connection: connection({ version: 3, operation, lastCheckedAt: new Date().toISOString(), lifecycle: { linked: true, desired: false, recoveryEligible: false } }) });
    await act(async () => { resolve({connection: connection({operation,lastCheckedAt:new Date().toISOString()})}); await flush(); });
    expect(webProviderApi.read).toHaveBeenCalledTimes(3); // event wasn't discarded
    expect(webProviderApi.command).not.toHaveBeenCalled(); expect(webProviderApi.create).not.toHaveBeenCalled(); expect(webProviderApi.qr).not.toHaveBeenCalled();
  });

  it('authorizes only text on the selected connection after confirmation, without creating or sending anything', async () => {
    const capability = vi.spyOn(webProviderApi, 'capabilities').mockResolvedValue({ outboundEnabled: true, mediaEnabled: false });
    renderCard(); fireEvent.click(await screen.findByRole('button', { name: 'Configurar atendimento' })); expect(capability).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Autorizar envio de texto' }));
    await waitFor(() => expect(capability).toHaveBeenCalledWith('channel', true, false, expect.any(AbortSignal)));
    expect(capability).toHaveBeenCalledOnce(); expect(webProviderApi.command).not.toHaveBeenCalled(); expect(webProviderApi.qr).not.toHaveBeenCalled();
  });

});
