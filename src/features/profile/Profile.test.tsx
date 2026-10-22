import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ProfilePage } from './Profile';
import { profileApi } from '../../lib/profileApi';

const state = vi.hoisted(() => ({
  session: {
    user: { id: 'user-1', name: 'Ana Costa', email: 'ana@example.test' },
    organization: { id: 'org-1', name: 'Organização Alfa' },
    membership: { id: 'member-1', role: 'AGENT', consumesSeat: true, displayName: null as string | null, effectiveDisplayName: 'Ana Costa' },
  },
  refreshSession: vi.fn(async () => undefined),
}));
vi.mock('../session/SessionContext', () => ({ useSession: () => state }));
vi.mock('../../lib/profileApi', () => ({ profileApi: { updateAccount: vi.fn(), updateOrganization: vi.fn() } }));

beforeEach(() => {
  vi.resetAllMocks();
  state.session.user.name = 'Ana Costa';
  state.session.user.email = 'ana@example.test';
  state.session.organization.id = 'org-1';
  state.session.membership.displayName = null;
  state.session.membership.effectiveDisplayName = 'Ana Costa';
  vi.mocked(profileApi.updateAccount).mockResolvedValue({ ...state.session.user });
  vi.mocked(profileApi.updateOrganization).mockResolvedValue({ displayName: 'Ana • Vendas', effectiveDisplayName: 'Ana • Vendas' });
});

describe('self-service identity settings', () => {
  it('edits global user name, keeps login email read-only and refreshes session', async () => {
    render(<ProfilePage />);
    expect(screen.getByLabelText('E-mail de acesso')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Nome cadastrado')).toHaveValue('Ana Costa');
    fireEvent.change(screen.getByLabelText('Nome cadastrado'), { target: { value: '  Ana   Maria  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar dados da conta' }));
    await waitFor(() => expect(profileApi.updateAccount).toHaveBeenCalledWith('Ana Maria'));
    expect(state.refreshSession).toHaveBeenCalledOnce();
    expect(await screen.findByText('Dados pessoais atualizados.')).toBeInTheDocument();
  });
  it('uses a different attendant name for this organization and previews the outgoing identity', async () => {
    render(<ProfilePage />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Usar meu nome cadastrado' }));
    fireEvent.change(screen.getByLabelText('Nome de exibição nas mensagens'), { target: { value: 'Ana • Vendas' } });
    expect(screen.getByLabelText('Prévia do nome de atendimento')).toHaveTextContent('Ana • Vendas');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar nome de atendimento' }));
    await waitFor(() => expect(profileApi.updateOrganization).toHaveBeenCalledWith('Ana • Vendas'));
    expect(state.refreshSession).toHaveBeenCalledOnce();
  });
  it('resets organization alias to the global account identity', async () => {
    state.session.membership.displayName = 'Ana • Vendas';
    state.session.membership.effectiveDisplayName = 'Ana • Vendas';
    render(<ProfilePage />);
    expect(screen.getByLabelText('Nome de exibição nas mensagens')).toHaveValue('Ana • Vendas');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Usar meu nome cadastrado' }));
    expect(screen.getByLabelText('Nome de exibição nas mensagens')).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar nome de atendimento' }));
    await waitFor(() => expect(profileApi.updateOrganization).toHaveBeenCalledWith(null));
  });
  it('rejects unsafe alias formatting before any request', () => {
    render(<ProfilePage />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Usar meu nome cadastrado' }));
    fireEvent.change(screen.getByLabelText('Nome de exibição nas mensagens'), { target: { value: '*Ana*' } });
    expect(screen.getByRole('button', { name: 'Salvar nome de atendimento' })).toBeDisabled();
    expect(profileApi.updateOrganization).not.toHaveBeenCalled();
  });
});
