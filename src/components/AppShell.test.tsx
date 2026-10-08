import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { preferenceKey } from '../hooks/useUiPreference';
import { AppShell } from './AppShell';
const state = vi.hoisted(() => ({ session: { user: { id: 'u', name: 'Ana' }, organization: { id: 'org', name: 'Equipe' }, permissions: ['conversations.read', 'providers.manage'] }, logout: vi.fn() }));
vi.mock('../features/session/SessionContext', () => ({ useSession: () => state }));
vi.mock('../lib/realtime', () => ({ createRealtimeUrl: () => 'ws://local.test', RealtimeClient: class { connect() {} close() {} } }));
describe('conversation shell scope and navigation', () => {
  beforeEach(() => { localStorage.clear(); state.session.user.id = 'u'; state.session.permissions = ['conversations.read', 'providers.manage']; state.logout.mockReset(); });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
  it.each(['/app/conversations', '/app/conversations/conv-1'])('bounds the shell only for the inbox route %s', (route) => {
    render(<MemoryRouter initialEntries={[route]}><Routes><Route path="/app" element={<AppShell />}><Route path="conversations/*" element={<p>Atendimento</p>} /></Route></Routes></MemoryRouter>);
    expect(screen.getByText('Atendimento').closest('.app-shell')).toHaveClass('chat-app-shell');
    expect(screen.getByRole('link', { name: 'Conversas' })).toHaveClass('active');
  });
  it('keeps other application pages outside the viewport-bound shell', () => {
    render(<MemoryRouter initialEntries={['/app/settings/providers']}><Routes><Route path="/app" element={<AppShell />}><Route path="settings/providers" element={<p>Provedores</p>} /></Route></Routes></MemoryRouter>);
    expect(screen.getByText('Provedores', { selector: 'p' }).closest('.app-shell')).not.toHaveClass('chat-app-shell');
  });
  function renderNav() {
    return render(<MemoryRouter initialEntries={['/app/settings/providers']}><Routes><Route path="/app" element={<AppShell />}><Route path="settings/providers" element={<p>Destino Provedores</p>} /></Route></Routes></MemoryRouter>);
  }
  it('renders consistent icons, nested providers and active ancestor routes', () => {
    renderNav(); const nav = screen.getByRole('navigation', { name: 'Navegação principal' });
    for (const name of ['Conversas', 'Contatos', 'Arquivos', 'Equipe', 'Tags', 'Configurações', 'Provedores']) expect(within(nav).getByRole('link', { name }).querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(within(nav).getByRole('link', { name: 'Configurações' })).toHaveClass('active');
    expect(within(nav).getByRole('link', { name: 'Provedores' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('link', { name: 'Provedores' }).closest('ul')).toHaveClass('nav-children');
    fireEvent.click(screen.getByRole('button', { name: 'Recolher subitens de Configurações' })); expect(within(nav).queryByRole('link', { name: 'Provedores' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Expandir subitens de Configurações' })); expect(within(nav).getByRole('link', { name: 'Provedores' })).toBeInTheDocument();
  });
  it('collapses without navigation and exposes keyboard-accessible flyout links and tooltips', () => {
    renderNav(); fireEvent.click(screen.getByRole('button', { name: 'Recolher menu' }));
    expect(screen.getByText('Destino Provedores')).toBeInTheDocument(); expect(screen.getByRole('button', { name: 'Expandir menu' })).toHaveAttribute('aria-expanded', 'false');
    const contacts = screen.getByRole('link', { name: 'Contatos' }); fireEvent.focus(contacts); expect(screen.getByRole('tooltip', { name: 'Contatos' })).toBeInTheDocument(); fireEvent.blur(contacts);
    const trigger = screen.getByRole('button', { name: 'Configurações' }); expect(trigger).toHaveClass('active'); fireEvent.click(trigger);
    const flyout = screen.getByRole('region', { name: 'Submenu de Configurações' }); const overview = within(flyout).getByRole('link', { name: 'Visão geral' }); expect(overview).toHaveFocus();
    fireEvent.keyDown(overview, { key: 'ArrowDown' }); const providers = within(flyout).getByRole('link', { name: 'Provedores' }); expect(providers).toHaveFocus();
    fireEvent.keyDown(providers, { key: 'Escape' }); expect(trigger).toHaveFocus(); expect(screen.queryByRole('region', { name: 'Submenu de Configurações' })).not.toBeInTheDocument();
    fireEvent.click(trigger); within(screen.getByRole('region')).getByRole('link', { name: 'Provedores' }).focus(); fireEvent.keyDown(document.activeElement!, { key: 'Tab' }); expect(screen.getByRole('button', { name: 'Sair da conta' })).toHaveFocus();
    fireEvent.click(trigger); fireEvent.pointerDown(screen.getByText('Destino Provedores')); expect(screen.queryByRole('region', { name: 'Submenu de Configurações' })).not.toBeInTheDocument();
  });
  it('restores collapse on remount and keeps a second account expanded by default', () => {
    const view = renderNav(); fireEvent.click(screen.getByRole('button', { name: 'Recolher menu' })); expect(JSON.parse(localStorage.getItem(preferenceKey('u'))!).sidebarCollapsed).toBe(true); view.unmount();
    const second = renderNav(); expect(screen.getByRole('button', { name: 'Expandir menu' })).toBeInTheDocument(); second.unmount();
    state.session.user.id = 'other-user'; renderNav(); expect(screen.getByRole('button', { name: 'Recolher menu' })).toBeInTheDocument();
  });
  it('preserves permission-based item visibility in expanded and collapsed modes', () => {
    state.session.permissions = []; renderNav(); expect(screen.queryByRole('link', { name: 'Conversas' })).not.toBeInTheDocument(); expect(screen.queryByRole('link', { name: 'Provedores' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Recolher menu' })); fireEvent.click(screen.getByRole('button', { name: 'Configurações' }));
    expect(screen.getByRole('link', { name: 'Visão geral' })).toBeInTheDocument(); expect(screen.queryByRole('link', { name: 'Provedores' })).not.toBeInTheDocument();
  });
  it('keeps settings and logout accessible in the mobile navigation', () => {
    vi.stubGlobal('matchMedia', vi.fn((query: string) => ({ matches: query === '(max-width: 720px)', addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    renderNav(); fireEvent.click(screen.getByRole('button', { name: 'Configurações' }));
    expect(within(screen.getByRole('region', { name: 'Submenu de Configurações' })).getByRole('link', { name: 'Provedores' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sair da conta' })).toBeInTheDocument();
  });
  it('keeps logout visible and invokes session logout once, including collapsed mode', async () => {
    let finish!: () => void; state.logout.mockImplementation(() => new Promise<void>((resolve) => { finish = resolve; })); renderNav();
    expect(screen.getByRole('button', { name: 'Sair da conta' })).toHaveTextContent('Sair da conta'); fireEvent.click(screen.getByRole('button', { name: 'Recolher menu' }));
    const logout = screen.getByRole('button', { name: 'Sair da conta' }); fireEvent.focus(logout); expect(screen.getByRole('tooltip', { name: 'Sair da conta' })).toBeInTheDocument();
    fireEvent.click(logout); fireEvent.click(logout); expect(state.logout).toHaveBeenCalledTimes(1); expect(logout).toBeDisabled(); expect(screen.getByText('Destino Provedores')).toBeInTheDocument(); await act(async () => finish());
    await waitFor(() => expect(logout).toBeEnabled());
  });

});
