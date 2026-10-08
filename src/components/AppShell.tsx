import { useEffect, useState } from 'react';
import { Outlet, useMatch } from 'react-router-dom';
import { useSession } from '../features/session/SessionContext';
import { currentOrganization } from '../types/auth';
import { createRealtimeUrl, RealtimeClient } from '../lib/realtime';
import { Sidebar } from './Sidebar';
import { realtimeBus } from '../lib/realtimeBus';

export function AppShell() { const { session } = useSession(); const organization = session ? currentOrganization(session) : null;
  const inConversations = Boolean(useMatch('/app/conversations/*'));
  const [realtimeState, setRealtimeState] = useState<'connecting' | 'open' | 'reconnecting' | 'closed'>('closed');
  const organizationId = organization?.id; const canReadConversations = session?.permissions.includes('conversations.read') ?? false;
  useEffect(() => {
    if (!organizationId || !canReadConversations) { setRealtimeState('closed'); return; }
    const client = new RealtimeClient({ url: createRealtimeUrl(import.meta.env.VITE_API_BASE_URL || window.location.origin), organizationId, onEvent: realtimeBus.emit, onState: setRealtimeState });
    client.connect(); return () => client.close();
  }, [organizationId, canReadConversations]);
  return <div className={`app-shell${inConversations ? ' chat-app-shell' : ''}`}><Sidebar key={session?.user.id ?? 'signed-out'} /><main className="main-content"><div className={`realtime-status realtime-${realtimeState}`} role="status"><span />{realtimeState === 'open' ? 'Conectado' : realtimeState === 'reconnecting' || realtimeState === 'connecting' ? 'Reconectando' : 'Realtime indisponível'}</div><Outlet /></main></div>;
}
