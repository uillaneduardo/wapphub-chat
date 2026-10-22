import { diagnose } from '../lib/diagnostics';
import { useEffect, useRef, useState } from 'react';
import { Outlet, useMatch } from 'react-router-dom';
import { useSession } from '../features/session/SessionContext';
import { currentOrganization } from '../types/auth';
import { createRealtimeUrl, RealtimeClient, createAccountCheckpointStore } from '../lib/realtime';
import { Sidebar } from './Sidebar';
import { realtimeBus } from '../lib/realtimeBus';
import { activateComposerScope, clearComposerDrafts } from '../features/conversations/composerDrafts';

export function AppShell() { const { session, expireSession, refreshSession } = useSession(); const organization = session ? currentOrganization(session) : null;
  const inConversations = Boolean(useMatch('/app/conversations/*'));
  const [realtimeState, setRealtimeState] = useState<'connecting' | 'open' | 'reconnecting' | 'stale' | 'closed'>('closed');
  const clientRef = useRef<RealtimeClient | null>(null);
  const userId = session?.user.id;
  const organizationId = organization?.id; const canReadConversations = session?.permissions.includes('conversations.read') ?? false; const canReadContacts = session?.permissions.includes('contacts.read') ?? false;
  const canSendMessages = session?.permissions.includes('messages.send') ?? false;
  useEffect(() => { activateComposerScope(canSendMessages ? userId ?? null : null, canSendMessages ? organizationId ?? null : null); return () => clearComposerDrafts(); }, [userId, organizationId, canSendMessages]);
  const authorizationStamp = `${session?.membership?.permissionVersion ?? 0}:${[...(session?.permissions ?? [])].sort().join(',') ?? ''}`;
  useEffect(() => { diagnose({ kind: 'shell.mount' }); return () => diagnose({ kind: 'shell.unmount' }); }, []);
  useEffect(() => {
    if (!organizationId) { setRealtimeState('closed'); return; }
    const url = new URL(createRealtimeUrl(import.meta.env.VITE_API_BASE_URL || window.location.origin));
    if (!canReadConversations) url.pathname = canReadContacts ? '/api/v1/contacts/realtime' : '/api/v1/session/updates';
    const client = new RealtimeClient({ url: url.toString(), organizationId, checkpointStore: canReadConversations ? createAccountCheckpointStore(userId ?? '') : { get: () => null, set: () => undefined }, onEvent: realtimeBus.emit, onReconcile: canReadConversations || canReadContacts ? (signal) => realtimeBus.reconcile(organizationId, signal) : undefined, onUnauthorized: expireSession, onPermissionsChanged: () => void refreshSession(true), onState: setRealtimeState });
    clientRef.current = client; client.connect();
    const online = () => client.retry('online');
    const resume = () => { if (document.visibilityState === 'visible') client.resume(); };
    window.addEventListener('online', online); window.addEventListener('focus', resume); document.addEventListener('visibilitychange', resume);
    return () => { window.removeEventListener('online', online); window.removeEventListener('focus', resume); document.removeEventListener('visibilitychange', resume); client.close(); clientRef.current = null; };
  }, [organizationId, userId, canReadConversations, canReadContacts, expireSession, refreshSession, authorizationStamp]);
  return <div className={`app-shell${inConversations ? ' chat-app-shell' : ''}`}><Sidebar key={session?.user.id ?? 'signed-out'} realtimeState={realtimeState} onRealtimeRetry={() => clientRef.current?.retry()} /><main className="main-content"><Outlet key={`${userId}:${organizationId}:${authorizationStamp}`} /></main></div>;
}
