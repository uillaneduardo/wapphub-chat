import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { ProviderDiagnosticsButton } from './ProviderDiagnostics';
import { providerDiagnosticsApi, sanitizedDiagnostic, type DiagnosticOccurrence, type DiagnosticPage } from '../../lib/providerDiagnosticsApi';
import { ApiError } from '../../lib/api';
const auth = vi.hoisted(() => ({ session: { currentOrganizationId: 'org-a', membership: { permissionVersion: 1 }, permissions: ['providers.manage', 'providers.diagnostics.read'] } }));
vi.mock('../session/SessionContext', () => ({ useSession: () => auth }));
const row: DiagnosticOccurrence = { id: 'event-1', correlationId: 'correlation-1', code: 'PERSISTENCE_FAILED', description: 'O Core não conseguiu persistir o lote.', occurredAt: '2026-10-10T22:00:00Z', component: 'CORE', stage: 'PERSISTENCE', severity: 'ERROR', status: 'ACTIVE', attempts: 1, items: 2, lastAttemptAt: '2026-10-10T22:00:00Z', recoveredAt: null, eventType: 'sync.batch', deadLetter: false };
const page = (values: Partial<DiagnosticPage> = {}): DiagnosticPage => ({ items: [row], page: 1, limit: 20, hasMore: false, counters: { active: 1, recovered: 0 }, legacyFailures: 2, legacyDescription: 'Não é possível reconstruir seus detalhes com segurança.', retentionDays: 30, truncated: false, coverage: 'CORE_CHECKPOINT_INBOX_COMMANDS', ...values });
async function open() { render(<ProviderDiagnosticsButton provider="WHATSAPP_WEB" count={2} />); fireEvent.click(screen.getByRole('button', { name: /Ver diagnóstico/ })); await screen.findByText('PERSISTENCE_FAILED'); }
describe('contextual provider diagnostics', () => {
 beforeEach(() => {
  auth.session.currentOrganizationId = 'org-a'; auth.session.permissions = ['providers.manage', 'providers.diagnostics.read'];
  vi.spyOn(providerDiagnosticsApi, 'list').mockResolvedValue(page()); vi.spyOn(providerDiagnosticsApi, 'detail').mockResolvedValue(row);
  vi.spyOn(providerDiagnosticsApi, 'health').mockResolvedValue({ provider: 'WHATSAPP_WEB', state: 'CONNECTED', backlog: 0, pendingFailures: 1, failedAttempts: 1, deadLetters: 0, pendingCommands: 0, legacyFailures: 2, lastProcessedAt: null, lastCheckedAt: null, diagnosticsSince: null, detailsAvailable: true });
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } });
 });
 afterEach(() => vi.restoreAllMocks());
 it('requires the specific permission and makes no queries until opened', () => {
  const view = render(<ProviderDiagnosticsButton provider="WHATSAPP_WEB" />); expect(providerDiagnosticsApi.list).not.toHaveBeenCalled();
  auth.session.permissions = ['providers.manage']; view.rerender(<ProviderDiagnosticsButton provider="WHATSAPP_WEB" />); expect(screen.queryByRole('button')).not.toBeInTheDocument();
 });
 it('shows real occurrences and explicitly explains unrecoverable legacy details; Escape returns focus', async () => {
  await open(); expect(screen.getByLabelText('2 ocorrências relevantes')).toBeInTheDocument(); expect(screen.getByText(/Não é possível reconstruir/)).toBeInTheDocument(); expect(screen.getByRole('dialog')).toHaveTextContent('Aguardando retentativa');
  expect(screen.getByRole('button', { name: 'Fechar diagnóstico' })).toHaveFocus(); fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' }); expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(screen.getByRole('button', { name: /Ver diagnóstico/ })).toHaveFocus();
 });
 it('filters and paginates through Core, switches to actual health without invented timestamps', async () => {
  vi.mocked(providerDiagnosticsApi.list).mockResolvedValue(page({ hasMore: true })); await open();
  fireEvent.click(screen.getByRole('button', { name: 'Próxima' })); await waitFor(() => expect(providerDiagnosticsApi.list).toHaveBeenLastCalledWith('WHATSAPP_WEB', expect.objectContaining({ page: 2 }), expect.any(AbortSignal)));
  fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'RECOVERED' } }); await waitFor(() => expect(providerDiagnosticsApi.list).toHaveBeenLastCalledWith('WHATSAPP_WEB', expect.objectContaining({ page: 1, status: 'RECOVERED' }), expect.any(AbortSignal)));
  fireEvent.click(screen.getByRole('tab', { name: 'Eventos' })); await waitFor(() => expect(providerDiagnosticsApi.list).toHaveBeenLastCalledWith('WHATSAPP_WEB', expect.objectContaining({ kind: 'EVENTS' }), expect.any(AbortSignal)));
  fireEvent.click(screen.getByRole('tab', { name: 'Saúde' })); expect(await screen.findByText('CONNECTED')).toBeInTheDocument(); expect(screen.getAllByText('Não disponível').length).toBeGreaterThan(0); expect(providerDiagnosticsApi.health).toHaveBeenCalledOnce();
 });
 it('exports only projected sanitized fields, excluding unexpected payload and credentials', async () => {
  const dirty = { ...row, body: 'SECRET_BODY', token: 'SECRET_TOKEN', stack: 'SECRET_STACK' };
  vi.mocked(providerDiagnosticsApi.detail).mockResolvedValue(dirty); await open();
  const details = screen.getByText('Detalhes da ocorrência').closest('details')!; details.open = true; fireEvent(details, new Event('toggle'));
  await waitFor(() => expect(providerDiagnosticsApi.detail).toHaveBeenCalled()); fireEvent.click(screen.getByRole('button', { name: 'Copiar diagnóstico sanitizado' })); expect(await screen.findByText('Diagnóstico copiado.')).toBeInTheDocument();
  const exported = vi.mocked(navigator.clipboard.writeText).mock.calls[0]![0]; expect(exported).toContain('correlation-1'); expect(exported).not.toContain('SECRET'); expect(sanitizedDiagnostic(dirty)).not.toContain('SECRET');
 });
 it('handles empty records and safe API failures, then retries', async () => {
  vi.mocked(providerDiagnosticsApi.list).mockRejectedValue(new ApiError(503, 'server', 'PRIVATE_STACK_TOKEN'));
  render(<ProviderDiagnosticsButton provider="WHATSAPP_WEB" />); fireEvent.click(screen.getByRole('button', { name: /Ver diagnóstico/ })); expect(await screen.findByRole('alert')).toHaveTextContent('Diagnóstico indisponível'); expect(screen.queryByText('PRIVATE_STACK_TOKEN')).not.toBeInTheDocument();
  vi.mocked(providerDiagnosticsApi.list).mockResolvedValue(page({ items: [], legacyFailures: 0 })); fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' })); expect(await screen.findByText('Nenhuma ocorrência corresponde aos filtros.')).toBeInTheDocument();
 });
 it('removes tenant data immediately on organization or permission changes and aborts queries', async () => {
  const view = render(<ProviderDiagnosticsButton provider="WHATSAPP_WEB" />); fireEvent.click(screen.getByRole('button', { name: /Ver diagnóstico/ })); await screen.findByText('PERSISTENCE_FAILED');
  const signal = vi.mocked(providerDiagnosticsApi.list).mock.calls[0]![2]!;
  auth.session.currentOrganizationId = 'org-b'; view.rerender(<ProviderDiagnosticsButton provider="WHATSAPP_WEB" />); expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(signal.aborted).toBe(true);
 });
 it('keeps a responsive viewport bound and scrollable content without a graphical browser', () => {
  const css = readFileSync('src/features/providers/provider-diagnostics.css', 'utf8'); expect(css).toContain('width: min(580px, 100vw)'); expect(css).toContain('overflow-y: auto'); expect(css).toContain('minmax(0, 1fr)');
 });
});
