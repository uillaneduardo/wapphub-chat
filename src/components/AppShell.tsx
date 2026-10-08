import { useEffect, useRef, useState } from 'react';
import { Outlet, useMatch } from 'react-router-dom';
import { useSession } from '../features/session/SessionContext';
import { currentOrganization } from '../types/auth';
import { createRealtimeUrl, RealtimeClient, createAccountCheckpointStore } from '../lib/realtime';
import { Sidebar } from './Sidebar';
import { realtimeBus } from '../lib/realtimeBus';

export function AppShell() { const { session, expireSession } = useSession(); const organization = session ? currentOrganization(session) : null;
  const inConversations = Boolean(useMatch('/app/conversations/*'));
  const [realtimeState, setRealtimeState] = useState<'connecting' | 'open' | 'reconnecting' | 'stale' | 'closed'>('closed');
  const clientRef = useRef<RealtimeClient | null>(null);
  const userId = session?.user.id;
  const organizationId = organization?.id; const canReadConversations = session?.permissions.includes('conversations.read') ?? false;
  useEffect(() => {
    if (!organizationId || !canReadConversations) { setRealtimeState('closed'); return; }
    const client = new RealtimeClient({ url: createRealtimeUrl(import.meta.env.VITE_API_BASE_URL || window.location.origin), organizationId, checkpointStore: createAccountCheckpointStore(userId ?? ''), onEvent: realtimeBus.emit, onReconcile: (signal) => realtimeBus.reconcile(organizationId, signal), onUnauthorized: expireSession, onState: setRealtimeState });
    clientRef.current = client; client.connect();
    const online = () => client.retry(); window.addEventListener('online', online);
    return () => { window.removeEventListener('online', online); client.close(); clientRef.current = null; };
  }, [organizationId, userId, canReadConversations, expireSession]);
  return <div className={`app-shell${inConversations ? ' chat-app-shell' : ''}`}><Sidebar key={session?.user.id ?? 'signed-out'} /><main className="main-content"><div className={`realtime-status realtime-${realtimeState}`} role="status"><span />{realtimeState === 'open' ? 'Conectado' : realtimeState === 'reconnecting' || realtimeState === 'connecting' ? 'Reconectando' : realtimeState === 'stale' ? 'Dados desatualizados — reconexão pausada' : 'Realtime indisponível'}{realtimeState === 'stale' && <button type="button" className="text-button" onClick={() => clientRef.current?.retry()}>Tentar novamente</button>}</div><Outlet key={`${userId}:${organizationId}`} /></main></div>;
}
