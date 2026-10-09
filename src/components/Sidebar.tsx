import { RotateCw } from 'lucide-react';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation } from 'react-router-dom';
import { useSession } from '../features/session/SessionContext';
import { useUiPreference } from '../hooks/useUiPreference';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { AppIcon, type AppIconName } from './AppIcon';
import { NavHint } from './NavHint';

type Entry = { to?: string; label: string; icon: AppIconName; permission?: string; future?: boolean };
const operationalLinks: Entry[] = [
  { to: '/app/conversations', label: 'Conversas', icon: 'conversations', permission: 'conversations.read' },
  { to: '/app/contacts', label: 'Contatos', icon: 'contacts', permission: 'contacts.read' },
  { to: '/app/files', label: 'Arquivos', icon: 'files' },
  { to: '/app/tags', label: 'Tags', icon: 'tags' },
];
type RealtimeState = 'open' | 'connecting' | 'reconnecting' | 'stale' | 'closed';
const realtimeLabels: Record<RealtimeState, string> = { open: 'Tempo real ativo', connecting: 'Conectando…', reconnecting: 'Reconectando…', closed: 'Tempo real indisponível', stale: 'Tempo real indisponível' };
export function Sidebar({ realtimeState = 'closed', onRealtimeRetry }: { realtimeState?: RealtimeState; onRealtimeRetry?: () => void }) {
  const { session, logout } = useSession(); const location = useLocation();
  const [collapsed, setCollapsed] = useUiPreference(session?.user.id, 'sidebarCollapsed');
  const mobile = useMediaQuery('(max-width: 720px)'); const compact = collapsed || mobile;
  const canManageProviders = session?.permissions.includes('providers.manage') ?? false;
  const canSimulate = Boolean(session?.permissions.includes('providers.simulate') && session?.permissions.includes('messages.read'));
  const organizationLinks: Entry[] = [
    { label: 'Equipe e usuários', icon: 'team', future: true },
    ...(canManageProviders || canSimulate ? [{ to: canManageProviders ? '/app/settings/providers' : '/app/providers/demo/simulator', label: 'Canais e integrações', icon: 'providers' as const }] : []),
    ...(canSimulate && canManageProviders ? [{ to: '/app/providers/demo/simulator', label: 'Simulador Demo', icon: 'providers' as const }] : []),
    { label: 'Uso e custos', icon: 'usage', future: true },
    { label: 'Plano e assinatura', icon: 'billing', future: true },
    { label: 'Configurações', icon: 'settings', future: true },
  ];
  const [flyoutSection, setFlyoutSection] = useState<'Atendimento' | 'Organização' | null>(null);
  const [loggingOut, setLoggingOut] = useState(false); const logoutBusy = useRef(false); const [logoutError, setLogoutError] = useState('');
  const groupId = useId(); const trigger = useRef<HTMLButtonElement>(null); const flyout = useRef<HTMLDivElement>(null); const logoutButton = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ left: 0, top: 0, width: 230, maxHeight: 300 });
  const organizationActive = /^\/app\/(settings|team|providers)(\/|$)/.test(location.pathname);
  const permittedLinks = operationalLinks.filter((link) => !link.permission || session?.permissions.includes(link.permission));
  function closeFlyout(restoreFocus = false) { setFlyoutSection(null); if (restoreFocus) trigger.current?.focus(); }
  useEffect(() => { setFlyoutSection(null); }, [session?.organization?.id, location.pathname, compact]);
  useLayoutEffect(() => {
    if (!flyoutSection) return;
    function place() {
      const rect = trigger.current!.getBoundingClientRect(); const width = Math.min(250, window.innerWidth - 16);
      const maxHeight = Math.min(420, window.innerHeight - 16); const height = Math.min(flyout.current?.scrollHeight || 320, maxHeight);
      setPosition({ left: Math.max(8, Math.min(rect.right + 8, window.innerWidth - width - 8)), top: Math.max(8, Math.min(mobile ? rect.top - height - 8 : rect.top, window.innerHeight - height - 8)), width, maxHeight });
    }
    place(); (flyout.current?.querySelector<HTMLAnchorElement>('a') ?? flyout.current)?.focus();
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
  function entry(link: Entry, hint = compact) {
    return <NavHint key={link.label} enabled={hint} label={link.future ? `${link.label} — futuro, indisponível` : link.label}>
      {link.future ? <button type="button" className="nav-future-item" disabled aria-disabled="true" aria-label={link.label} title="Futuro — funcionalidade e autorização backend ainda indisponíveis"><AppIcon name={link.icon} /><span className="nav-label">{link.label}</span><small>Futuro</small></button> : <NavLink to={link.to!} aria-label={link.label} onClick={() => closeFlyout()}><AppIcon name={link.icon} /><span className="nav-label">{link.label}</span></NavLink>}
    </NavHint>;
  }
  function sectionTrigger(section: 'Atendimento' | 'Organização') {
    return <NavHint enabled={compact} label={section === 'Atendimento' ? 'Mais atendimento' : section}><button type="button" className={`nav-group-trigger${section === 'Organização' && organizationActive ? ' active' : ''}`} aria-label={section === 'Atendimento' ? 'Mais atendimento' : section} aria-expanded={flyoutSection === section} aria-controls={flyoutSection === section ? groupId : undefined} onClick={(event) => { trigger.current = event.currentTarget; setFlyoutSection((current) => current === section ? null : section); }}><AppIcon name={section === 'Atendimento' ? 'files' : 'team'} /><span className="nav-label">{section === 'Atendimento' ? 'Mais' : section}</span></button></NavHint>;
  }
  return <aside className={`sidebar${collapsed ? ' is-collapsed' : ''}`} aria-label="Menu principal">
    <div className="sidebar-heading"><a className="brand" href="/app/conversations" aria-label="WappHub Chat"><span className="brand-mark">W</span><span className="brand-label">WappHub <small>CHAT</small></span></a>
      <NavHint enabled={collapsed} label={collapsed ? 'Expandir menu' : 'Recolher menu'}><button type="button" className="nav-toggle" aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'} aria-expanded={!collapsed} aria-controls="main-navigation" onClick={() => { setCollapsed(!collapsed); closeFlyout(); }}><AppIcon name={collapsed ? 'expand' : 'collapse'} /></button></NavHint>
    </div>
    <nav id="main-navigation" aria-label="Navegação principal">
      <section className="nav-section" aria-label="Atendimento"><span className="nav-section-heading">Atendimento</span>
        {(mobile ? permittedLinks.filter((link) => link.permission) : permittedLinks).map((link) => entry(link))}
        {mobile && sectionTrigger('Atendimento')}
      </section>
      <section className="nav-section" aria-label="Organização"><span className="nav-section-heading">Organização</span>
        {compact ? sectionTrigger('Organização') : organizationLinks.map((link) => entry(link))}
      </section>
    </nav>
    <footer className="sidebar-footer"><div className="sidebar-user"><span className="avatar">{session?.user.name.slice(0, 1).toUpperCase()}</span><span className="user-label">{session?.user.name}<small>{session?.organization?.name}</small></span></div>
      <div className="sidebar-realtime">
        <span className={`realtime-status realtime-${realtimeState}`} role="status" aria-live="polite" aria-atomic="true" tabIndex={0} title={`${realtimeLabels[realtimeState]} — conexão em tempo real com o servidor WappHub, não com o WhatsApp.${realtimeState === 'stale' ? ' Reconexão pausada; tente novamente.' : ''}`}><span className="realtime-dot" aria-hidden="true" /><span className="realtime-label">{realtimeLabels[realtimeState]}</span></span>
        {realtimeState === 'stale' && <NavHint enabled={compact} label="Tentar reconexão novamente"><button type="button" className="realtime-retry" aria-label="Tentar reconexão novamente" onClick={onRealtimeRetry}><RotateCw size={16} aria-hidden="true" /><span className="realtime-retry-label">Tentar novamente</span></button></NavHint>}
      </div>
      <NavHint label="Sair da conta" enabled={compact}><button ref={logoutButton} type="button" className="logout-button" aria-label="Sair da conta" disabled={loggingOut} onClick={() => void signOut()}><AppIcon name="logout" /><span className="nav-label">{loggingOut ? 'Saindo…' : 'Sair da conta'}</span></button></NavHint>
      {logoutError && <p role="alert" className="error-text">{logoutError}</p>}
    </footer>
    {flyoutSection && createPortal(<div ref={flyout} id={groupId} role="region" tabIndex={-1} aria-label={`Menu ${flyoutSection}`} className="nav-flyout" style={position} onKeyDown={(event) => {
      const items = [...flyout.current!.querySelectorAll<HTMLAnchorElement>('a')]; const index = items.indexOf(document.activeElement as HTMLAnchorElement);
      if (event.key === 'Escape') { event.preventDefault(); closeFlyout(true); }
      if (event.key === 'Tab' && (items.length === 0 || (!event.shiftKey && index === items.length - 1) || (event.shiftKey && index === 0))) { event.preventDefault(); closeFlyout(); if (event.shiftKey) trigger.current?.focus(); else logoutButton.current?.focus(); }
      if (items.length && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) { event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; items[next]?.focus(); }
    }}><strong>{flyoutSection}</strong>{(flyoutSection === 'Atendimento' ? permittedLinks.filter((link) => !link.permission) : organizationLinks).map((link) => entry(link, false))}</div>, document.body)}
  </aside>;
}
