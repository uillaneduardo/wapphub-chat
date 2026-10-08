import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SessionProvider, useSession } from './SessionContext';
import { sessionApi } from '../../lib/session';

function Probe() { const { session, loading } = useSession(); return <p>{loading ? 'loading' : session?.user.email ?? 'signed out'}</p>; }
describe('session foundation', () => {
  it('loads current session through the API client', async () => {
    vi.spyOn(sessionApi, 'current').mockResolvedValue({ user: { id: '1', name: 'Lia', email: 'lia@example.com' }, organizations: [], organization: null });
    render(<SessionProvider><Probe /></SessionProvider>); expect(await screen.findByText('lia@example.com')).toBeInTheDocument();
  });
});
