import './navigation.css';
import { RotateCw } from 'lucide-react';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation } from 'react-router-dom';
import { useSession } from '../features/session/SessionContext';
import { useUiPreference } from '../hooks/useUiPreference';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { AppIcon } from './AppIcon';
import { NavHint } from './NavHint';

import { visibleNavigation, isNavigationLink, type NavigationItem, type NavigationContext } from './navigation';
type RealtimeState = 'open' | 'connecting' | 'reconnecting' | 'stale' | 'closed';
const realtimeLabels: Record<RealtimeState, string> = { open: 'Tempo real ativo', connecting: 'Conectando…', reconnecting: 'Reconectando…', closed: 'Tempo real indisponível', stale: 'Tempo real indisponível' };
export function Sidebar({ realtimeState = 'closed', onRealtimeRetry }: { realtimeState?: RealtimeState; onRealtimeRetry?: () => void }) {
  const { session, logout } = useSession(); const location = useLocation();
  const [collapsed, setCollapsed] = useUiPreference(session?.user.id, 'sidebarCollapsed');
  const mobile = useMediaQuery('(max-width: 720px)'); const compact = collapsed || mobile;
  const groups = visibleNavigation(session?.permissions ?? [], session?.resources ?? []);
  const operationalItems = groups.find((group) => group.context === 'Atendimento')?.items ?? [];
  const primaryLinks = operationalItems.filter((item) => ['conversations', 'contacts'].includes(item.id));
  const secondaryGroups = groups.map((group) => ({ ...group, items: group.items.filter((item) => !primaryLinks.includes(item)) })).filter((group) => group.items.length);
  const [flyoutSection, setFlyoutSection] = useState<NavigationContext | 'Mais áreas' | null>(null);
  const [loggingOut, setLoggingOut] = useState(false); const logoutBusy = useRef(false); const [logoutError, setLogoutError] = useState('');
  const groupId = useId(); const trigger = useRef<HTMLButtonElement>(null); const flyout = useRef<HTMLDivElement>(null); const logoutButton = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ left: 0, top: 0, width: 230, maxHeight: 300 });
  function closeFlyout(restoreFocus = false) { setFlyoutSection(null); if (restoreFocus) trigger.current?.focus(); }
  useEffect(() => { setFlyoutSection(null); }, [session?.organization?.id, location.pathname, compact]);
  useLayoutEffect(() => {
    if (!flyoutSection) return;
    function place() {
      const rect = trigger.current!.getBoundingClientRect(); const width = Math.min(250, window.innerWidth - 16);
      const maxHeight = Math.min(420, window.innerHeight - 16); const height = Math.min(flyout.current?.scrollHeight || 320, maxHeight);
      setPosition({ left: Math.max(8, Math.min(rect.right + 8, window.innerWidth - width - 8)), top: Math.max(8, Math.min(mobile ? rect.top - height - 8 : rect.top, window.innerHeight - height - 8)), width, maxHeight });
    }
    place(); (flyout.current?.querySelector<HTMLElement>('a, .nav-disabled') ?? flyout.current)?.focus();
    window.addEventListener('resize', place); window.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [flyoutSection, mobile]);
  useEffect(() => {
    if (!flyoutSection) return;
    function outside(event: Event) { const target = event.target as Node; if (!trigger.current?.contains(target) && !flyout.current?.contains(target)) setFlyoutSection(null); }
    document.addEventListener('pointerdown', outside); document.addEventListener('focusin', outside);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('focusin', outside); };
  }, [flyoutSection]);
  async function signOut() {
    if (logoutBusy.current) return; logoutBusy.current = true; setLoggingOut(true); setLogoutError('');
    try { await logout(); } catch { setLogoutError('Não foi possível concluir a saída. Tente novamente.'); }
    finally { logoutBusy.current = false; setLoggingOut(false); }
  }
  function entry(link: NavigationItem, hint = compact) {
    const reason = link.disabledReason ?? 'Indisponível';
    return <NavHint key={link.id} enabled={hint} label={!isNavigationLink(link) ? `${link.label} — ${reason}` : link.label}>
      {!isNavigationLink(link) ? <span className="nav-disabled" role="group" tabIndex={0} aria-label={`${link.label} — ${reason}`}><button type="button" className="nav-future-item" disabled aria-disabled="true" aria-label={link.label} title={reason}><AppIcon name={link.icon} /><span className="nav-label">{link.label}</span><small>{reason}</small></button></span> : <NavLink to={link.to!} aria-label={link.label} onClick={() => closeFlyout()}><AppIcon name={link.icon} /><span className="nav-label">{link.label}</span></NavLink>}
    </NavHint>;
  }
  function sectionTrigger(section: NavigationContext | 'Mais áreas') {
    const group = groups.find((group) => group.context === section);
    const active = (section === 'Mais áreas' ? secondaryGroups.flatMap((group) => group.items) : group?.items ?? []).some((item) => isNavigationLink(item) && item.to && (location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)));
    return <NavHint enabled={compact} label={section}><button type="button" className={`nav-group-trigger${active ? ' active' : ''}`} aria-label={section} aria-expanded={flyoutSection === section} aria-controls={flyoutSection === section ? groupId : undefined} onClick={(event) => { trigger.current = event.currentTarget; setFlyoutSection((current) => current === section ? null : section); }}><AppIcon name={group?.items[0]?.icon ?? 'settings'} /><span className="nav-label">{section === 'Mais áreas' ? 'Mais' : section}</span></button></NavHint>;
  }
  const flyoutGroups = flyoutSection === 'Mais áreas' ? secondaryGroups : groups.filter((group) => group.context === flyoutSection);
  return <aside className={`sidebar${collapsed ? ' is-collapsed' : ''}`} aria-label="Menu principal">
    <div className="sidebar-heading"><a className="brand" href="/app/conversations" aria-label="WappHub Chat"><span className="brand-mark">W</span><span className="brand-label">WappHub <small>CHAT</small></span></a>
      <NavHint enabled={collapsed} label={collapsed ? 'Expandir menu' : 'Recolher menu'}><button type="button" className="nav-toggle" aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'} aria-expanded={!collapsed} aria-controls="main-navigation" onClick={() => { setCollapsed(!collapsed); closeFlyout(); }}><AppIcon name={collapsed ? 'expand' : 'collapse'} /></button></NavHint>
    </div>
    <nav id="main-navigation" aria-label="Navegação principal">
      {mobile ? <section className="nav-section" aria-label="Acesso rápido">{primaryLinks.map((item) => entry(item))}{(secondaryGroups.length > 0 || (session?.organizations?.length ?? 0) > 1) && sectionTrigger('Mais áreas')}</section> : groups.map((group) => <section key={group.context} className="nav-section" aria-label={group.context}><span className="nav-section-heading">{group.context}</span>{compact && group.context !== 'Atendimento' ? sectionTrigger(group.context) : group.items.map((item) => entry(item))}</section>)}
    </nav>
    <footer className="sidebar-footer"><div className="sidebar-user"><span className="avatar">{session?.user.name.slice(0, 1).toUpperCase()}</span><span className="user-label">{session?.user.name}<small>{session?.organization?.name}</small></span></div>
      {(session?.organizations?.length ?? 0) > 1 && <NavHint label="Trocar organização" enabled={compact}><NavLink className="organization-switch" to="/organizations" aria-label="Trocar organização"><AppIcon name="organization" /><span className="nav-label">Trocar organização</span></NavLink></NavHint>}
      <div className="sidebar-realtime">
        <span className={`realtime-status realtime-${realtimeState}`} role="status" aria-live="polite" aria-atomic="true" tabIndex={0} title={`${realtimeLabels[realtimeState]} — conexão em tempo real com o servidor WappHub, não com o WhatsApp.${realtimeState === 'stale' ? ' Reconexão pausada; tente novamente.' : ''}`}><span className="realtime-dot" aria-hidden="true" /><span className="realtime-label">{realtimeLabels[realtimeState]}</span></span>
        {realtimeState === 'stale' && <NavHint enabled={compact} label="Tentar reconexão novamente"><button type="button" className="realtime-retry" aria-label="Tentar reconexão novamente" onClick={onRealtimeRetry}><RotateCw size={16} aria-hidden="true" /><span className="realtime-retry-label">Tentar novamente</span></button></NavHint>}
      </div>
      <NavHint label="Sair da conta" enabled={compact}><button ref={logoutButton} type="button" className="logout-button" aria-label="Sair da conta" disabled={loggingOut} onClick={() => void signOut()}><AppIcon name="logout" /><span className="nav-label">{loggingOut ? 'Saindo…' : 'Sair da conta'}</span></button></NavHint>
      {logoutError && <p role="alert" className="error-text">{logoutError}</p>}
    </footer>
    {flyoutSection && createPortal(<div ref={flyout} id={groupId} role="region" tabIndex={-1} aria-label={`Menu ${flyoutSection}`} className="nav-flyout" style={position} onKeyDown={(event) => {
      const items = [...flyout.current!.querySelectorAll<HTMLElement>('a, .nav-disabled')]; const index = items.indexOf(document.activeElement as HTMLElement);
      if (event.key === 'Escape') { event.preventDefault(); closeFlyout(true); }
      if (event.key === 'Tab' && (items.length === 0 || (!event.shiftKey && index === items.length - 1) || (event.shiftKey && index === 0))) { event.preventDefault(); closeFlyout(); if (event.shiftKey) trigger.current?.focus(); else logoutButton.current?.focus(); }
      if (items.length && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) { event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; items[next]?.focus(); }
    }}>{mobile && (session?.organizations?.length ?? 0) > 1 && <NavLink className="organization-switch" to="/organizations" onClick={() => closeFlyout()}>Trocar organização</NavLink>}{flyoutGroups.map((group) => <section key={group.context} className="nav-section" aria-label={group.context}><strong>{group.context}</strong>{group.items.map((item) => entry(item, false))}</section>)}</div>, document.body)}
  </aside>;
}
