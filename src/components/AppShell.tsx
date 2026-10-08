import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useSession } from '../features/session/SessionContext';
import { currentOrganization } from '../types/auth';
import { createRealtimeUrl, RealtimeClient } from '../lib/realtime';
import { realtimeBus } from '../lib/realtimeBus';

export function AppShell() { const { session, logout } = useSession(); const organization = session ? currentOrganization(session) : null;
  const [realtimeState, setRealtimeState] = useState<'connecting' | 'open' | 'reconnecting' | 'closed'>('closed');
  const organizationId = organization?.id; const canReadConversations = session?.permissions.includes('conversations.read') ?? false;
  useEffect(() => {
    if (!organizationId || !canReadConversations) { setRealtimeState('closed'); return; }
    const client = new RealtimeClient({ url: createRealtimeUrl(import.meta.env.VITE_API_BASE_URL || window.location.origin), organizationId, onEvent: realtimeBus.emit, onState: setRealtimeState });
    client.connect(); return () => client.close();
  }, [organizationId, canReadConversations]);
  return <div className="app-shell"><aside className="sidebar"><a className="brand" href="/app/conversations"><span className="brand-mark">W</span><span>WappHub <small>CHAT</small></span></a><nav aria-label="Navegação principal">
    {canReadConversations && <NavLink to="/app/conversations">Conversas</NavLink>}<NavLink to="/app/contacts">Contatos</NavLink><NavLink to="/app/files">Arquivos</NavLink><NavLink to="/app/team">Equipe</NavLink><NavLink to="/app/tags">Tags</NavLink><NavLink to="/app/settings">Configurações</NavLink>{session?.permissions.includes('providers.manage') && <NavLink to="/app/settings/providers">Provedores</NavLink>}
  </nav><div className="sidebar-user"><span className="avatar">{session?.user.name.slice(0, 1).toUpperCase()}</span><span className="user-label">{session?.user.name}<small>{organization?.name}</small></span><button className="icon-button" aria-label="Sair" onClick={() => void logout()}>↗</button></div></aside><main className="main-content"><div className={`realtime-status realtime-${realtimeState}`} role="status"><span />{realtimeState === 'open' ? 'Conectado' : realtimeState === 'reconnecting' || realtimeState === 'connecting' ? 'Reconectando' : 'Realtime indisponível'}</div><Outlet /></main></div>;
}
