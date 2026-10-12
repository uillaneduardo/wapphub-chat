import { apiRequest } from './api';
export type WebState = 'DISCONNECTED' | 'CONNECTING' | 'QR_READY' | 'CONNECTED' | 'RECONNECTING' | 'ERROR';
export type WebAction = 'connect' | 'refresh' | 'recover' | 'disconnect' | 'logout';
export interface SyncDiagnostics { since: string; received: number; normalized: number; ignored: number; rejected: number; failures: number; legacyFailures: number; publishedBatches: number; acknowledgedBatches: number; sourceCounts: Record<string, number>; reasons: Record<string, number>; lastSource?: string; lastCode?: string }
export interface WebConnection {
  id: string; state: string; uiState: WebState; version: number; qrRevision: number; errorCode: string | null; lastCheckedAt: string | null;
  operation: { id: string; action: WebAction | 'create' | 'history_prepare' | 'history_start' | 'history_pause' | 'history_resume' | 'history_cancel' | 'history_authorize' | 'history_reconcile'; status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'; errorCode: string | null } | null;
  sendingEnabled: boolean; mediaEnabled: boolean;
  lifecycle?: { linked: boolean; desired: boolean; recoveryEligible: boolean; recovery?: { commandId: string; state: 'RUNNING' | 'AUTHENTICATED' | 'SUCCEEDED' | 'FAILED' | 'INTERRUPTED'; startedAt: string; finishedAt?: string; errorCode?: string }; termination?: { commandId: string; action: 'disconnect' | 'logout'; remote: 'NOT_REQUESTED' | 'PENDING' | 'CONFIRMED' | 'UNCONFIRMED'; requestedAt: string; finishedAt?: string; errorCode?: string } } | null;
  pairingPhase?: 'IDLE' | 'GENERATING_QR' | 'WAITING_SCAN' | 'AUTHENTICATING' | 'CONNECTED' | 'RECONNECTING' | null;
  sync?: { receivedItems?: number; processedItems?: number; duplicateItems?: number; rejectedItems?: number; conversationsLocated?: number; failedAttempts?: number; pendingFailures?: number; diagnosticsSince?: string; contacts: number; conversations: number; messages: number; failures: number; batches: number; lastProcessedAt?: string; lastErrorCode?: string; provider: { historyEnabled: boolean; phase: 'DISABLED' | 'AWAITING_HISTORY' | 'CONTACTS' | 'MESSAGES' | 'PROCESSED' | 'PARTIAL'; queued: number; contacts: number; conversations: number; messages: number; failures: number; limited: boolean; durationMs: number; diagnostics?: SyncDiagnostics } | null };
}
export interface WebQr { qr: string; revision: number; expiresAt: string; expiresInMs: number }
const base = '/providers/whatsapp-web/connections';
const mutationSignal = (signal: AbortSignal) => AbortSignal.any([signal, AbortSignal.timeout(15_000)]);
export const webProviderApi = {
  capabilities: (id: string, outboundEnabled: boolean, mediaEnabled: boolean, signal: AbortSignal) => apiRequest<{ outboundEnabled: boolean; mediaEnabled: boolean }>(`${base}/${encodeURIComponent(id)}/capabilities`, { method: 'PUT', body: JSON.stringify({ outboundEnabled, mediaEnabled }), signal }),
  read: (signal: AbortSignal) => apiRequest<{ connection: WebConnection | null }>(base, { signal }),
  create: (commandId: string, signal: AbortSignal) => apiRequest<WebConnection>(base, { method: 'POST', body: JSON.stringify({ commandId }), signal: mutationSignal(signal) }),
  command: (connection: WebConnection, action: WebAction, commandId: string, signal: AbortSignal) => apiRequest<WebConnection>(`${base}/${encodeURIComponent(connection.id)}/commands`, { method: 'POST', body: JSON.stringify({ commandId, action, expectedVersion: connection.version, ...(['recover', 'logout'].includes(action) ? { confirmed: true } : {}) }), signal: mutationSignal(signal) }),
  qr: (id: string, signal: AbortSignal) => apiRequest<WebQr>(`${base}/${encodeURIComponent(id)}/qr`, { signal, cache: 'no-store' }),
};
