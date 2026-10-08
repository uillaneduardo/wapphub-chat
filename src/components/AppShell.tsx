import { NavLink, Outlet } from 'react-router-dom';
import { useSession } from '../features/session/SessionContext';
import { currentOrganization } from '../types/auth';

export function AppShell() { const { session, logout } = useSession(); const organization = session ? currentOrganization(session) : null;
  return <div className="app-shell"><aside className="sidebar"><a className="brand" href="/app/conversations"><span className="brand-mark">W</span><span>WappHub <small>CHAT</small></span></a><nav aria-label="Navegação principal">
    <NavLink to="/app/conversations">Conversas</NavLink><NavLink to="/app/contacts">Contatos</NavLink><NavLink to="/app/files">Arquivos</NavLink><NavLink to="/app/team">Equipe</NavLink><NavLink to="/app/tags">Tags</NavLink><NavLink to="/app/settings">Configurações</NavLink>
  </nav><div className="sidebar-user"><span className="avatar">{session?.user.name.slice(0, 1).toUpperCase()}</span><span className="user-label">{session?.user.name}<small>{organization?.name}</small></span><button className="icon-button" aria-label="Sair" onClick={() => void logout()}>↗</button></div></aside><main className="main-content"><Outlet /></main></div>;
}
