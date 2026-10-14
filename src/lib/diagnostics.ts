import type { MessageStatus } from '../types/chat';

type Diagnostic = { kind: 'document.start' | 'document.leave' | 'shell.mount' | 'shell.unmount' | 'realtime.connect' | 'realtime.event' | 'realtime.checkpoint' | 'realtime.retry' | 'realtime.resume' | 'message.status'; reason?: 'manual' | 'online' | 'focus' | 'silence' | 'closed' | 'failure' | 'permissions' | 'unauthorized'; closeCode?: number; eventId?: string; checkpoint?: string; from?: MessageStatus; to?: MessageStatus };
const instanceId = globalThis.crypto?.randomUUID?.() ?? String(Date.now());
const records: (Diagnostic & { instanceId: string; at: number; navigationType: string })[] = [];
const navigationType = (performance.getEntriesByType?.('navigation')[0] as PerformanceNavigationTiming | undefined)?.type ?? 'unknown';
/** Opt-in, memory-only, 200 records; no identity, content, URL, media or errors. */
export function diagnose(record: Diagnostic): void {
  try {
    if (sessionStorage.getItem('wapphub-chat:diagnostics') !== '1') return;
    const entry = { ...record, instanceId, at: performance.now(), navigationType };
    records.push(entry); if (records.length > 200) records.shift();
    console.info('[wapphub diagnostic]', entry);
  } catch { /* Diagnostics never affect application work. */ }
}
export function diagnosticSnapshot() { return records.map(record => ({ ...record })); }
export function installDocumentDiagnostics() {
  diagnose({ kind: 'document.start' });
  const leave = () => diagnose({ kind: 'document.leave' });
  window.addEventListener('pagehide', leave);
}
