import { apiRequest } from './api';
export type WebState = 'DISCONNECTED' | 'CONNECTING' | 'QR_READY' | 'CONNECTED' | 'RECONNECTING' | 'ERROR';
export type WebAction = 'connect' | 'refresh' | 'disconnect';
export interface SyncDiagnostics { since: string; received: number; normalized: number; ignored: number; rejected: number; failures: number; legacyFailures: number; publishedBatches: number; acknowledgedBatches: number; sourceCounts: Record<string, number>; reasons: Record<string, number>; lastSource?: string; lastCode?: string }
export interface WebConnection {
  id: string; state: string; uiState: WebState; version: number; qrRevision: number; errorCode: string | null; lastCheckedAt: string | null;
  operation: { id: string; action: WebAction | 'create'; status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'; errorCode: string | null } | null;
  sendingEnabled: false; mediaEnabled: false;
  pairingPhase?: 'IDLE' | 'GENERATING_QR' | 'WAITING_SCAN' | 'AUTHENTICATING' | 'CONNECTED' | 'RECONNECTING' | null;
  sync?: { receivedItems?: number; processedItems?: number; duplicateItems?: number; rejectedItems?: number; conversationsLocated?: number; failedAttempts?: number; pendingFailures?: number; diagnosticsSince?: string; contacts: number; conversations: number; messages: number; failures: number; batches: number; lastProcessedAt?: string; lastErrorCode?: string; provider: { historyEnabled: boolean; phase: 'DISABLED' | 'AWAITING_HISTORY' | 'CONTACTS' | 'MESSAGES' | 'PROCESSED' | 'PARTIAL'; queued: number; contacts: number; conversations: number; messages: number; failures: number; limited: boolean; durationMs: number; diagnostics?: SyncDiagnostics } | null };
}
export interface WebQr { qr: string; revision: number; expiresAt: string; expiresInMs: number }
const base = '/providers/whatsapp-web/connections';
const mutationSignal = (signal: AbortSignal) => AbortSignal.any([signal, AbortSignal.timeout(15_000)]);
export const webProviderApi = {
  read: (signal: AbortSignal) => apiRequest<{ connection: WebConnection | null }>(base, { signal }),
  create: (commandId: string, signal: AbortSignal) => apiRequest<WebConnection>(base, { method: 'POST', body: JSON.stringify({ commandId }), signal: mutationSignal(signal) }),
  command: (connection: WebConnection, action: WebAction, commandId: string, signal: AbortSignal) => apiRequest<WebConnection>(`${base}/${encodeURIComponent(connection.id)}/commands`, { method: 'POST', body: JSON.stringify({ commandId, action, expectedVersion: connection.version }), signal: mutationSignal(signal) }),
  qr: (id: string, signal: AbortSignal) => apiRequest<WebQr>(`${base}/${encodeURIComponent(id)}/qr`, { signal, cache: 'no-store' }),
};
