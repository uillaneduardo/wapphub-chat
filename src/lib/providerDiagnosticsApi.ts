import { apiRequest } from './api';
export type DiagnosticProvider = 'WHATSAPP_WEB' | 'DEMO' | 'META';
export interface DiagnosticOccurrence { id: string; correlationId: string | null; code: string; description: string; occurredAt: string; component: string; stage: string; severity: string; status: string; attempts: number | null; items: number | null; lastAttemptAt: string | null; recoveredAt: string | null; eventType: string | null; deadLetter: boolean | null }
export interface DiagnosticPage { items: DiagnosticOccurrence[]; page: number; limit: number; hasMore: boolean; counters: { active: number; recovered: number }; legacyFailures: number; legacyDescription: string | null; retentionDays: number; truncated: boolean; coverage: string }
export interface DiagnosticHealth { provider: string; state: string; backlog: number | null; pendingFailures: number | null; failedAttempts: number | null; deadLetters: number | null; pendingCommands: number | null; legacyFailures: number | null; lastProcessedAt: string | null; lastCheckedAt: string | null; diagnosticsSince: string | null; detailsAvailable: boolean }
export type DiagnosticFilters = { kind?: string; page?: number; limit?: number; from?: string; to?: string; severity?: string; stage?: string; status?: string };
const path = (provider: DiagnosticProvider) => `/providers/${provider}/diagnostics`;
export const providerDiagnosticsApi = {
 list: (provider: DiagnosticProvider, filters: DiagnosticFilters, signal?: AbortSignal) => {
  const params = new URLSearchParams(); Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== '') params.set(key, String(value)); });
  return apiRequest<DiagnosticPage>(`${path(provider)}?${params}`, { signal });
 },
 detail: (provider: DiagnosticProvider, id: string, signal?: AbortSignal) => apiRequest<DiagnosticOccurrence>(`${path(provider)}/${encodeURIComponent(id)}`, { signal }),
 health: (provider: DiagnosticProvider, signal?: AbortSignal) => apiRequest<DiagnosticHealth>(`${path(provider)}/health`, { signal }),
};
// Explicit projection also protects clipboard against accidental future API fields.
export function sanitizedDiagnostic(row: DiagnosticOccurrence): string {
 return JSON.stringify({ version: 1, id: row.id, correlationId: row.correlationId, code: row.code, occurredAt: row.occurredAt, component: row.component, stage: row.stage, severity: row.severity, status: row.status, attempts: row.attempts, items: row.items, lastAttemptAt: row.lastAttemptAt, recoveredAt: row.recoveredAt, eventType: row.eventType, deadLetter: row.deadLetter }, null, 2);
}
