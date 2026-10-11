import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { HistoryControls } from './HistoryControls';
import { webHistoryApi, type HistoryStatus } from '../../lib/webHistoryApi';
import { ApiError } from '../../lib/api';
const auth = vi.hoisted(() => ({ session: { currentOrganizationId: 'org-a', permissions: ['providers.manage', 'providers.diagnostics.read', 'conversations.supervise', 'messages.read'] } }));
vi.mock('../session/SessionContext', () => ({ useSession: () => auth }));
const status = (state: HistoryStatus['operation'] extends infer T ? Exclude<T, null> extends { state: infer S } ? S : never : never = 'PREPARED'): HistoryStatus => ({ version: 12, executionEnabled: false, mechanism: 'ON_DEMAND_ANCHORED', remoteAvailability: 'UNVERIFIED_UNTIL_AUTHORIZED_RESPONSE', operation: { id: 'operation', state, from: '2026-09-11T00:00:00Z', to: '2026-10-11T00:00:00Z', limits: { contacts: 500, conversations: 500, messages: 20 }, persisted: { contacts: 1, conversations: 1, messages: 0 }, processed: 2, duplicates: 0, rejected: 0, source: null, createdAt: '2026-10-11T00:00:00Z' } });
describe('CP4.6 administrative history controls', () => {
 beforeEach(() => { auth.session.currentOrganizationId = 'org-a'; auth.session.permissions = ['providers.manage', 'providers.diagnostics.read', 'conversations.supervise', 'messages.read']; vi.spyOn(webHistoryApi, 'read').mockResolvedValue(status()); vi.spyOn(webHistoryApi, 'prepare').mockResolvedValue({ operation: status().operation! }); vi.spyOn(webHistoryApi, 'command').mockResolvedValue({ operation: status('CANCELLED').operation! }); });
 afterEach(() => vi.restoreAllMocks());
 const panel = () => render(<HistoryControls connectionId="connection" revision={12} connected />);
 it('requires all four permissions and never fetches on mount or starts automatically', async () => {
  auth.session.permissions = ['providers.manage']; const view = panel(); expect(screen.queryByText('Histórico controlado')).not.toBeInTheDocument(); expect(webHistoryApi.read).not.toHaveBeenCalled(); view.unmount();
  auth.session.permissions.push('providers.diagnostics.read', 'conversations.supervise', 'messages.read'); panel(); expect(webHistoryApi.read).not.toHaveBeenCalled(); fireEvent.click(screen.getByText('Histórico controlado')); await screen.findByText('Preparada'); expect(screen.getByRole('button', { name: 'Iniciar importação' })).toBeDisabled(); expect(webHistoryApi.command).not.toHaveBeenCalled();
 });
 it('prepares a bounded operation only on explicit action and re-reads from Core', async () => {
  vi.mocked(webHistoryApi.read).mockResolvedValue({ ...status(), operation: null }); panel(); fireEvent.click(screen.getByText('Histórico controlado')); const button = await screen.findByText('Preparar operação');
  fireEvent.change(screen.getByLabelText('Limite de mensagens'), { target: { value: '1001' } }); expect(button).toBeDisabled(); fireEvent.change(screen.getByLabelText('Limite de mensagens'), { target: { value: '20' } }); fireEvent.click(button);
  await waitFor(() => expect(webHistoryApi.prepare).toHaveBeenCalledWith('connection', 12, 20, expect.any(String), expect.any(AbortSignal))); expect(webHistoryApi.command).not.toHaveBeenCalled();
 });
 it('uses pause/cancel without lifecycle commands or deletion', async () => {
  vi.mocked(webHistoryApi.read).mockResolvedValue(status('RUNNING')); panel(); fireEvent.click(screen.getByText('Histórico controlado')); fireEvent.click(await screen.findByText('Pausar produtor'));
  await waitFor(() => expect(webHistoryApi.command).toHaveBeenCalledWith('connection', 12, 'operation', 'pause', expect.any(String), expect.any(AbortSignal))); expect(screen.getByText(/lotes já admitidos/)).toBeInTheDocument();
 });
 it('requires confirmation for enabled execution and distinguishes persist/producer counts', async () => {
  vi.mocked(webHistoryApi.read).mockResolvedValue({ ...status(), executionEnabled: true }); panel(); fireEvent.click(screen.getByText('Histórico controlado')); fireEvent.click(await screen.findByText('Iniciar importação')); expect(webHistoryApi.command).not.toHaveBeenCalled(); expect(screen.getByText('Mensagens novas persistidas')).toBeInTheDocument(); fireEvent.click(screen.getByText('Confirmar execução'));
  await waitFor(() => expect(webHistoryApi.command).toHaveBeenCalledWith('connection', 12, 'operation', 'start', expect.any(String), expect.any(AbortSignal)));
 });
 it('sanitizes API errors and offers a read-only retry', async () => {
  vi.mocked(webHistoryApi.read).mockRejectedValue(new ApiError(503, 'server', 'sensitive-debug-stack')); panel(); fireEvent.click(screen.getByText('Histórico controlado')); expect(await screen.findByRole('alert')).toHaveTextContent('indisponível'); expect(screen.queryByText('sensitive-debug-stack')).not.toBeInTheDocument(); expect(webHistoryApi.command).not.toHaveBeenCalled();
 });
 it('clears pending tenant data on tenant switch and aborts a late response', async () => {
  let done!: (value: HistoryStatus) => void; vi.mocked(webHistoryApi.read).mockImplementation(() => new Promise((resolve) => { done = resolve; })); const view = panel(); fireEvent.click(screen.getByText('Histórico controlado')); await waitFor(() => expect(webHistoryApi.read).toHaveBeenCalledOnce()); const signal = vi.mocked(webHistoryApi.read).mock.calls[0]![1];
  auth.session.currentOrganizationId = 'org-b'; view.rerender(<HistoryControls connectionId="connection-b" revision={1} connected />); expect(signal.aborted).toBe(true); await act(async () => done(status())); expect(screen.queryByText('Preparada')).not.toBeInTheDocument();
 });
});
