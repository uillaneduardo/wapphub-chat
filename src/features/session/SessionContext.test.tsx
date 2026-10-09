import { StrictMode } from 'react';
import type { Session } from '../../types/auth';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { SessionProvider, useSession } from './SessionContext';
import { sessionApi } from '../../lib/session';

function Probe() { const { session, loading } = useSession(); return <p>{loading ? 'loading' : session?.user.email ?? 'signed out'}</p>; }
describe('session foundation', () => {
  it('loads current session through the API client', async () => {
    vi.spyOn(sessionApi, 'current').mockResolvedValue({ user: { id: '1', name: 'Lia', email: 'lia@example.com' }, organizations: [], currentOrganizationId: null, organization: null, membership: null, permissions: [] });
    render(<SessionProvider><Probe /></SessionProvider>); expect(await screen.findByText('lia@example.com')).toBeInTheDocument();
  });
});

// Permissions can change while the identity and selected tenant remain unchanged.
function RefreshProbe() { const { session, loading, refreshSession, selectOrganization, logout } = useSession(); return <><p>{loading ? 'Revalidando' : `${session?.organization?.name}:${session?.permissions.join(',')}`}</p><button onClick={() => void refreshSession()}>Atualizar acesso</button><button onClick={() => void selectOrganization('other')}>Outra organização</button><button onClick={() => void logout()}>Encerrar</button></>; }

const active: Session = { user: { id: 'u', name: 'Ana', email: 'a@example.test' }, organizations: [{ id: 'org', name: 'Primeira' }, { id: 'other', name: 'Segunda' }], currentOrganizationId: 'org', organization: { id: 'org', name: 'Primeira' }, membership: { id: 'm', role: 'AGENT', consumesSeat: true, permissionVersion: 0 }, permissions: ['messages.send'] };
it('loads correctly in StrictMode and refreshes effective permissions without login', async () => {
  vi.spyOn(sessionApi, 'current').mockResolvedValueOnce(active).mockResolvedValueOnce({ ...active, permissions: [], membership: { ...active.membership!, permissionVersion: 1 } });
  render(<StrictMode><SessionProvider><RefreshProbe /></SessionProvider></StrictMode>);
  await screen.findByText('Primeira:messages.send');
  sessionStorage.setItem('wapphub-chat:realtime:applied:v2:u:org', '99');
  fireEvent.click(screen.getByRole('button', { name: 'Atualizar acesso' }));
  await screen.findByText('Primeira:'); expect(sessionStorage.getItem('wapphub-chat:realtime:applied:v2:u:org')).toBeNull();
});
it('ignores a pending refresh that finishes after organization switching', async () => {
  let finish!: (value: Session) => void;
  vi.spyOn(sessionApi, 'current').mockResolvedValueOnce(active).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  vi.spyOn(sessionApi, 'selectOrganization').mockResolvedValue({ organization: { id: 'other', name: 'Segunda' }, membership: { id: 'other-m', role: 'AGENT', consumesSeat: true }, permissions: ['contacts.read'] });
  render(<SessionProvider><RefreshProbe /></SessionProvider>); await screen.findByText('Primeira:messages.send'); fireEvent.click(screen.getByRole('button', { name: 'Atualizar acesso' })); fireEvent.click(screen.getByRole('button', { name: 'Outra organização' })); await screen.findByText('Segunda:contacts.read');
  await act(async () => finish(active)); expect(screen.getByText('Segunda:contacts.read')).toBeInTheDocument();
});

it('passive focus refresh preserves the shell and drafts when permissions have not changed', async () => {
  function Draft() { return <input aria-label="Rascunho M1" defaultValue="" />; }
  function Shell() { const { loading, session } = useSession(); return loading ? <p>Revalidando escopo</p> : session ? <Draft /> : <p>Sem sessão</p>; }
  vi.spyOn(sessionApi, 'current').mockResolvedValue(active);
  render(<SessionProvider><Shell /></SessionProvider>); const input = await screen.findByRole('textbox', { name: 'Rascunho M1' }); fireEvent.change(input, { target: { value: 'Texto ainda não enviado' } });
  fireEvent(window, new Event('focus')); await act(async () => {});
  expect(screen.getByRole('textbox', { name: 'Rascunho M1' })).toBe(input); expect(input).toHaveValue('Texto ainda não enviado');
});

it('immediately invalidates a scope when a forced change arrives during a passive refresh', async () => {
  let finish!: (value: Session) => void;
  vi.spyOn(sessionApi, 'current').mockResolvedValueOnce(active).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; })).mockResolvedValueOnce({ ...active, permissions: [] });
  function Controls() { const { loading, session, refreshSession } = useSession(); return <><p>{loading ? 'Escopo suspenso' : `Acesso:${session?.permissions.join(',')}`}</p><button onClick={() => void refreshSession()}>Passivo</button><button onClick={() => void refreshSession(true)}>Revogação</button></>; }
  render(<SessionProvider><Controls /></SessionProvider>); await screen.findByText('Acesso:messages.send'); fireEvent.click(screen.getByRole('button', { name: 'Passivo' })); fireEvent.click(screen.getByRole('button', { name: 'Revogação' }));
  expect(screen.getByText('Escopo suspenso')).toBeInTheDocument(); expect(screen.queryByText('Acesso:messages.send')).not.toBeInTheDocument();
  await act(async () => finish(active)); await screen.findByText('Acesso:');
});
