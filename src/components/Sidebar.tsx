import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation } from 'react-router-dom';
import { useSession } from '../features/session/SessionContext';
import { useUiPreference } from '../hooks/useUiPreference';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { Icon } from './Icon';
import type { IconName } from './Icon';
import { NavHint } from './NavHint';

const links: { to: string; label: string; icon: IconName; permission?: string }[] = [
  { to: '/app/conversations', label: 'Conversas', icon: 'conversations', permission: 'conversations.read' },
  { to: '/app/contacts', label: 'Contatos', icon: 'contacts' },
  { to: '/app/files', label: 'Arquivos', icon: 'files' },
  { to: '/app/team', label: 'Equipe', icon: 'team' },
  { to: '/app/tags', label: 'Tags', icon: 'tags' },
];
export function Sidebar() {
  const { session, logout } = useSession(); const location = useLocation();
  const [collapsed, setCollapsed] = useUiPreference(session?.user.id, 'sidebarCollapsed');
  const mobile = useMediaQuery('(max-width: 720px)'); const compact = collapsed || mobile;
  const canManageProviders = session?.permissions.includes('providers.manage') ?? false;
  const [childrenOpen, setChildrenOpen] = useState(true); const [flyoutOpen, setFlyoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false); const logoutBusy = useRef(false); const [logoutError, setLogoutError] = useState('');
  const groupId = useId(); const trigger = useRef<HTMLButtonElement>(null); const flyout = useRef<HTMLDivElement>(null); const logoutButton = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ left: 0, top: 0, width: 230, maxHeight: 300 });
  const settingsActive = location.pathname === '/app/settings' || location.pathname.startsWith('/app/settings/');
  const expandedChildren = childrenOpen;
  function closeFlyout(restoreFocus = false) { setFlyoutOpen(false); if (restoreFocus) trigger.current?.focus(); }
  useLayoutEffect(() => {
    if (!flyoutOpen || !compact) return;
    function place() {
      const rect = trigger.current!.getBoundingClientRect(); const width = Math.min(230, window.innerWidth - 16);
      const maxHeight = Math.min(300, window.innerHeight - 16); const height = Math.min(150, maxHeight);
      setPosition({ left: Math.max(8, Math.min(rect.right + 8, window.innerWidth - width - 8)), top: Math.max(8, Math.min(mobile ? rect.top - height - 8 : rect.top, window.innerHeight - height - 8)), width, maxHeight });
    }
    place(); flyout.current?.querySelector<HTMLAnchorElement>('a')?.focus();
    window.addEventListener('resize', place); window.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [flyoutOpen, compact, mobile]);
  useEffect(() => {
    if (!flyoutOpen) return;
    function outside(event: Event) { const target = event.target as Node; if (!trigger.current?.contains(target) && !flyout.current?.contains(target)) setFlyoutOpen(false); }
    document.addEventListener('pointerdown', outside); document.addEventListener('focusin', outside);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('focusin', outside); };
  }, [flyoutOpen]);
  async function signOut() {
    if (logoutBusy.current) return; logoutBusy.current = true; setLoggingOut(true); setLogoutError('');
    try { await logout(); } catch { setLogoutError('Não foi possível concluir a saída. Tente novamente.'); }
    finally { logoutBusy.current = false; setLoggingOut(false); }
  }
  const settingsLink = <NavLink to="/app/settings" aria-label="Configurações"><Icon name="settings" /><span className="nav-label">Configurações</span></NavLink>;
  return <aside className={`sidebar${collapsed ? ' is-collapsed' : ''}`} aria-label="Menu principal">
    <div className="sidebar-heading"><a className="brand" href="/app/conversations" aria-label="WappHub Chat"><span className="brand-mark">W</span><span className="brand-label">WappHub <small>CHAT</small></span></a>
      <NavHint enabled={collapsed} label={collapsed ? 'Expandir menu' : 'Recolher menu'}><button type="button" className="nav-toggle" aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'} aria-expanded={!collapsed} aria-controls="main-navigation" onClick={() => { setCollapsed(!collapsed); closeFlyout(); }}><Icon name={collapsed ? 'expand' : 'collapse'} /></button></NavHint>
    </div>
    <nav id="main-navigation" aria-label="Navegação principal">
      {links.filter((link) => !link.permission || session?.permissions.includes(link.permission)).map((link) => <NavHint key={link.to} label={link.label} enabled={compact}><NavLink to={link.to} aria-label={link.label}><Icon name={link.icon} /><span className="nav-label">{link.label}</span></NavLink></NavHint>)}
      <div className="nav-group">
        {compact ? <NavHint label="Configurações" enabled><button ref={trigger} type="button" className={`nav-group-trigger${settingsActive ? ' active' : ''}`} aria-label="Configurações" aria-expanded={flyoutOpen} aria-controls={flyoutOpen ? groupId : undefined} onClick={() => setFlyoutOpen((open) => !open)} onKeyDown={(event) => { if (event.key === 'Escape') closeFlyout(); }}><Icon name="settings" /><span className="nav-label">Configurações</span></button></NavHint> : <div className="nav-group-heading">{settingsLink}{canManageProviders && <button type="button" className="subnav-toggle" aria-label={expandedChildren ? 'Recolher subitens de Configurações' : 'Expandir subitens de Configurações'} aria-expanded={expandedChildren} aria-controls={groupId} onClick={() => setChildrenOpen((open) => !open)}><Icon name="chevron" /></button>}</div>}
        {!compact && canManageProviders && <ul id={groupId} className="nav-children" hidden={!expandedChildren}><li><NavLink to="/app/settings/providers" aria-label="Provedores"><Icon name="providers" /><span>Provedores</span></NavLink></li></ul>}
      </div>
    </nav>
    <footer className="sidebar-footer"><div className="sidebar-user"><span className="avatar">{session?.user.name.slice(0, 1).toUpperCase()}</span><span className="user-label">{session?.user.name}<small>{session?.organization?.name}</small></span></div>
      <NavHint label="Sair da conta" enabled={compact}><button ref={logoutButton} type="button" className="logout-button" aria-label="Sair da conta" disabled={loggingOut} onClick={() => void signOut()}><Icon name="logout" /><span className="nav-label">{loggingOut ? 'Saindo…' : 'Sair da conta'}</span></button></NavHint>
      {logoutError && <p role="alert" className="error-text">{logoutError}</p>}
    </footer>
    {compact && flyoutOpen && createPortal(<div ref={flyout} id={groupId} role="region" aria-label="Submenu de Configurações" className="nav-flyout" style={position} onKeyDown={(event) => {
      const items = [...flyout.current!.querySelectorAll<HTMLAnchorElement>('a')]; const index = items.indexOf(document.activeElement as HTMLAnchorElement);
      if (event.key === 'Escape') { event.preventDefault(); closeFlyout(true); }
      if (event.key === 'Tab' && ((!event.shiftKey && index === items.length - 1) || (event.shiftKey && index === 0))) { event.preventDefault(); closeFlyout(); if (event.shiftKey) trigger.current?.focus(); else logoutButton.current?.focus(); }
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) { event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; items[next]?.focus(); }
    }}><strong>Configurações</strong><NavLink to="/app/settings" end onClick={() => closeFlyout()}><Icon name="settings" />Visão geral</NavLink>{canManageProviders && <NavLink to="/app/settings/providers" onClick={() => closeFlyout()}><Icon name="providers" />Provedores</NavLink>}</div>, document.body)}
  </aside>;
}
