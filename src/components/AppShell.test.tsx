import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from './AppShell';
vi.mock('../features/session/SessionContext', () => ({ useSession: () => ({ session: { user: { id: 'u', name: 'Ana' }, organization: { id: 'org', name: 'Equipe' }, permissions: ['conversations.read'] }, logout: vi.fn() }) }));
vi.mock('../lib/realtime', () => ({ createRealtimeUrl: () => 'ws://local.test', RealtimeClient: class { connect() {} close() {} } }));
describe('conversation shell scope', () => {
  it.each(['/app/conversations', '/app/conversations/conv-1'])('bounds the shell only for the inbox route %s', (route) => {
    render(<MemoryRouter initialEntries={[route]}><Routes><Route path="/app" element={<AppShell />}><Route path="conversations/*" element={<p>Atendimento</p>} /></Route></Routes></MemoryRouter>);
    expect(screen.getByText('Atendimento').closest('.app-shell')).toHaveClass('chat-app-shell');
  });
  it('keeps other application pages outside the viewport-bound shell', () => {
    render(<MemoryRouter initialEntries={['/app/settings/providers']}><Routes><Route path="/app" element={<AppShell />}><Route path="settings/providers" element={<p>Provedores</p>} /></Route></Routes></MemoryRouter>);
    expect(screen.getByText('Provedores', { selector: 'p' }).closest('.app-shell')).not.toHaveClass('chat-app-shell');
  });
});
