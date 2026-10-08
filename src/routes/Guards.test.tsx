import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SessionProvider } from '../features/session/SessionContext';
import { RequireSession } from './Guards';
import { sessionApi } from '../lib/session';

describe('RequireSession', () => {
  it('redirects an unauthenticated user to login', async () => {
    vi.spyOn(sessionApi, 'current').mockRejectedValue({ status: 401 });
    render(<MemoryRouter initialEntries={['/private']}><SessionProvider><Routes><Route path="/login" element={<p>Entrar</p>} /><Route element={<RequireSession />}><Route path="/private" element={<p>Privado</p>} /></Route></Routes></SessionProvider></MemoryRouter>);
    expect(await screen.findByText('Entrar')).toBeInTheDocument(); expect(screen.queryByText('Privado')).not.toBeInTheDocument();
  });
});
