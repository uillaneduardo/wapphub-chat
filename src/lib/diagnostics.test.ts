import { afterEach, expect, it, vi } from 'vitest';
import { diagnose, diagnosticSnapshot } from './diagnostics';
afterEach(() => { sessionStorage.clear(); vi.restoreAllMocks(); });
it('is opt-in, bounded, and records only technical state in memory', () => {
  const log = vi.spyOn(console, 'info').mockImplementation(() => {});
  diagnose({ kind: 'message.status', from: 'PENDING', to: 'DELIVERED' }); expect(log).not.toHaveBeenCalled();
  sessionStorage.setItem('wapphub-chat:diagnostics', '1');
  for (let i = 0; i < 210; i++) diagnose({ kind: 'realtime.event', eventId: String(i), checkpoint: '0' });
  expect(diagnosticSnapshot()).toHaveLength(200);
  expect(new Set(diagnosticSnapshot().map(row => row.instanceId)).size).toBe(1);
  expect(Object.keys(diagnosticSnapshot()[0]!)).toEqual(['kind', 'eventId', 'checkpoint', 'instanceId', 'at', 'navigationType']);
  expect(sessionStorage.length).toBe(1);
});
