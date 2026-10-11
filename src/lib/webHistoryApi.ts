import { apiRequest } from './api';
export type HistoryState = 'PREPARED' | 'RUNNING' | 'WAITING' | 'BACKPRESSURE' | 'PAUSED' | 'CANCELLED' | 'COMPLETED' | 'PARTIAL' | 'NO_DATA' | 'FAILED';
export type HistoryAction = 'start' | 'pause' | 'resume' | 'cancel';
export interface HistoryOperation {
 id: string; state: HistoryState; from: string; to: string; limits: { contacts: number; conversations: number; messages: number }; processed: number; duplicates: number; rejected: number; persisted: { contacts: number; conversations: number; messages: number }; createdAt: string; errorCode?: string | null; authorization?: { state: "ENABLED" | "PAUSED" | "DISABLED"; authorizedAt: string } | null;
 source: { state: HistoryState; contacts: number; conversations: number; messages: number; requests: number; duplicates: number; failures: number; limited: boolean; queued: number; errorCode?: string; lastProcessedAt?: string } | null;
}
export interface HistoryStatus { version: number; executionEnabled: boolean; operation: HistoryOperation | null; mechanism: string; remoteAvailability: string }
const base = (id: string) => `/providers/whatsapp-web/connections/${encodeURIComponent(id)}/history`;
export const webHistoryApi = {
 configure: (id: string, version: number, action: 'enable' | 'pause' | 'disable', commandId: string, signal: AbortSignal, confirmed = false) => apiRequest<{ operation: HistoryOperation }>(`${base(id)}/authorization`, { method: 'POST', body: JSON.stringify({ commandId, expectedVersion: version, action, confirmed }), signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]) }),
 read: (id: string, signal: AbortSignal) => apiRequest<HistoryStatus>(base(id), { signal, cache: 'no-store' }),
 prepare: (id: string, version: number, messages: number, commandId: string, signal: AbortSignal) => apiRequest<{ operation: HistoryOperation }>(`${base(id)}/prepare`, { method: 'POST', body: JSON.stringify({ commandId, expectedVersion: version, messages }), signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]) }),
 command: (id: string, version: number, operationId: string, action: HistoryAction, commandId: string, signal: AbortSignal) => apiRequest<{ operation: HistoryOperation }>(`${base(id)}/commands`, { method: 'POST', body: JSON.stringify({ commandId, expectedVersion: version, operationId, action }), signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]) }),
};
