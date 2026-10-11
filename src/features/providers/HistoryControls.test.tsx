import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { HistoryControls } from './HistoryControls';
import { webHistoryApi, type HistoryStatus } from '../../lib/webHistoryApi';
import { ApiError } from '../../lib/api';
const auth = vi.hoisted(() => ({ session: { currentOrganizationId: 'org-a', permissions: ['providers.manage', 'providers.diagnostics.read', 'conversations.supervise', 'messages.read'] } }));
vi.mock('../session/SessionContext', () => ({ useSession: () => auth }));
const status = (state: NonNullable<HistoryStatus['operation']>['state'] = 'PREPARED'): HistoryStatus => ({ version: 12, executionEnabled: true, mechanism: 'ON_DEMAND_ANCHORED', remoteAvailability: 'UNVERIFIED_UNTIL_AUTHORIZED_RESPONSE', operation: { id: 'operation', state, from: '2026-09-11T00:00:00Z', to: '2026-10-11T00:00:00Z', limits: { contacts: 500, conversations: 500, messages: 20 }, persisted: { contacts: 1, conversations: 1, messages: 0 }, processed: 2, duplicates: 0, rejected: 0, source: null, createdAt: '2026-10-11T00:00:00Z', authorization: { state: 'ENABLED', authorizedAt: '2026-10-11T00:00:00Z' } } });
describe('CP4.7 persistent history controls', () => {
 beforeEach(() => { auth.session.currentOrganizationId = 'org-a'; auth.session.permissions = ['providers.manage', 'providers.diagnostics.read', 'conversations.supervise', 'messages.read']; vi.spyOn(webHistoryApi, 'read').mockResolvedValue({ ...status(), operation: null }); vi.spyOn(webHistoryApi, 'configure').mockResolvedValue({ operation: status().operation! }); vi.spyOn(webHistoryApi, 'prepare'); vi.spyOn(webHistoryApi, 'command'); });
 afterEach(() => vi.restoreAllMocks());
 const panel = () => render(<HistoryControls connectionId="connection" revision={12} connected />);
 it('requires all four permissions and reads state without creating or starting operations', async () => {
  auth.session.permissions = ['providers.manage']; const view = panel(); expect(screen.queryByText('Histórico de conversas')).not.toBeInTheDocument(); expect(webHistoryApi.read).not.toHaveBeenCalled(); view.unmount();
  auth.session.permissions.push('providers.diagnostics.read', 'conversations.supervise', 'messages.read'); panel(); await screen.findByText('Não ativado'); expect(webHistoryApi.configure).not.toHaveBeenCalled(); expect(webHistoryApi.prepare).not.toHaveBeenCalled(); expect(webHistoryApi.command).not.toHaveBeenCalled();
 });
 it('activates the selected connection with one confirmed action and fixed pilot limits', async () => {
  panel(); fireEvent.click(await screen.findByText('Ativar sincronização')); expect(webHistoryApi.configure).not.toHaveBeenCalled(); expect(screen.getByRole('dialog')).toHaveTextContent('solicitações reais'); expect(screen.getByRole('dialog')).toHaveTextContent('20 mensagens'); expect(screen.getByRole('dialog')).toHaveTextContent('aba fechada');
  fireEvent.click(screen.getByText('Confirmar ativação'));
  await waitFor(() => expect(webHistoryApi.configure).toHaveBeenCalledWith('connection', 12, 'enable', expect.any(String), expect.any(AbortSignal), true)); expect(webHistoryApi.prepare).not.toHaveBeenCalled();
 });
 it('supports keyboard cancellation and returns focus without activating', async () => {
  panel(); const button = await screen.findByText('Ativar sincronização'); fireEvent.click(button); expect(screen.getByText('Cancelar')).toHaveFocus(); fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' }); expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(button).toHaveFocus(); expect(webHistoryApi.configure).not.toHaveBeenCalled();
 });
 it('respects execution flags and unavailable connection', async () => {
  vi.mocked(webHistoryApi.read).mockResolvedValue({ ...status(), operation: null, executionEnabled: false }); panel(); expect(await screen.findByText('Ativar sincronização')).toBeDisabled(); expect(webHistoryApi.configure).not.toHaveBeenCalled();
 });
 it('uses persistent pause and disable while showing only confirmed imported messages', async () => {
  vi.mocked(webHistoryApi.read).mockResolvedValue(status('RUNNING')); panel(); fireEvent.click(await screen.findByText('Pausar sincronização'));
  await waitFor(() => expect(webHistoryApi.configure).toHaveBeenCalledWith('connection', 12, 'pause', expect.any(String), expect.any(AbortSignal), false));
  await waitFor(() => expect(screen.getByText('Desativar histórico')).toBeEnabled()); fireEvent.click(screen.getByText('Desativar histórico')); await waitFor(() => expect(webHistoryApi.configure).toHaveBeenCalledWith('connection', 12, 'disable', expect.any(String), expect.any(AbortSignal), false));
  expect(screen.getByText('Mensagens novas persistidas').nextElementSibling).toHaveTextContent('0'); expect(screen.queryByText('Preparar operação')).not.toBeInTheDocument();
 });
 it('distinguishes timeout from completed import and prevents resuming uncertain requests', async () => {
  const value = status('NO_DATA'); value.operation!.authorization!.state = 'PAUSED'; value.operation!.source = { state: 'NO_DATA', contacts: 0, conversations: 0, messages: 0, requests: 1, duplicates: 0, failures: 0, limited: false, queued: 0, errorCode: 'HISTORY_RESPONSE_TIMEOUT' };
  vi.mocked(webHistoryApi.read).mockResolvedValue(value); panel(); expect(await screen.findByText('Retomar sincronização')).toBeDisabled(); expect(screen.getByText(/tentativa é inconclusiva/)).toBeInTheDocument();
 });
 it('sanitizes API errors and allows read-only retry', async () => {
  vi.mocked(webHistoryApi.read).mockRejectedValue(new ApiError(503, 'server', 'sensitive-debug-stack')); panel(); expect(await screen.findByRole('alert')).toHaveTextContent('indisponível'); expect(screen.queryByText('sensitive-debug-stack')).not.toBeInTheDocument(); expect(webHistoryApi.configure).not.toHaveBeenCalled();
 });
 it('clears tenant data and aborts delayed reads on organization switch', async () => {
  let done!: (value: HistoryStatus) => void; vi.mocked(webHistoryApi.read).mockImplementation(() => new Promise((resolve) => { done = resolve; })); const view = panel(); await waitFor(() => expect(webHistoryApi.read).toHaveBeenCalledOnce()); const signal = vi.mocked(webHistoryApi.read).mock.calls[0]![1];
  auth.session.currentOrganizationId = 'org-b'; view.rerender(<HistoryControls connectionId="connection-b" revision={1} connected />); expect(signal.aborted).toBe(true); await act(async () => done(status())); expect(screen.queryByText('Pausar sincronização')).not.toBeInTheDocument();
 });
 it('keeps a command alive across realtime revisions and aborts it on unmount', async () => {
  let done!: (value: { operation: NonNullable<HistoryStatus['operation']> }) => void; vi.mocked(webHistoryApi.configure).mockImplementation(() => new Promise((resolve) => { done = resolve; }));
  const view = panel(); fireEvent.click(await screen.findByText('Ativar sincronização')); fireEvent.click(screen.getByText('Confirmar ativação')); await waitFor(() => expect(webHistoryApi.configure).toHaveBeenCalledOnce()); const signal = vi.mocked(webHistoryApi.configure).mock.calls[0]![4];
  vi.mocked(webHistoryApi.read).mockResolvedValue({ ...status(), version: 13 }); view.rerender(<HistoryControls connectionId="connection" revision={13} connected />); await screen.findByText('Pausar sincronização'); expect(signal.aborted).toBe(false); await act(async () => done({ operation: status().operation! })); await waitFor(() => expect(screen.getByText('Pausar sincronização')).toBeEnabled()); view.unmount(); expect(signal.aborted).toBe(true);
 });
});
