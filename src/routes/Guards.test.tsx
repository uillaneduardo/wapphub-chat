import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SessionProvider } from '../features/session/SessionContext';
import { RequirePermission, RequireSession } from './Guards';
import { sessionApi } from '../lib/session';

describe('RequireSession', () => {
  it('redirects an unauthenticated user to login', async () => {
    vi.spyOn(sessionApi, 'current').mockRejectedValue({ status: 401 });
    render(<MemoryRouter initialEntries={['/private']}><SessionProvider><Routes><Route path="/login" element={<p>Entrar</p>} /><Route element={<RequireSession />}><Route path="/private" element={<p>Privado</p>} /></Route></Routes></SessionProvider></MemoryRouter>);
    expect(await screen.findByText('Entrar')).toBeInTheDocument(); expect(screen.queryByText('Privado')).not.toBeInTheDocument();
  });
  it('blocks a route when the current Core permissions do not include the required capability', async () => {
    vi.spyOn(sessionApi, 'current').mockResolvedValue({ user: { id: 'u1', name: 'Ana', email: 'ana@example.com' }, organizations: [{ id: 'o1', name: 'Loja' }], currentOrganizationId: 'o1', organization: { id: 'o1', name: 'Loja' }, membership: { id: 'm1', role: 'OWNER', consumesSeat: true }, permissions: [] });
    render(<MemoryRouter initialEntries={['/private']}><SessionProvider><Routes><Route element={<RequirePermission permission="conversations.read" />}><Route path="/private" element={<p>Inbox privada</p>} /></Route></Routes></SessionProvider></MemoryRouter>);
    expect(await screen.findByRole('alert')).toHaveTextContent('Acesso indisponível'); expect(screen.queryByText('Inbox privada')).not.toBeInTheDocument();
  });
});
