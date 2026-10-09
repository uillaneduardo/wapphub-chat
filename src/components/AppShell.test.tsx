import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { preferenceKey } from '../hooks/useUiPreference';
import { AppShell } from './AppShell';
import { Sidebar } from './Sidebar';
const state = vi.hoisted(() => ({ session: { user: { id: 'u', name: 'Ana' }, organization: { id: 'org', name: 'Equipe' }, permissions: ['conversations.read', 'contacts.read', 'providers.manage', 'providers.simulate', 'messages.read'], organizations: [] as { id: string; name: string }[] }, logout: vi.fn() }));
vi.mock('../features/session/SessionContext', () => ({ useSession: () => state }));
vi.mock('../lib/realtime', async (importOriginal) => ({ ...await importOriginal<typeof import('../lib/realtime')>(), createRealtimeUrl: () => 'ws://local.test', RealtimeClient: class { connect() {} close() {} } }));
describe('conversation shell scope and navigation', () => {
  beforeEach(() => { localStorage.clear(); state.session.organizations = []; state.session.user.id = 'u'; state.session.organization = { id: 'org', name: 'Equipe' }; state.session.permissions = ['conversations.read', 'contacts.read', 'providers.manage', 'providers.simulate', 'messages.read']; state.logout.mockReset(); });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
  it.each(['/app/conversations', '/app/conversations/conv-1'])('bounds the shell only for the inbox route %s', (route) => {
    render(<MemoryRouter initialEntries={[route]}><Routes><Route path="/app" element={<AppShell />}><Route path="conversations/*" element={<p>Atendimento sintético</p>} /></Route></Routes></MemoryRouter>);
    expect(screen.getByText('Atendimento sintético').closest('.app-shell')).toHaveClass('chat-app-shell');
    expect(screen.getByRole('link', { name: 'Conversas' })).toHaveClass('active');
  });
  it('keeps other application pages outside the viewport-bound shell', () => {
    render(<MemoryRouter initialEntries={['/app/settings/providers']}><Routes><Route path="/app" element={<AppShell />}><Route path="settings/providers" element={<p>Provedores</p>} /></Route></Routes></MemoryRouter>);
    expect(screen.getByText('Provedores', { selector: 'p' }).closest('.app-shell')).not.toHaveClass('chat-app-shell');
  });
  function renderNav() {
    return render(<MemoryRouter initialEntries={['/app/settings/providers']}><Routes><Route path="/app" element={<AppShell />}><Route path="settings/providers" element={<p>Destino Provedores</p>} /></Route></Routes></MemoryRouter>);
  }
  it('renders consistent icons, navigation groups and active provider routes', () => {
    renderNav(); const nav = screen.getByRole('navigation', { name: 'Navegação principal' });
    for (const [name, glyph] of Object.entries({ Conversas: 'messages-square', Contatos: 'contact-round', Arquivos: 'file-text', Etiquetas: 'tags', 'Canais e integrações': 'plug' })) {
      const icon = within(nav).getByRole('link', { name }).querySelector('svg');
      expect(icon).toHaveClass('lucide', `lucide-${glyph}`, 'app-icon');
      expect(icon).toHaveAttribute('width', '22'); expect(icon).toHaveAttribute('height', '22');
      expect(icon).toHaveAttribute('stroke-width', '2'); expect(icon).toHaveAttribute('aria-hidden', 'true');
    }
    for (const [name, glyph] of Object.entries({ 'Equipe e permissões': 'users-round', Configurações: 'settings', 'Uso e custos': 'chart-no-axes-column', 'Plano e assinatura': 'credit-card' })) {
      const button = within(nav).getByRole('button', { name }); expect(button).toBeDisabled(); expect(button.querySelector('svg')).toHaveClass('lucide', `lucide-${glyph}`); expect(button).toHaveAttribute('aria-disabled', 'true');
    }
    expect(screen.getByRole('button', { name: 'Recolher menu' }).querySelector('svg')).toHaveClass('lucide-panel-left-close');
    expect(screen.getByRole('button', { name: 'Sair da conta' }).querySelector('svg')).toHaveClass('lucide-log-out');
    expect(within(nav).getByRole('link', { name: 'Canais e integrações' })).toHaveAttribute('aria-current', 'page');
    expect(within(screen.getByRole('region', { name: 'Atendimento' })).getAllByRole('link')).toHaveLength(4);
    expect(within(screen.getByRole('region', { name: 'Gestão' })).getByRole('link', { name: 'Simulador Demo' })).toHaveAttribute('href', '/app/providers/demo/simulator');
  });
  it('collapses without navigation and exposes keyboard-accessible flyout links and tooltips', () => {
    renderNav(); fireEvent.click(screen.getByRole('button', { name: 'Recolher menu' }));
    expect(screen.getByText('Destino Provedores')).toBeInTheDocument(); expect(screen.getByRole('button', { name: 'Expandir menu' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: 'Expandir menu' }).querySelector('svg')).toHaveClass('lucide-panel-left-open');
    const contacts = screen.getByRole('link', { name: 'Contatos' }); fireEvent.focus(contacts); expect(screen.getByRole('tooltip', { name: 'Contatos' })).toBeInTheDocument(); fireEvent.blur(contacts);
    const trigger = screen.getByRole('button', { name: 'Gestão' }); expect(trigger).toHaveClass('active'); fireEvent.click(trigger);
    const flyout = screen.getByRole('region', { name: 'Menu Gestão' }); const providers = within(flyout).getByRole('link', { name: 'Canais e integrações' }); expect(providers).toHaveFocus();
    fireEvent.keyDown(providers, { key: 'ArrowDown' }); const demo = within(flyout).getByRole('link', { name: 'Simulador Demo' }); expect(demo).toHaveFocus(); expect(providers.querySelector('svg')).toHaveClass('lucide-plug');
    fireEvent.keyDown(demo, { key: 'Home' }); expect(providers).toHaveFocus(); fireEvent.keyDown(providers, { key: 'End' }); expect(demo).toHaveFocus();
    fireEvent.keyDown(demo, { key: 'Escape' }); expect(trigger).toHaveFocus(); expect(screen.queryByRole('region', { name: 'Menu Gestão' })).not.toBeInTheDocument();
    fireEvent.click(trigger); within(screen.getByRole('region', { name: 'Menu Gestão' })).getByRole('link', { name: 'Simulador Demo' }).focus(); fireEvent.keyDown(document.activeElement!, { key: 'Tab' }); expect(screen.getByRole('button', { name: 'Sair da conta' })).toHaveFocus();
    fireEvent.click(trigger); fireEvent.pointerDown(screen.getByText('Destino Provedores')); expect(screen.queryByRole('region', { name: 'Menu Gestão' })).not.toBeInTheDocument();
  });
  it('restores collapse on remount and keeps a second account expanded by default', () => {
    const view = renderNav(); fireEvent.click(screen.getByRole('button', { name: 'Recolher menu' })); expect(JSON.parse(localStorage.getItem(preferenceKey('u'))!).sidebarCollapsed).toBe(true); view.unmount();
    const second = renderNav(); expect(screen.getByRole('button', { name: 'Expandir menu' })).toBeInTheDocument(); second.unmount();
    state.session.user.id = 'other-user'; renderNav(); expect(screen.getByRole('button', { name: 'Recolher menu' })).toBeInTheDocument();
  });
  it('preserves permission-based item visibility in expanded and collapsed modes', () => {
    state.session.permissions = []; renderNav(); expect(screen.queryByRole('link', { name: 'Conversas' })).not.toBeInTheDocument(); expect(screen.queryByRole('link', { name: 'Contatos' })).not.toBeInTheDocument(); expect(screen.queryByRole('link', { name: 'Canais e integrações' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Recolher menu' })); fireEvent.click(screen.getByRole('button', { name: 'Gestão' }));
    expect(screen.getByRole('button', { name: 'Equipe e permissões' })).toBeDisabled(); fireEvent.keyDown(screen.getByRole('region', { name: 'Menu Gestão' }), { key: 'Escape' }); fireEvent.click(screen.getByRole('button', { name: 'Preferências' })); expect(screen.getByRole('button', { name: 'Configurações' })).toBeDisabled(); expect(screen.queryByRole('link', { name: 'Simulador Demo' })).not.toBeInTheDocument();
    const menu = screen.getByRole('region', { name: 'Menu Preferências' }); expect(menu).toHaveFocus(); fireEvent.keyDown(menu, { key: 'Escape' }); expect(screen.getByRole('button', { name: 'Preferências' })).toHaveFocus();
  });
  it('keeps organization, operational extras and logout accessible without a long mobile bar', () => {
    vi.stubGlobal('matchMedia', vi.fn((query: string) => ({ matches: query === '(max-width: 720px)', addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    renderNav(); const nav = screen.getByRole('navigation', { name: 'Navegação principal' }); expect(within(nav).getAllByRole('link')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Mais áreas' }));
    expect(within(screen.getByRole('region', { name: 'Menu Mais áreas' })).getByRole('link', { name: 'Canais e integrações' })).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('region', { name: 'Menu Mais áreas' }), { key: 'Escape' }); fireEvent.click(screen.getByRole('button', { name: 'Mais áreas' }));
    const extra = screen.getByRole('region', { name: 'Menu Mais áreas' }); expect(within(extra).getByRole('link', { name: 'Arquivos' })).toHaveAttribute('href', '/app/files'); expect(within(extra).getByRole('link', { name: 'Etiquetas' })).toHaveAttribute('href', '/app/tags');
    expect(screen.getByRole('button', { name: 'Sair da conta' })).toBeInTheDocument();
  });

  it('renders all five contexts in order with planned resources disabled', () => {
    renderNav(); const nav = screen.getByRole('navigation', { name: 'Navegação principal' });
    expect(within(nav).getAllByRole('region').map((region) => region.getAttribute('aria-label'))).toEqual(['Atendimento', 'Produtividade', 'Comunicação', 'Gestão', 'Preferências']);
    expect(within(screen.getByRole('region', { name: 'Atendimento' })).getAllByRole('link').map((link) => link.textContent)).toEqual(['Conversas', 'Contatos', 'Etiquetas', 'Arquivos']);
    for (const name of ['Respostas rápidas', 'Automações', 'Bots de conversa', 'Campanhas', 'Status', 'Chamadas']) {
      expect(screen.getByRole('button', { name })).toBeDisabled(); expect(screen.queryByRole('link', { name })).not.toBeInTheDocument();
    }
  });
  it.each([false, true])('opens the existing organization flow without changing context (mobile=%s)', (mobile) => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: mobile, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    state.session.organizations = [{ id: 'org', name: 'Equipe' }, { id: 'other', name: 'Outra' }];
    render(<MemoryRouter><Routes><Route path="/" element={<Sidebar />} /><Route path="/organizations" element={<p>Seleção segura existente</p>} /></Routes></MemoryRouter>);
    if (mobile) fireEvent.click(screen.getByRole('button', { name: 'Mais áreas' }));
    const link = mobile ? within(screen.getByRole('region', { name: 'Menu Mais áreas' })).getByRole('link', { name: 'Trocar organização' }) : screen.getByRole('link', { name: 'Trocar organização' });
    expect(link).toHaveAttribute('href', '/organizations'); fireEvent.click(link);
    expect(screen.getByText('Seleção segura existente')).toBeInTheDocument(); expect(state.session.organization.id).toBe('org');
  });
  it('keeps logout visible and invokes session logout once, including collapsed mode', async () => {
    let finish!: () => void; state.logout.mockImplementation(() => new Promise<void>((resolve) => { finish = resolve; })); renderNav();
    expect(screen.getByRole('button', { name: 'Sair da conta' })).toHaveTextContent('Sair da conta'); fireEvent.click(screen.getByRole('button', { name: 'Recolher menu' }));
    const logout = screen.getByRole('button', { name: 'Sair da conta' }); fireEvent.focus(logout); expect(screen.getByRole('tooltip', { name: 'Sair da conta' })).toBeInTheDocument();
    fireEvent.click(logout); fireEvent.click(logout); expect(state.logout).toHaveBeenCalledTimes(1); expect(logout).toBeDisabled(); expect(screen.getByText('Destino Provedores')).toBeInTheDocument(); await act(async () => finish());
    await waitFor(() => expect(logout).toBeEnabled());
  });

  it('keeps realtime in the sidebar footer and leaves main with only its page', () => {
    renderNav();
    const status = screen.getByRole('status');
    expect(status.closest('footer')).toHaveClass('sidebar-footer');
    expect(within(screen.getByRole('main')).queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByText('Conectado')).not.toBeInTheDocument();
    expect(status.previousElementSibling).toBeNull();
    expect(status.closest('.sidebar-realtime')?.previousElementSibling).toHaveClass('sidebar-user');
    expect(status.closest('.sidebar-realtime')?.nextElementSibling).toContainElement(screen.getByRole('button', { name: 'Sair da conta' }));
  });
  it.each([
    ['open', 'Tempo real ativo'], ['connecting', 'Conectando…'], ['reconnecting', 'Reconectando…'], ['closed', 'Tempo real indisponível'], ['stale', 'Tempo real indisponível'],
  ] as const)('represents %s without conflating WhatsApp status', (connection, label) => {
    render(<MemoryRouter><Sidebar realtimeState={connection} /></MemoryRouter>);
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent(label); expect(status).toHaveClass(`realtime-${connection}`);
    expect(status).toHaveAttribute('aria-live', 'polite'); expect(status).toHaveAttribute('aria-atomic', 'true');
    expect(status.title).toContain('servidor WappHub, não com o WhatsApp');
    expect(status.querySelector('.realtime-dot')).toHaveAttribute('aria-hidden', 'true');
  });
  it('preserves paused recovery and accessible status when collapsed', () => {
    const retry = vi.fn(); render(<MemoryRouter><Sidebar realtimeState="stale" onRealtimeRetry={retry} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Recolher menu' }));
    expect(screen.getByRole('status')).toHaveTextContent('Tempo real indisponível');
    fireEvent.click(screen.getByRole('button', { name: 'Tentar reconexão novamente' })); expect(retry).toHaveBeenCalledOnce();
    expect(screen.getByRole('status').title).toContain('Reconexão pausada');
  });

  it('allows the Demo route only with effective simulation and message-read permissions', () => {
    state.session.permissions = ['providers.simulate', 'messages.read']; const view = renderNav();
    expect(screen.getByRole('link', { name: 'Canais e integrações' })).toHaveAttribute('href', '/app/providers/demo/simulator');
    view.unmount(); state.session.permissions = ['providers.simulate']; renderNav(); expect(screen.queryByRole('link', { name: 'Canais e integrações' })).not.toBeInTheDocument();
  });
  it('updates permissions and closes the old organization flyout on context change', () => {
    const view = render(<MemoryRouter><Sidebar /></MemoryRouter>); fireEvent.click(screen.getByRole('button', { name: 'Recolher menu' })); fireEvent.click(screen.getByRole('button', { name: 'Gestão' })); expect(screen.getByRole('link', { name: 'Canais e integrações' })).toBeInTheDocument();
    state.session.organization = { id: 'other-org', name: 'Outra empresa' }; state.session.permissions = ['conversations.read']; view.rerender(<MemoryRouter><Sidebar /></MemoryRouter>);
    expect(screen.queryByRole('region', { name: 'Menu Gestão' })).not.toBeInTheDocument(); fireEvent.click(screen.getByRole('button', { name: 'Gestão' })); expect(screen.queryByRole('link', { name: 'Canais e integrações' })).not.toBeInTheDocument(); expect(screen.queryByRole('link', { name: 'Contatos' })).not.toBeInTheDocument(); expect(screen.getByRole('link', { name: 'Conversas' })).toBeInTheDocument();
  });
  it('keeps future commercial/admin controls disabled and never navigates on activation', () => {
    renderNav(); for (const name of ['Equipe e permissões', 'Uso e custos', 'Plano e assinatura', 'Configurações']) { const button = screen.getByRole('button', { name }); expect(button).toBeDisabled(); expect(button).toHaveTextContent(['Equipe e permissões', 'Configurações'].includes(name) ? 'Indisponível' : 'Futuro'); fireEvent.click(button); }
    expect(screen.getByText('Destino Provedores')).toBeInTheDocument(); expect(screen.queryByRole('link', { name: 'Uso e custos' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Canais e integrações' })).toHaveAttribute('href', '/app/settings/providers'); expect(screen.getByRole('link', { name: 'Conversas' })).toHaveAttribute('href', '/app/conversations'); expect(screen.getByRole('link', { name: 'Contatos' })).toHaveAttribute('href', '/app/contacts');
  });

});
