import { describe, expect, it } from 'vitest';
import { connectionPresentation } from './webConnectionPresentation';
import type { WebConnection } from '../../lib/webProviderApi';
const c = (values: Partial<WebConnection> = {}): WebConnection => ({ id: 'synthetic', state: 'DISCONNECTED', uiState: 'DISCONNECTED', version: 1, qrRevision: 0, errorCode: null, lastCheckedAt: new Date().toISOString(), operation: null, sendingEnabled: false, mediaEnabled: false, lifecycle: { linked: false, desired: false, recoveryEligible: false, pairingEligible: true }, ...values });
describe('contextual link presentation', () => {
 it('offers a single link decision before creation', () => expect(connectionPresentation(null, true, false).action?.command).toBe('link'));
 it.each([
  [c(), 'Não vinculado', 'link'],
  [c({ uiState: 'QR_READY' }), 'Aguardando leitura', undefined],
  [c({ uiState: 'CONNECTING' }), 'Preparando vinculação…', undefined],
  [c({ uiState: 'RECONNECTING' }), 'Reconectando…', undefined],
  [c({ uiState: 'CONNECTED', transportConfirmed: true }), 'Conectado', undefined],
  [c({ uiState: 'CONNECTED', transportConfirmed: false }), 'Conexão temporariamente indisponível', undefined],
  [c({ pairingPhase: 'AUTHENTICATING' }), 'Autenticando…', undefined],
  [c({ uiState: 'ERROR', errorCode: 'RECONNECT_LIMIT', lifecycle: { linked: true, desired: false, recoveryEligible: true } }), 'Não foi possível restabelecer a conexão', 'recover'],
  [c({ uiState: 'ERROR', errorCode: 'SESSION_REVOKED', lifecycle: { linked: true, desired: false, recoveryEligible: false, preparationEligible: true } }), 'Não vinculado', 'link'],
  [c({ lifecycle: { linked: true, desired: false, recoveryEligible: false, preparationEligible: true, removalConfirmationRequired: true } }), 'Remoção do aparelho não confirmada', 'link'],
 ] as const)('derives %s without inventing backend eligibility', (value, status, command) => { const view = connectionPresentation(value, true, false); expect(view.status).toBe(status); expect(view.action?.command).toBe(command); });
 it('expires QR without automatic refresh', () => expect(connectionPresentation(c({ uiState: 'QR_READY' }), true, true).action?.command).toBe('refresh'));
 it.each(['RUNNING', 'AUTHENTICATED'] as const)('does not repeat recovery %s', state => { const view = connectionPresentation(c({ lifecycle: { linked: true, desired: false, recoveryEligible: false, recovery: { commandId: 'synthetic', state, startedAt: new Date().toISOString() } } }), true, false); expect(view.action).toBeNull(); expect(view.connected).toBe(false); });
 it('never presents cached connected state as current during unavailability', () => { const view = connectionPresentation(c({ uiState: 'CONNECTED', transportConfirmed: true }), false, false); expect(view.connected).toBe(false); expect(view.status).toBe('Não foi possível verificar'); expect(view.action).toBeNull(); });
});
